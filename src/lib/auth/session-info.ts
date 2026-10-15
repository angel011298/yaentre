import {
  resolveEphemeralMaxAgeSecs,
  SESSION_PERSISTENCE,
  sessionAuthenticatedAt,
} from './session-policy';
import { createSupabaseServerClient } from './supabase-server';

/**
 * G100 — ¿A qué hora se cerrará sola la sesión de ESTE dispositivo?
 *
 * Mismo cálculo que el middleware (`proxy.ts` → `closeIfPastMaxAge`), para que
 * lo que la pantalla promete sea lo que el servidor hace. `null` en modo
 * persistente o si el token no trae la hora de autenticación. Llamar DESPUÉS
 * de un guard: el token que se lee aquí ya lo validó `getUser()`.
 */
export async function currentSessionEndsAt(): Promise<Date | null> {
  if (SESSION_PERSISTENCE !== 'ephemeral') return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const authenticatedAt = sessionAuthenticatedAt(session?.access_token);
  if (authenticatedAt === null) return null;
  const maxAge = resolveEphemeralMaxAgeSecs(process.env.EPHEMERAL_SESSION_MAX_AGE_SECS);
  return new Date((authenticatedAt + maxAge) * 1000);
}
