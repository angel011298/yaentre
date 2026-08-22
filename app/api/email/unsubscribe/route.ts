import { NextResponse, type NextRequest } from 'next/server';
import type { NotificationType } from '@prisma/client';
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe-token';
import { unsubscribeSecret } from '@/lib/email/links';
import { setNotificationPreference } from '@/lib/db/notifications';

/**
 * Enlace de baja (F16 tarea 9). Ruta PÚBLICA a propósito — quien la abre
 * viene de un correo, no necesariamente tiene sesión iniciada en ese
 * navegador/dispositivo. La firma HMAC (`sig`) es la única defensa contra
 * que alguien apague la preferencia de otro usuario adivinando su id —
 * ver `unsubscribe-token.ts`.
 */
export const dynamic = 'force-dynamic';

const VALID_TYPES: readonly NotificationType[] = [
  'STREAK_RISK',
  'PARENT_WEEKLY',
  'EXAM_COUNTDOWN',
  'MARKETING',
];

function page(message: string): NextResponse {
  const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8" /><title>YaEntre</title></head>
<body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 80px auto; text-align: center; color: #1a1a1a;">
  <h1 style="color: #7C3AED;">YaEntre</h1>
  <p>${message}</p>
</body>
</html>`;
  return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const userProfileId = searchParams.get('u');
  const type = searchParams.get('t');
  const sig = searchParams.get('sig');

  if (!userProfileId || !type || !sig || !VALID_TYPES.includes(type as NotificationType)) {
    return page('Este enlace no es válido.');
  }

  if (!verifyUnsubscribeToken(userProfileId, type, sig, unsubscribeSecret())) {
    return page('Este enlace no es válido o ya expiró.');
  }

  await setNotificationPreference(userProfileId, type as NotificationType, false);
  return page('Listo — ya no recibirás este tipo de correo.');
}
