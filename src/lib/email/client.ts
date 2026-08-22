import 'server-only';
import { Resend } from 'resend';

/**
 * Cliente de correo — SOLO servidor (F16 tarea 8). `import 'server-only'`
 * blinda que `RESEND_API_KEY` nunca cruce al navegador (misma regla que
 * `stripe/client.ts`, F8).
 *
 * Respaldo obligatorio (instrucción explícita de la tarea): si falta la
 * credencial, o si la llamada real a Resend falla por cualquier razón, el
 * envío se DEGRADA a solo registrar en log — nunca lanza, nunca bloquea al
 * llamador. Ningún flujo de negocio (activar un pago, cerrar una sesión,
 * correr el cron) puede depender de que el proveedor de correo esté arriba.
 */

const FROM_ADDRESS = 'YaEntre <notificaciones@yaentre.com>';

let cachedClient: Resend | null = null;
let warnedMissingKey = false;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (!warnedMissingKey) {
      console.warn('[email] RESEND_API_KEY no configurada — los correos solo se registran en log.');
      warnedMissingKey = true;
    }
    return null;
  }
  if (!cachedClient) cachedClient = new Resend(apiKey);
  return cachedClient;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export type SendEmailMode = 'sent' | 'logged';

export interface SendEmailResult {
  ok: boolean;
  mode: SendEmailMode;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const client = getResendClient();
  if (!client) {
    console.log('[email:logged]', { to: input.to, subject: input.subject });
    return { ok: true, mode: 'logged' };
  }

  try {
    const { error } = await client.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    if (error) {
      console.error('[email] Resend devolvió un error, se registra en log en su lugar', error);
      console.log('[email:logged]', { to: input.to, subject: input.subject });
      return { ok: true, mode: 'logged' };
    }
    return { ok: true, mode: 'sent' };
  } catch (err) {
    console.error('[email] Falló el envío, se registra en log en su lugar', err);
    console.log('[email:logged]', { to: input.to, subject: input.subject });
    return { ok: true, mode: 'logged' };
  }
}
