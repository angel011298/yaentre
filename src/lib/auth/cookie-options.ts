import type { CookieOptions } from '@supabase/ssr';
import { applySessionPersistence, SESSION_PERSISTENCE } from './session-policy';

/**
 * G65 🟠 — Opciones de la cookie de sesión.
 *
 * `@supabase/ssr` trae `httpOnly: false` por defecto (ver
 * `DEFAULT_COOKIE_OPTIONS` del paquete): la cookie tiene que ser legible por
 * JavaScript para que `createBrowserClient()` pueda leer la sesión en el
 * navegador. Esa cookie contiene el access token Y el refresh token, y el
 * refresh vive 400 días. Traducido: cualquier XSS —presente o futuro— no
 * robaba "una sesión", robaba la cuenta durante más de un año, con acceso a
 * los datos de un menor y al historial de pagos.
 *
 * El comentario de `supabase-server.ts` afirmaba desde F0 que la sesión vivía
 * en cookies httpOnly. No era cierto. Ahora sí lo es.
 *
 * Lo que costó: `createSupabaseBrowserClient()` ya no puede leer la sesión, y
 * su ÚNICO uso era subir el avatar a Storage desde el navegador. Esa subida se
 * movió al servidor (`uploadAvatarAction`), donde el cliente de Supabase sí
 * tiene la sesión — lee la cookie httpOnly él mismo. El resto de la app nunca
 * usó Supabase desde el cliente: todo pasa por Server Actions y RSC.
 *
 * `sameSite: 'lax'` se conserva (es el default del paquete y lo correcto):
 * bloquea el envío de la cookie en peticiones POST cross-site, que es lo que
 * protege a los Route Handlers con auth por cookie —`/api/simulator/sync`— de
 * un CSRF. Las Server Actions llevan además la validación de Origin de Next.
 */
export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

/**
 * Opciones finales de CADA escritura de cookie de sesión, en el cliente de
 * servidor y en el del middleware por igual (G65: si un lado se olvidara, el
 * primer refresco deshacía el arreglo).
 *
 * G100: encima de lo de G65 se aplica la política de persistencia. En modo
 * efímero —el default— se quitan `maxAge`/`expires`, que `@supabase/ssr` fija
 * SIEMPRE a 400 días sin importar `cookieOptions`: la cookie muere con el
 * navegador. Ver `session-policy.ts`.
 */
export function authCookieWriteOptions(options: CookieOptions): CookieOptions {
  return applySessionPersistence({ ...options, ...AUTH_COOKIE_OPTIONS }, SESSION_PERSISTENCE);
}
