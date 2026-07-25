import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Firma del enlace de baja (F16 tarea 9): cada correo NO transaccional trae
 * un link `/api/email/unsubscribe?u=<userProfileId>&t=<type>&sig=<firma>`
 * que debe funcionar sin sesión (quien lo abre no necesariamente está
 * logueado en ese navegador/dispositivo). La firma HMAC evita que alguien
 * apague las notificaciones de otro usuario adivinando su `userProfileId` —
 * sin ella, el link de baja sería un IDOR trivial.
 *
 * Reusa `CRON_SECRET` como llave de firma en vez de introducir una variable
 * de entorno nueva: ya es un secreto solo-servidor pensado para autorizar
 * llamadas internas, y una firma de baja no tiene requisitos de rotación
 * distintos. Función PURA (recibe el secreto, no lo lee de env) para poder
 * probarla sin variables de entorno.
 */

const TOKEN_LENGTH = 16;

function payload(userProfileId: string, type: string): string {
  return `${userProfileId}:${type}`;
}

export function signUnsubscribeToken(
  userProfileId: string,
  type: string,
  secret: string
): string {
  return createHmac('sha256', secret).update(payload(userProfileId, type)).digest('hex').slice(0, TOKEN_LENGTH);
}

export function verifyUnsubscribeToken(
  userProfileId: string,
  type: string,
  token: string,
  secret: string
): boolean {
  const expected = signUnsubscribeToken(userProfileId, type, secret);
  const a = Buffer.from(expected, 'utf-8');
  const b = Buffer.from(token, 'utf-8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
