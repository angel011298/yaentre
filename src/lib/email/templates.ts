/**
 * Plantillas de correo (F16 tarea 8). Funciones puras: reciben todo lo que
 * necesitan como parámetros (nunca leen `process.env` ni tocan Prisma) y
 * devuelven `{subject, html}` — el envío real vive en `client.ts`, la
 * resolución de destinatarios en la capa DB/cron.
 *
 * Regla de baja (tarea 9): todo correo NO transaccional trae
 * `unsubscribeUrl` en el pie. Solo `paymentConfirmationEmail` la omite —
 * Flujo_App §13: "los correos transaccionales (pago, verificación) siempre
 * se envían".
 */

export interface EmailContent {
  subject: string;
  html: string;
}

const BRAND_COLOR = '#7C3AED';

function wrapEmail(bodyHtml: string, unsubscribeUrl?: string): string {
  return `
<div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
  <div style="padding: 24px 0; text-align: center;">
    <span style="font-size: 20px; font-weight: 700; color: ${BRAND_COLOR};">YaEntre</span>
  </div>
  <div style="background: #ffffff; border: 1px solid #e5e5e5; border-radius: 16px; padding: 24px;">
    ${bodyHtml}
  </div>
  <div style="padding: 20px 8px; text-align: center; font-size: 12px; color: #888;">
    ${unsubscribeUrl ? `<a href="${unsubscribeUrl}" style="color: #888;">Dejar de recibir este correo</a>` : 'YaEntre · yaentre.com'}
  </div>
</div>`.trim();
}

// ─────────────────────────── Confirmación de pago ───────────────────────────

const PLAN_LABELS: Record<string, string> = {
  MONTHLY: 'Plan Mensual',
  SEASON_PASS: 'Pase de Temporada',
  PREMIUM: 'Premium Garantía',
};

export function paymentConfirmationEmail(input: {
  plan: string;
  amountMxn: number | null;
  status: 'confirmed' | 'pending';
}): EmailContent {
  const planLabel = PLAN_LABELS[input.plan] ?? input.plan;
  const amount = input.amountMxn != null ? `$${(input.amountMxn / 100).toFixed(2)} MXN` : null;

  if (input.status === 'pending') {
    return {
      subject: 'Tu pago está pendiente de confirmación — YaEntre',
      html: wrapEmail(`
        <h1 style="font-size: 18px; margin: 0 0 12px;">Registramos tu voucher</h1>
        <p style="font-size: 14px; line-height: 1.6;">
          Tu compra de <strong>${planLabel}</strong>${amount ? ` (${amount})` : ''} está pendiente
          de confirmación. En cuanto se confirme el pago, tu acceso se activa automáticamente y te
          avisamos por aquí.
        </p>
      `),
    };
  }

  return {
    subject: '¡Tu pago se confirmó! — YaEntre',
    html: wrapEmail(`
      <h1 style="font-size: 18px; margin: 0 0 12px;">¡Listo! Ya tienes acceso</h1>
      <p style="font-size: 14px; line-height: 1.6;">
        Confirmamos tu pago de <strong>${planLabel}</strong>${amount ? ` (${amount})` : ''}. Tu
        cuenta ya tiene acceso completo — entra a yaentre.com para seguir con tu preparación.
      </p>
    `),
  };
}

// ─────────────────────────── Resumen semanal parental ───────────────────────────

export function parentWeeklySummaryEmail(input: {
  studentName: string;
  currentStreak: number;
  predictedScore: number | null;
  weekDelta: number | null;
  recentSimulations: { score: number | null; totalQuestions: number }[];
  unsubscribeUrl: string;
}): EmailContent {
  const deltaText =
    input.weekDelta != null
      ? ` (${input.weekDelta >= 0 ? '+' : ''}${input.weekDelta} vs. la semana pasada)`
      : '';
  const simsText =
    input.recentSimulations.length > 0
      ? input.recentSimulations.map((s) => `${s.score ?? 0}/${s.totalQuestions}`).join(', ')
      : 'Sin simulacros completados todavía.';

  return {
    subject: `Resumen semanal de ${input.studentName} — YaEntre`,
    html: wrapEmail(
      `
      <h1 style="font-size: 18px; margin: 0 0 12px;">Progreso de ${input.studentName} esta semana</h1>
      <p style="font-size: 14px; line-height: 1.6;">
        🔥 Racha actual: <strong>${input.currentStreak} ${input.currentStreak === 1 ? 'día' : 'días'}</strong><br/>
        ${
          input.predictedScore != null
            ? `Predicción de aciertos: <strong>${input.predictedScore}</strong>${deltaText}<br/>`
            : ''
        }
        Últimos simulacros: ${simsText}
      </p>
      <p style="font-size: 13px; color: #555;">
        Entra a yaentre.com/tutor para ver el detalle completo.
      </p>
    `,
      input.unsubscribeUrl
    ),
  };
}

