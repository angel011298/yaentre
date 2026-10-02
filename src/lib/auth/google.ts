/**
 * G100 — inicio de sesión con Google. Apagado por defecto: el proveedor tiene
 * que estar dado de alta en Supabase (Authentication → Providers → Google,
 * con el cliente OAuth de Google Cloud) ANTES de mostrar el botón, o el
 * alumno recibe un error del proveedor en vez de una cuenta. Se lee en el
 * servidor (la acción lo vuelve a comprobar) y en el cliente para pintar el
 * botón: por eso lleva `NEXT_PUBLIC_` — no es un secreto.
 */
export function isGoogleAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === 'true';
}
