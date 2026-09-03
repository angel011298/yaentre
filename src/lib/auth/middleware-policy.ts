/**
 * G69 — Política de "¿hace falta preguntarle a Supabase quién es este?" en el
 * middleware. Módulo PURO para poder probarlo con casos fijos: el middleware
 * de Next no es testeable sin montar `NextRequest`, y esta decisión sí tiene
 * que estar cubierta porque de ella depende que un guard no se relaje.
 *
 * El middleware corre en CASI TODA petición que no sea un asset estático, y
 * hasta G69 todas llamaban `supabase.auth.getUser()`. Con una sesión abierta
 * eso es un viaje de red al servidor de Auth por petición (`getUser()` valida
 * el JWT contra el servidor a propósito; por eso se recomienda sobre
 * `getSession()`), y el resultado se usaba únicamente para dos redirecciones.
 *
 * Ver `proxy.ts` para el detalle de por qué cada caso es seguro.
 */

/** Prefijos que el middleware redirige a `/login` si no hay sesión. */
export const AUTH_REQUIRED_PREFIXES = [
  '/app',
  '/onboarding',
  '/diagnostico',
  '/checkout',
  '/tutor',
  '/admin',
];

/** Prefijos que además exigen el correo verificado. */
export const VERIFIED_EMAIL_REQUIRED_PREFIXES = ['/checkout'];

export function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * ¿Alguna de las cookies de la petición es la de sesión de Supabase?
 *
 * `@supabase/ssr` la nombra `sb-<project-ref>-auth-token`, y la parte cuando
 * excede el tamaño máximo de una cookie (`…-auth-token.0`, `.1`, …), así que
 * la comprobación es por forma y no por nombre exacto — el `project-ref`
 * cambia entre entornos y no debe quedar escrito aquí.
 */
export function hasSupabaseAuthCookie(cookieNames: readonly string[]): boolean {
  return cookieNames.some((name) => name.startsWith('sb-') && name.includes('-auth-token'));
}

/**
 * ¿Es una petición de PRE-CARGA del router de Next?
 *
 * Next precarga cada `<Link>` que entra en el viewport: una sola vista de la
 * landing dispara ~20 peticiones `?_rsc=…` (contadas en el build de
 * producción). Todas pasan por el middleware.
 */
export function isRouterPrefetch(headers: { get(name: string): string | null }): boolean {
  return headers.get('next-router-prefetch') !== null || headers.get('purpose') === 'prefetch';
}

/**
 * ¿Vale la pena el viaje de red a Auth para esta petición?
 *
 * `false` en los tres casos donde no cambia nada:
 *
 *  - **sin cookie de sesión**: no hay nada que validar ni que refrescar, y
 *    `getUser()` devolvería `null` igual. Es todo el tráfico anónimo,
 *    buscadores incluidos.
 *  - **`/api/*`**: el middleware solo usa el usuario para redirigir PÁGINAS;
 *    en una ruta de API el valor se descartaba. Cada Route Handler vuelve a
 *    preguntar por su cuenta (`requireUser`), así que la autorización real no
 *    se toca. Aquí está el ahorro grande: `/api/simulator/sync` se llama cada
 *    15 s durante las 3 h de un simulacro.
 *  - **pre-carga de una ruta NO protegida**: no hay redirección que decidir, y
 *    el refresco de sesión puede esperar a la navegación de verdad.
 *
 * En cualquier otro caso devuelve `true` — en particular, la navegación real
 * de una página con sesión abierta, que es donde el middleware refresca el
 * token y reescribe la cookie.
 */
export function shouldResolveUser(params: {
  pathname: string;
  hasSessionCookie: boolean;
  isPrefetch: boolean;
}): boolean {
  const { pathname, hasSessionCookie, isPrefetch } = params;
  if (!hasSessionCookie) return false;
  if (pathname.startsWith('/api/')) return false;

  const gated =
    matchesPrefix(pathname, AUTH_REQUIRED_PREFIXES) ||
    matchesPrefix(pathname, VERIFIED_EMAIL_REQUIRED_PREFIXES);
  if (isPrefetch && !gated) return false;

  return true;
}
