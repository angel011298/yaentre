import 'server-only';
import { Resend } from 'resend';
import { reportSilentDegradation } from '@/lib/observability/report';

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

/**
 * `sent`   — Resend lo aceptó (hay id de mensaje).
 * `logged` — no hay credencial: modo desarrollo, se registra en consola. Es un
 *            resultado legítimo, no un fallo.
 * `failed` — HABÍA credencial y el envío falló. G73b: antes esto se devolvía
 *            como `logged` con `ok: true`, indistinguible de lo anterior.
 */
export type SendEmailMode = 'sent' | 'logged' | 'failed';

export interface SendEmailResult {
  /** `false` SOLO cuando había credencial y el envío realmente falló. */
  ok: boolean;
  mode: SendEmailMode;
}

/**
 * ── G73b: por qué esta función dejó de mentir ───────────────────────────────
 *
 * Hasta G73 los tres caminos —enviado, sin credencial y reventado— devolvían
 * `{ ok: true }`. Sumado a que el runner del cron aísla cada job con
 * `Promise.allSettled`, la consecuencia era que `{"streakRisk":0,…}` significa
 * EXACTAMENTE lo mismo si no había destinatarios que si Resend devolvió 401
 * todo el día. Ese es el mismo patrón que mantuvo el limitador de tasa inerte
 * durante meses: un fallo que devuelve éxito no se puede detectar desde fuera.
 *
 * Lo que NO cambia: sigue sin lanzar NUNCA. Ningún flujo de negocio (activar
 * un pago, cerrar una sesión, correr el cron) puede depender de que el
 * proveedor de correo esté arriba. Lo que cambia es que el fallo ahora viaja
 * en el resultado Y produce un evento en Sentry.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const client = getResendClient();
  if (!client) {
    console.log('[email:logged]', { to: input.to, subject: input.subject });
    // En producción, "no hay credencial" no es modo desarrollo: es correo que
    // nadie va a recibir. Se reporta como degradación, no como normalidad.
    if (process.env.VERCEL_ENV === 'production') {
      reportSilentDegradation('email', new Error('RESEND_API_KEY ausente en producción'), {
        subject: input.subject,
      });
    }
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
      reportSilentDegradation('email', error, { subject: input.subject, stage: 'resend-error' });
      return { ok: false, mode: 'failed' };
    }
    return { ok: true, mode: 'sent' };
  } catch (err) {
    reportSilentDegradation('email', err, { subject: input.subject, stage: 'throw' });
    return { ok: false, mode: 'failed' };
  }
}
