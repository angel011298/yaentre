import type { CookieOptions } from '@supabase/ssr';

/**
 * G100 — POLÍTICA DE SESIÓN «SIN RASTRO».
 *
 * Instrucción del dueño (2026-10-14): el inicio de sesión tiene que ser LOCAL
 * al dispositivo y no dejar rastro en él, hasta nueva orden. Hasta G99 una
 * sesión dejaba cuatro rastros en cualquier equipo donde se abriera:
 *
 *  1. **La cookie de Supabase vivía 400 días.** `@supabase/ssr` fuerza
 *     `maxAge = DEFAULT_COOKIE_OPTIONS.maxAge` en cada escritura, por encima de
 *     cualquier `cookieOptions` que se le pase (verificado en
 *     `node_modules/@supabase/ssr/dist/main/cookies.js`), así que cerrar el
 *     navegador no cerraba nada: el siguiente en usar la computadora entraba
 *     directo a la cuenta.
 *  2. **Cerrar sesión era GLOBAL.** `supabase.auth.signOut()` sin argumentos
 *     usa `scope: 'global'`: salir en el celular revocaba también la sesión de
 *     la laptop. Medido contra el Auth real: con `scope: 'local'` solo cae el
 *     dispositivo que sale y el otro sigue vivo.
 *  3. **El service worker guardaba en disco el HTML de cada pantalla privada**
 *     (tablero, perfil, panel del tutor) para servirlo sin conexión, y la Cache
 *     Storage sobrevive al cierre de sesión.
 *  4. **PostHog dejaba el id del perfil** en `localStorage` y en una cookie de
 *     un año tras `identify()`.
 *
 * Este módulo es PURO: decide, no lee cookies ni hace red. Lo usan el cliente
 * de servidor, el del middleware, el registro del service worker y PostHog,
 * para que las cuatro capas obedezcan al mismo interruptor.
 *
 * ── EL INTERRUPTOR ─────────────────────────────────────────────────────────
 *
 * `NEXT_PUBLIC_PERSISTENT_SESSIONS=true` devuelve el comportamiento anterior
 * (sesión recordada). Ausente o con cualquier otro valor ⇒ EFÍMERA. El default
 * es el modo que el dueño pidió: olvidar una variable nunca puede volver a
 * dejar sesiones abiertas en equipos ajenos (mismo criterio que G98 con
 * `SALES_OPEN`). Es `NEXT_PUBLIC_` porque el navegador también lo necesita
 * (service worker y PostHog); no es un secreto.
 */
export type SessionPersistence = 'ephemeral' | 'persistent';

export function resolveSessionPersistence(raw: string | undefined | null): SessionPersistence {
  return raw?.trim() === 'true' ? 'persistent' : 'ephemeral';
}

/** Modo vigente del despliegue. Next incrusta `NEXT_PUBLIC_*` en el build. */
export const SESSION_PERSISTENCE: SessionPersistence = resolveSessionPersistence(
  process.env.NEXT_PUBLIC_PERSISTENT_SESSIONS
);

/**
 * Tope de vida de una sesión efímera, contado desde que la persona se
 * AUTENTICÓ en ese dispositivo.
 *
 * Una cookie sin `Max-Age` muere al cerrar el navegador… en escritorio. En
 * Android el proceso del navegador casi nunca muere, y la opción «Continuar
 * donde lo dejaste» de Chrome restaura las cookies de sesión: sin un tope del
 * lado del servidor, «no deja rastro» sería falso justo en el celular. 12 h
 * cubren una jornada de estudio completa, incluido un simulacro de 3 h
 * empezado a media tarde.
 */
export const DEFAULT_EPHEMERAL_SESSION_MAX_AGE_SECS = 12 * 60 * 60;

/** Piso de la variable: por debajo, la sesión caducaría a mitad de un login. */
const MIN_EPHEMERAL_SESSION_MAX_AGE_SECS = 30;

/**
 * `EPHEMERAL_SESSION_MAX_AGE_SECS` permite acortar o alargar el tope (y que la
 * sonda de G100 lo pruebe por efecto sin esperar 12 h). Un valor inválido no
 * puede desactivar el tope: cae al default.
 */
export function resolveEphemeralMaxAgeSecs(raw: string | undefined | null): number {
  if (!raw) return DEFAULT_EPHEMERAL_SESSION_MAX_AGE_SECS;
  const n = Number(raw.trim());
  if (!Number.isInteger(n) || n < MIN_EPHEMERAL_SESSION_MAX_AGE_SECS) {
    return DEFAULT_EPHEMERAL_SESSION_MAX_AGE_SECS;
  }
  return n;
}

/**
 * Ajusta las opciones de UNA escritura de cookie de sesión según el modo.
 *
 * En modo efímero se quitan `maxAge` y `expires`: la cookie pasa a ser de
 * sesión del navegador. La EXCEPCIÓN es el borrado — Supabase borra una cookie
 * escribiéndola vacía con `maxAge: 0`; si se le quitara, el «borrado» dejaría
 * una cookie vacía viva hasta cerrar el navegador.
 */
