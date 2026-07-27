import { timingSafeEqual } from 'node:crypto';

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
 *
 * F22: comparación en tiempo constante (`timingSafeEqual`) en vez de `===`
 * — un secreto largo comparado con `===` filtra, por temporización, cuántos
 * caracteres iniciales coinciden; mismo criterio ya usado en
 * `unsubscribe-token.ts` para el HMAC de baja de correo.
 */
export function isAuthorizedCronRequest(
  authorizationHeader: string | null,
  secret: string | undefined
): boolean {
  if (!secret || !authorizationHeader) return false; // sin secreto configurado, nunca autoriza — no hay bypass
  const expected = Buffer.from(`Bearer ${secret}`, 'utf-8');
  const actual = Buffer.from(authorizationHeader, 'utf-8');
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
