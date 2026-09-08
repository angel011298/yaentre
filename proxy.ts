import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/auth/supabase-middleware';
import { checkRateLimit } from '@/lib/rate-limit/limiter';
import { resolveClientIp } from '@/lib/rate-limit/client-ip';
import {
  ATTRIBUTION_COOKIE_MAX_AGE_SECS,
  ATTRIBUTION_COOKIE_NAME,
  extractAcquisitionSource,
} from '@/lib/marketing/attribution';
// Ver docs/Flujo_App_YaEntre_v1.0.md §16.1 (mapa de rutas) y §16.2 (guards).
// La política vive en un módulo puro para poder probarla (G69).
import {
  AUTH_REQUIRED_PREFIXES,
  VERIFIED_EMAIL_REQUIRED_PREFIXES,
  hasSupabaseAuthCookie,
  isRouterPrefetch,
  matchesPrefix,
  shouldResolveUser,
} from '@/lib/auth/middleware-policy';
import { reportControlFailure } from '@/lib/observability/report';

// F20 tarea 5: límite básico de tasa en las rutas de API. Se excluyen los
// webhooks (autenticados por firma HMAC de Stripe, no por volumen — un
// reintento legítimo de Stripe nunca debe recibir un 429) y los crons
// (autenticados por CRON_SECRET, invocados por el scheduler de Vercel, no
// por un usuario final que pudiera abusar).
//
// ⚠️ G65 — LO QUE ESTE LIMITADOR SÍ Y NO HACE. Se midió en producción: 70
// peticiones seguidas a `/api/adaptive/predict` no recibieron NI UN 429 con el
// límite nominal en 60/min. La causa no es un bug: el contador vive en memoria
// del proceso Edge y Vercel reparte las peticiones entre instancias, así que
// ninguna llega a 60. Sirve para frenar una ráfaga que caiga en la misma
// instancia y no cuesta nada, pero NO es la protección contra abuso del
// producto. Esa vive en `src/lib/rate-limit/store.ts` (contador compartido en
// Postgres) y se aplica en cada punto sensible — que además, en su mayoría,
// son Server Actions y ni siquiera pasan por este prefijo `/api`.
const RATE_LIMITED_PREFIX = '/api';
const RATE_LIMIT_EXEMPT_PREFIXES = ['/api/webhooks', '/api/cron'];
const RATE_LIMIT_MAX_REQUESTS = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * Atribución de marketing (F24): captura los parámetros de campaña de la
 * PRIMERA visita (cualquier ruta, no solo landing/precios — un anuncio puede
 * apuntar a cualquier página) en una cookie de 90 días, SOLO si todavía no
 * existe una — nunca se sobreescribe, así el primer touchpoint real persiste
 * hasta que el usuario se registre (`app/actions/auth.ts` la lee y la graba
 * en `UserProfile.acquisitionSource`, también solo una vez).
 *
 * Se aplica al `response` que se vaya a devolver en CADA rama de `proxy()`
 * (rate limit, redirect de auth, o el response normal) para no perder la
 * captura según qué rama del middleware responda esa request.
 */