export function applySessionPersistence(
  options: CookieOptions,
  mode: SessionPersistence
): CookieOptions {
  if (mode === 'persistent') return options;
  if (isDeletion(options)) return options;
  const { maxAge: _maxAge, expires: _expires, ...rest } = options;
  return rest;
}

function isDeletion(options: CookieOptions): boolean {
  if (options.maxAge !== undefined && options.maxAge <= 0) return true;
  if (options.expires !== undefined) {
    const at = options.expires instanceof Date ? options.expires.getTime() : Number(options.expires);
    if (Number.isFinite(at) && at <= Date.now()) return true;
  }
  return false;
}

/**
 * Momento (segundos Unix) en que la persona se autenticó en ESTA sesión, leído
 * del access token.
 *
 * Supabase registra cada autenticación en el claim `amr` como
 * `{ method, timestamp }`. Medido contra el Auth real del proyecto (G100):
 *  · el `timestamp` NO cambia al refrescar el token (el `iat` sí);
 *  · cada dispositivo tiene el suyo — iniciar sesión en otro equipo no lo
 *    mueve, a diferencia de `user.last_sign_in_at`, que es de la CUENTA y
 *    alargaría la sesión de un equipo olvidado cada vez que se entra desde otro.
 *
 * Se toma el MÁS reciente: volver a autenticarse (p. ej. una segunda verificación)
 * es una prueba nueva de identidad y reinicia el reloj.
 *
 * Solo se decodifica; la firma la valida `auth.getUser()` antes de llamar
 * aquí. Devuelve `null` ante cualquier forma inesperada — nunca lanza.
 */
export function sessionAuthenticatedAt(accessToken: string | null | undefined): number | null {
  if (!accessToken) return null;
  const parts = accessToken.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as { amr?: unknown };
    if (!Array.isArray(payload.amr)) return null;
    let latest: number | null = null;
    for (const entry of payload.amr) {
      const ts = (entry as { timestamp?: unknown })?.timestamp;
      if (typeof ts === 'number' && Number.isFinite(ts) && ts > 0) {
        latest = latest === null ? ts : Math.max(latest, ts);
      }
    }
    return latest;
  } catch {
    return null;
  }
}

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  // `atob` existe en Node ≥16 y en el runtime del middleware; `TextDecoder`
  // para no romper caracteres no ASCII del payload (nombres con acento).
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export type SessionLifetimeVerdict =
  | { expired: false; reason: 'PERSISTENT' | 'WITHIN_LIMIT' | 'UNKNOWN_AUTH_TIME' }
  | { expired: true; reason: 'MAX_AGE_EXCEEDED' };

/**
 * ¿Hay que cerrar esta sesión por antigüedad?
 *
 * Con la hora de autenticación ilegible se deja pasar (`UNKNOWN_AUTH_TIME`) y
 * quien llama lo REPORTA: si Supabase cambiara el formato del claim, cerrar
 * por las dudas expulsaría a TODOS en bucle —entrar, caducar, entrar— sin
 * forma de recuperarse. Fallar abierto con señal es lo correcto (G73b); la
 * cookie de sesión sigue muriendo con el navegador.
 */
export function evaluateSessionLifetime(params: {
  mode: SessionPersistence;
  authenticatedAt: number | null;
  nowSecs: number;
  maxAgeSecs: number;
}): SessionLifetimeVerdict {
  const { mode, authenticatedAt, nowSecs, maxAgeSecs } = params;
  if (mode === 'persistent') return { expired: false, reason: 'PERSISTENT' };
  if (authenticatedAt === null) return { expired: false, reason: 'UNKNOWN_AUTH_TIME' };
  // Un reloj adelantado del servidor de Auth (autenticación "en el futuro")
  // no puede volver eterna una sesión ni expulsarla: la edad negativa cuenta
  // como recién iniciada.
  const age = Math.max(0, nowSecs - authenticatedAt);
  return age > maxAgeSecs
    ? { expired: true, reason: 'MAX_AGE_EXCEEDED' }
    : { expired: false, reason: 'WITHIN_LIMIT' };
}

/**
 * Cabecera `Clear-Site-Data` del cierre de sesión. En modo efímero borra TODO
 * lo que el sitio dejó en el navegador —caché HTTP, cookies, `localStorage`,
 * `sessionStorage`, IndexedDB, Cache Storage y el registro del service
 * worker—; en modo persistente solo la caché, para no olvidar preferencias que
 * el dueño decidió conservar.
 */
export function clearSiteDataFor(mode: SessionPersistence): string {
  return mode === 'ephemeral' ? '"cache", "cookies", "storage"' : '"cache"';
}
