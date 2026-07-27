import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/auth/supabase-middleware';
import { checkRateLimit } from '@/lib/rate-limit/limiter';
import {
  ATTRIBUTION_COOKIE_MAX_AGE_SECS,
  ATTRIBUTION_COOKIE_NAME,
  extractAcquisitionSource,
} from '@/lib/marketing/attribution';

// Ver docs/Flujo_App_Acierta_v1.0.md §16.1 (mapa de rutas) y §16.2 (guards).
const AUTH_REQUIRED_PREFIXES = ['/app', '/onboarding', '/diagnostico', '/checkout', '/tutor', '/admin'];
const VERIFIED_EMAIL_REQUIRED_PREFIXES = ['/checkout'];

// F20 tarea 5: límite básico de tasa en las rutas de API. Se excluyen los
// webhooks (autenticados por firma HMAC de Stripe, no por volumen — un
// reintento legítimo de Stripe nunca debe recibir un 429) y los crons
// (autenticados por CRON_SECRET, invocados por el scheduler de Vercel, no
// por un usuario final que pudiera abusar).
const RATE_LIMITED_PREFIX = '/api';
const RATE_LIMIT_EXEMPT_PREFIXES = ['/api/webhooks', '/api/cron'];
const RATE_LIMIT_MAX_REQUESTS = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** IP del cliente vía los headers que Vercel/proxies reenvían — `NextRequest.ip` ya no existe. */
function resolveClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') ?? 'unknown';
}

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
    const ip = resolveClientIp(request);
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

  const { supabase, response } = createSupabaseMiddlewareClient(request);

  let user;
  try {
    const {
      data: { user: fetchedUser },
    } = await supabase.auth.getUser();
    user = fetchedUser;
  } catch {
    // Supabase inalcanzable: se trata como "sin sesión" en vez de tumbar el sitio.
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
