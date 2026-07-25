/**
 * Autorización de rutas cron (F16 tarea 8, criterio "protegidas contra
 * ejecución no autorizada"). Módulo PURO: recibe el header ya leído y el
 * secreto ya resuelto — sin `NextRequest`, sin `process.env` — para poder
 * probarlo con valores planos.
 *
 * Vercel Cron agrega automáticamente `Authorization: Bearer $CRON_SECRET` a
 * las invocaciones programadas de una ruta cuando el proyecto tiene esa env
 * var configurada — no hace falta lógica extra del lado de Vercel, solo
 * verificar aquí que el header coincide.
 */
export function isAuthorizedCronRequest(
  authorizationHeader: string | null,
  secret: string | undefined
): boolean {
  if (!secret) return false; // sin secreto configurado, nunca autoriza — no hay bypass
  return authorizationHeader === `Bearer ${secret}`;
}
