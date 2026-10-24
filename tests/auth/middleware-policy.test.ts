import { describe, expect, it } from 'vitest';
import {
  AUTH_REQUIRED_PREFIXES,
  authRequiredPrefixes,
  VERIFIED_EMAIL_REQUIRED_PREFIXES,
  hasSupabaseAuthCookie,
  isRouterPrefetch,
  isSupabaseAuthCookieName,
  matchesPrefix,
  shouldResolveUser,
} from '@/lib/auth/middleware-policy';

/** Cabeceras mínimas para estas pruebas: solo hace falta `get`. */
function headers(map: Record<string, string>) {
  return { get: (name: string) => map[name.toLowerCase()] ?? null };
}

/** Azúcar: la mayoría de los casos no son pre-cargas. */
function resolve(pathname: string, hasSessionCookie: boolean, isPrefetch = false) {
  return shouldResolveUser({ pathname, hasSessionCookie, isPrefetch });
}

/**
 * G69 — el middleware dejó de preguntarle a Supabase Auth quién es el usuario
 * en las peticiones donde la respuesta no se usaba. Estas pruebas fijan la
 * frontera exacta: si alguien la mueve sin querer, o se pierde el ahorro, o
 * —peor— se deja de refrescar la sesión en una navegación de página.
 */

describe('hasSupabaseAuthCookie', () => {
  it('reconoce la cookie de sesión de cualquier proyecto', () => {
    expect(hasSupabaseAuthCookie(['sb-fumluvvzskhdxcyljbmx-auth-token'])).toBe(true);
    expect(hasSupabaseAuthCookie(['sb-otroproyecto-auth-token'])).toBe(true);
  });

  it('reconoce la cookie partida en trozos', () => {
    // `@supabase/ssr` la parte cuando excede el tamaño máximo de una cookie.
    expect(
      hasSupabaseAuthCookie(['sb-abc-auth-token.0', 'sb-abc-auth-token.1'])
    ).toBe(true);
  });

  it('no confunde otras cookies del sitio', () => {
    expect(hasSupabaseAuthCookie([])).toBe(false);
    expect(hasSupabaseAuthCookie(['ye_attribution', 'cookie_consent'])).toBe(false);
    // Una cookie de Supabase que NO es la de sesión no debe contar.
    expect(hasSupabaseAuthCookie(['sb-abc-provider-token'])).toBe(false);
  });
});

describe('shouldResolveUser', () => {
  it('nunca resuelve el usuario en rutas de API', () => {
    // El middleware descartaba el resultado en /api/*, y cada Route Handler
    // vuelve a preguntar con `requireUser`. Aquí está el ahorro grande: el
    // simulador manda un lote cada 15 s durante 3 h.
    expect(resolve('/api/simulator/sync', true)).toBe(false);
    expect(resolve('/api/adaptive/next-questions', true)).toBe(false);
    expect(resolve('/api/webhooks/stripe', false)).toBe(false);
  });

  it('no lo resuelve cuando no hay cookie de sesión', () => {
    expect(resolve('/', false)).toBe(false);
    expect(resolve('/precios', false)).toBe(false);
    expect(resolve('/app', false)).toBe(false);
  });

  it('SÍ lo resuelve en una navegación de página con sesión', () => {
    // Este es el caso que refresca el token y reescribe la cookie: si se
    // perdiera, la sesión de un alumno moriría al expirar el access token.
    expect(resolve('/app', true)).toBe(true);
    expect(resolve('/app/perfil', true)).toBe(true);
    expect(resolve('/simulador', true)).toBe(true);
    expect(resolve('/practicar', true)).toBe(true);
    expect(resolve('/', true)).toBe(true);
  });

  it('una ruta que solo EMPIEZA con "/api" pero no es API sí se resuelve', () => {
    expect(resolve('/apirest-guia', true)).toBe(true);
  });
});

describe('isRouterPrefetch', () => {
  it('reconoce las dos señales que manda Next', () => {
    expect(isRouterPrefetch(headers({ 'next-router-prefetch': '1' }))).toBe(true);
    expect(isRouterPrefetch(headers({ purpose: 'prefetch' }))).toBe(true);
  });

  it('una navegación normal no lo es', () => {
    expect(isRouterPrefetch(headers({ rsc: '1' }))).toBe(false);
    expect(isRouterPrefetch(headers({}))).toBe(false);
  });
});

describe('shouldResolveUser con pre-cargas', () => {
  it('no resuelve el usuario al precargar una ruta pública', () => {
    // Una sola vista de la landing precarga ~20 enlaces: sin esto, un alumno
    // con sesión pagaba ~20 viajes a Auth por mirar una página.
    expect(resolve('/', true, true)).toBe(false);
    expect(resolve('/precios', true, true)).toBe(false);
    expect(resolve('/simulador', true, true)).toBe(false);
  });

  it('SÍ lo resuelve al precargar una ruta protegida (hay que decidir la redirección)', () => {
    expect(resolve('/app', true, true)).toBe(true);
    expect(resolve('/checkout', true, true)).toBe(true);
  });

  it('la navegación real de una ruta pública sigue refrescando la sesión', () => {
    expect(resolve('/', true, false)).toBe(true);
  });
});