function withAttributionCookie(response: NextResponse, request: NextRequest): NextResponse {
  if (request.cookies.has(ATTRIBUTION_COOKIE_NAME)) return response;

  const source = extractAcquisitionSource(request.nextUrl);
  if (!source) return response;

  response.cookies.set(ATTRIBUTION_COOKIE_NAME, JSON.stringify(source), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ATTRIBUTION_COOKIE_MAX_AGE_SECS,
    path: '/',
  });
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    pathname.startsWith(RATE_LIMITED_PREFIX) &&
    !matchesPrefix(pathname, RATE_LIMIT_EXEMPT_PREFIXES)
  ) {
    const ip = resolveClientIp((name) => request.headers.get(name));
    const { allowed, retryAfterSecs } = checkRateLimit(
      `${ip}:${pathname}`,
      RATE_LIMIT_MAX_REQUESTS,
      RATE_LIMIT_WINDOW_MS
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSecs) } }
      );
    }
  }

  // ── G69 ⚡ NO SE PREGUNTA POR EL USUARIO CUANDO LA RESPUESTA NO SE USA ──
  //
  // `matcher` cubre casi toda petición que no sea un asset estático, y hasta
  // G69 TODAS construían el cliente de Supabase y llamaban `auth.getUser()`.
  // Con una sesión abierta eso NO es gratis: `getUser()` valida el JWT contra
  // el servidor de Auth de Supabase — un viaje de red por petición.
  //
  // Se evita en los dos casos donde es demostrablemente inútil:
  //
  //  1. **`/api/*`.** Este middleware solo usa `user` para dos redirecciones
  //     de páginas; en una ruta de API el resultado se tiraba a la basura, y
  //     cada Route Handler vuelve a preguntar por su cuenta con `requireUser`.
  //     El caso que de verdad dolía: durante un simulacro el cliente manda un
  //     lote a `/api/simulator/sync` cada 15 s — un examen del IPN son ~140
  //     respuestas ⇒ ~140 llamadas a Auth por alumno **solo desde aquí**,
  //     encima de la que el handler ya hace. Con cientos de aspirantes a la
  //     vez en los días previos al examen, es tráfico y latencia puros sin una
  //     sola decisión que dependa de ellos.
  //
  //  2. **Peticiones sin cookie de sesión.** Sin `sb-…-auth-token` no hay
  //     sesión que validar ni que refrescar: `getUser()` devolvería `null` de
  //     todos modos. Cubre a los visitantes anónimos, que son la mayor parte
  //     del tráfico público (landing, precios, buscadores).
  //
  //  3. **Pre-cargas del router hacia rutas no protegidas.** Next precarga
  //     cada `<Link>` que entra en el viewport: una sola vista de la landing
  //     dispara ~20 peticiones `?_rsc=…` (contadas en el build de producción),
  //     todas por aquí. En una ruta pública no hay redirección que decidir, y
  //     el refresco de sesión lo hace la navegación de verdad.
  //
  // Fuera de esos tres casos el comportamiento es idéntico al de antes, y eso
  // es deliberado: una navegación de página de alguien con sesión SIGUE
  // pasando por `getUser()`, que es lo que refresca el token y reescribe la
  // cookie. Los Route Handlers sí pueden escribir cookies por su cuenta
  // (`supabase-server.ts` solo falla al hacerlo desde un Server Component),
  // así que un alumno que pasa 3 h en `/simulador` refresca su sesión en cada
  // `sync` aunque el middleware ya no lo haga por él.
  const hasSessionCookie = hasSupabaseAuthCookie(request.cookies.getAll().map((c) => c.name));

  if (
    !shouldResolveUser({
      pathname,
      hasSessionCookie,
      isPrefetch: isRouterPrefetch(request.headers),
    })
  ) {
    if (matchesPrefix(pathname, AUTH_REQUIRED_PREFIXES) && !hasSessionCookie) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', `${pathname}${search}`);
      return withAttributionCookie(NextResponse.redirect(loginUrl), request);
    }
    return withAttributionCookie(
      NextResponse.next({ request: { headers: request.headers } }),
      request
    );
  }

  const { supabase, response } = createSupabaseMiddlewareClient(request);

  let user;
  try {
    const {
      data: { user: fetchedUser },
    } = await supabase.auth.getUser();
    user = fetchedUser;
  } catch (err) {
    // Supabase inalcanzable: se trata como "sin sesión" en vez de tumbar el
    // sitio — fallar CERRADO es lo correcto y no se toca. G73b: pero una caída
    // del proveedor de Auth se ve desde dentro EXACTAMENTE igual que "nadie
    // tenía sesión", así que sin este reporte saldría a producción como un
    // cierre de sesión masivo sin una sola alerta.
    reportControlFailure('auth_session', 'fail-closed', err, { pathname, capa: 'middleware' });
    user = null;
  }

  if (matchesPrefix(pathname, AUTH_REQUIRED_PREFIXES) && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return withAttributionCookie(NextResponse.redirect(loginUrl), request);
  }

  if (matchesPrefix(pathname, VERIFIED_EMAIL_REQUIRED_PREFIXES) && user && !user.email_confirmed_at) {
    const appUrl = new URL('/app', request.url);
    appUrl.searchParams.set('verify', '1');
    return withAttributionCookie(NextResponse.redirect(appUrl), request);
  }

  return withAttributionCookie(response, request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