// ─────────────────────────── Racha en riesgo ───────────────────────────

export function streakRiskEmail(input: { days: number; unsubscribeUrl: string }): EmailContent {
  return {
    subject: `Tu racha de ${input.days} ${input.days === 1 ? 'día' : 'días'} está en riesgo 🔥`,
    html: wrapEmail(
      `
      <h1 style="font-size: 18px; margin: 0 0 12px;">No dejes que se apague 🔥</h1>
      <p style="font-size: 14px; line-height: 1.6;">
        Llevas <strong>${input.days} ${input.days === 1 ? 'día' : 'días'}</strong> de racha, pero
        hoy todavía no has estudiado. Unos minutos bastan para mantenerla viva.
      </p>
    `,
      input.unsubscribeUrl
    ),
  };
}

// ─────────────────────────── Cuenta regresiva al examen ───────────────────────────

export function examCountdownEmail(input: {
  daysRemaining: number;
  examName: string;
  unsubscribeUrl: string;
}): EmailContent {
  const dayWord = input.daysRemaining === 1 ? 'día' : 'días';
  return {
    subject: `Faltan ${input.daysRemaining} ${dayWord} para tu examen — YaEntre`,
    html: wrapEmail(
      `
      <h1 style="font-size: 18px; margin: 0 0 12px;">Faltan ${input.daysRemaining} ${dayWord}</h1>
      <p style="font-size: 14px; line-height: 1.6;">
        Tu examen (${input.examName}) se acerca. Aprovecha estos últimos días para repasar tus
        temas más débiles y hacer un simulacro más si puedes.
      </p>
    `,
      input.unsubscribeUrl
    ),
  };
}

// ─────────────────────────── G100: recordatorios con horario ───────────────────────────

function ctaButton(href: string, label: string): string {
  return `<p style="margin: 20px 0 0; text-align: center;">
        <a href="${href}" style="display: inline-block; background: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 20px; border-radius: 12px;">${label}</a>
      </p>`;
}

export function studyReminderEmail(input: {
  goalMins: number;
  practiceUrl: string;
  unsubscribeUrl: string;
}): EmailContent {
  return {
    subject: `Tus ${input.goalMins} minutos de hoy te esperan 🦉`,
    html: wrapEmail(
      `
      <h1 style="font-size: 18px; margin: 0 0 12px;">Es tu hora de estudiar</h1>
      <p style="font-size: 14px; line-height: 1.6;">
        Tu meta de hoy son <strong>${input.goalMins} minutos</strong>. Una práctica corta de tus
        temas débiles cuenta, y cada día suma para tu examen.
      </p>
      ${ctaButton(input.practiceUrl, 'Practicar ahora')}
      <p style="font-size: 12px; line-height: 1.6; color: #888; margin: 16px 0 0;">
        Cambia la hora o los días desde tu perfil, en Notificaciones.
      </p>
    `,
      input.unsubscribeUrl
    ),
  };
}

export function simulationReminderEmail(input: {
  examName: string | null;
  durationMins: number | null;
  simulatorUrl: string;
  unsubscribeUrl: string;
}): EmailContent {
  const exam = input.examName ? ` de ${input.examName}` : '';
  const duration = input.durationMins
    ? ` Aparta ${Math.round(input.durationMins / 60)} horas sin interrupciones, como el día real.`
    : '';
  return {
    subject: 'Sábado de simulacro: mide cómo vas — YaEntre',
    html: wrapEmail(
      `
      <h1 style="font-size: 18px; margin: 0 0 12px;">Hoy toca simulacro</h1>
      <p style="font-size: 14px; line-height: 1.6;">
        Un simulacro completo${exam} con tiempo real es la mejor forma de saber cuántos aciertos
        llevas y qué reforzar la próxima semana.${duration}
      </p>
      ${ctaButton(input.simulatorUrl, 'Ir al simulador')}
    `,
      input.unsubscribeUrl
    ),
  };
}