describe('matchesPrefix', () => {
  it('acepta el prefijo exacto y sus subrutas, no un prefijo parcial', () => {
    expect(matchesPrefix('/app', AUTH_REQUIRED_PREFIXES)).toBe(true);
    expect(matchesPrefix('/app/progreso', AUTH_REQUIRED_PREFIXES)).toBe(true);
    expect(matchesPrefix('/aplicacion', AUTH_REQUIRED_PREFIXES)).toBe(false);
    expect(matchesPrefix('/checkout/exito', VERIFIED_EMAIL_REQUIRED_PREFIXES)).toBe(true);
    expect(matchesPrefix('/precios', AUTH_REQUIRED_PREFIXES)).toBe(false);
  });

  it('G103: las rutas privadas del marketplace exigen sesión; el catálogo público no', () => {
    for (const p of ['/profesor', '/profesor/disponibilidad', '/clases', '/clases/mis-clases', '/mis-cursos', '/aprender/algebra']) {
      expect(matchesPrefix(p, AUTH_REQUIRED_PREFIXES), p).toBe(true);
    }
    for (const p of ['/cursos', '/cursos/algebra-desde-cero', '/regularizacion', '/profesores-transparencia']) {
      expect(matchesPrefix(p, AUTH_REQUIRED_PREFIXES), p).toBe(false);
    }
  });

  it('sin cookie, una ruta protegida sigue redirigiendo a /login', () => {
    // Combinación real del atajo: `shouldResolveUser` dice "no preguntes",
    // pero la redirección debe seguir ocurriendo por ausencia de cookie.
    const pathname = '/app/progreso';
    expect(resolve(pathname, false)).toBe(false);
    expect(matchesPrefix(pathname, AUTH_REQUIRED_PREFIXES)).toBe(true);
  });
});

/**
 * G100 — `/auth/salir` borra las cookies de sesión en su respuesta; si el
 * middleware validara al usuario ahí y refrescara el token, su `Set-Cookie`
 * con la sesión nueva competiría con el borrado.
 */
describe('G100: el cierre de sesión no pasa por la validación del middleware', () => {
  it('/auth/salir con cookie de sesión NO resuelve usuario', () => {
    expect(
      shouldResolveUser({ pathname: '/auth/salir', hasSessionCookie: true, isPrefetch: false })
    ).toBe(false);
  });

  it('control: /auth/confirm (mismo prefijo /auth) sí se resuelve', () => {
    expect(
      shouldResolveUser({ pathname: '/auth/confirm', hasSessionCookie: true, isPrefetch: false })
    ).toBe(true);
  });

  it('isSupabaseAuthCookieName reconoce los trozos de la cookie', () => {
    expect(isSupabaseAuthCookieName('sb-abc-auth-token')).toBe(true);
    expect(isSupabaseAuthCookieName('sb-abc-auth-token.0')).toBe(true);
    expect(isSupabaseAuthCookieName('yaentre_attribution')).toBe(false);
  });
});

describe('authRequiredPrefixes (G103)', () => {
  const all = { liveClasses: true, regularizacion: true, courses: true };
  const none = { liveClasses: false, regularizacion: false, courses: false };

  it('con todo encendido exige sesión en todo el marketplace', () => {
    expect(authRequiredPrefixes(all)).toEqual(AUTH_REQUIRED_PREFIXES);
  });

  it('con todo apagado, ningún prefijo del marketplace redirige a /login (la ruta da 404)', () => {
    const p = authRequiredPrefixes(none);
    for (const prefix of ['/profesor', '/clases', '/mis-cursos', '/aprender']) expect(p).not.toContain(prefix);
    // Lo de antes de G103 sigue protegido.
    for (const prefix of ['/app', '/onboarding', '/diagnostico', '/checkout', '/tutor', '/admin']) expect(p).toContain(prefix);
  });

  it('cada bandera abre solo lo suyo', () => {
    expect(authRequiredPrefixes({ ...none, courses: true })).toEqual(expect.arrayContaining(['/profesor', '/mis-cursos', '/aprender']));
    expect(authRequiredPrefixes({ ...none, courses: true })).not.toContain('/clases');
    expect(authRequiredPrefixes({ ...none, liveClasses: true })).toEqual(expect.arrayContaining(['/profesor', '/clases']));
    expect(authRequiredPrefixes({ ...none, regularizacion: true })).toContain('/profesor');
  });
});
