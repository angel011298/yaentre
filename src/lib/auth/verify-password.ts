import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * G65 — Comprueba una contraseña SIN tocar la sesión de quien pregunta.
 *
 * `changePasswordAction` necesita confirmar la contraseña actual antes de
 * cambiarla. El camino obvio —llamar a `signInWithPassword` en el cliente de
 * servidor que ya tiene la sesión— NO sirve, y no es teoría: al probarlo
 * contra el build de producción, el servidor empezó a escupir
 *
 *   AuthRefreshDiscardedError: Refresh result discarded:
 *   session state changed mid-flight (e.g., concurrent signOut)
 *
 * y el formulario se quedaba sin respuesta. Ese cliente está cacheado por
 * request (`cache()` de G62) y compartido con los guards; iniciar sesión sobre
 * él reescribe su estado interno y las cookies a media petición, y un intento
 * FALLIDO lo deja en un estado que el refresco posterior descarta.
 *
 * Aquí se usa un cliente EFÍMERO y sin almacenamiento: `persistSession: false`
 * (no escribe cookies ni localStorage) y `autoRefreshToken: false` (no arranca
 * temporizadores). Lo único que se toma de él es el booleano. La sesión que
 * GoTrue emite al validar se descarta sin usarse — no se llama a `signOut`
 * porque eso revocaría tokens que no son los de esta comprobación.
 */
export async function verifyPassword(email: string, password: string): Promise<boolean> {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  );

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  return !error && Boolean(data.session);
}
