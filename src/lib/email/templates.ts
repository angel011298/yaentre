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

/**
 * Marca v1.0 (G102): los correos llevan el logo SIN personaje — «YaEntre» en
 * tinta con la barra Cempasúchil debajo (alto 0.13× el texto, a 0.1×). Es el
 * de pagos y el de madres y padres, y un correo es ambas cosas a menudo. Va
 * en HTML, no como imagen: casi todos los clientes bloquean imágenes de
 * entrada y el logo desaparecería justo en el primer correo.
 */
const INK = '#131119';
const ACCENT = '#FC9712';

function wrapEmail(bodyHtml: string, unsubscribeUrl?: string): string {
  return `
<div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
  <div style="padding: 24px 0; text-align: center;">
    <span style="display: inline-block; font-family: Outfit, -apple-system, Segoe UI, Roboto, sans-serif; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; line-height: 1; color: ${INK};">YaEntre<span style="display: block; height: 3px; margin-top: 2px; border-radius: 3px; background: ${ACCENT};"></span></span>
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
        Racha actual: <strong>${input.currentStreak} ${input.currentStreak === 1 ? 'día' : 'días'}</strong><br/>
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
    subject: `Tu racha de ${input.days} ${input.days === 1 ? 'día' : 'días'} está en riesgo`,
    html: wrapEmail(
      `
      <h1 style="font-size: 18px; margin: 0 0 12px;">No dejes que se apague</h1>
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

// ─────────────────────────── Vigencia del acceso (G103) ───────────────────────────

/**
 * G103 — los cinco avisos de vigencia (spec de temporalidad §3.5). Son
 * TRANSACCIONALES: informan del estado del servicio que el alumno pagó (como
 * la confirmación de pago), así que no llevan enlace de baja.
 * TODO-CLO: confirmar que el aviso de fin de gracia —que invita a comprar un
 * plan nuevo— puede ir sin opción de baja o si debe tratarse como MARKETING.
 *
 * Fechas en hora de la Ciudad de México y montos con `Intl` en MXN: el correo
 * se arma en un servidor en UTC (G100).
 */
export type AccessNoticeKind = 'T30' | 'T7' | 'T1' | 'T0' | 'GRACE_END';

function formatMexicoDate(date: Date): string {
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Mexico_City',
  });
}

function formatMxn(cents: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cents / 100);
}

function ctaButton(href: string, label: string): string {
  return `<p style="margin: 20px 0 4px; text-align: center;"><a href="${href}" style="display: inline-block; background: #7C3AED; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 20px; border-radius: 12px;">${label}</a></p>`;
}

export function accessNoticeEmail(input: {
  kind: AccessNoticeKind;
  expiresAt: Date;
  graceEndsAt: Date;
  /** `null` si ya no se puede extender (fin de gracia). */
  extensionPriceCents: number | null;
  siteUrl: string;
}): EmailContent {
  const expires = formatMexicoDate(input.expiresAt);
  const graceEnd = formatMexicoDate(input.graceEndsAt);
  const price = input.extensionPriceCents != null ? formatMxn(input.extensionPriceCents) : null;
  const extendUrl = `${input.siteUrl}/app/extender`;
  const extendCta = price ? ctaButton(extendUrl, `Extender 6 meses — ${price}`) : '';
  const p = (text: string) => `<p style="font-size: 14px; line-height: 1.6;">${text}</p>`;

  switch (input.kind) {
    case 'T30':
      return {
        subject: 'Tu acceso a YaEntre expira pronto',
        html: wrapEmail(`
          <h1 style="font-size: 18px; margin: 0 0 12px;">Tu acceso expira el ${expires}</h1>
          ${p(`Si tu examen es en la próxima convocatoria, puedes extender tu acceso 6 meses más${price ? ` por ${price}` : ''} y seguir practicando sin perder nada.`)}
          ${extendCta}
        `),
      };
    case 'T7':
      return {
        subject: 'Te quedan 7 días de acceso — YaEntre',
        html: wrapEmail(`
          <h1 style="font-size: 18px; margin: 0 0 12px;">Te quedan 7 días</h1>
          ${p(`Tu acceso a simulacros y contenido de pago termina el ${expires}. Extiéndelo 6 meses y sigue con tu ruta donde la dejaste.`)}
          ${extendCta}
        `),
      };
    case 'T1':
      return {
        subject: 'Último día de acceso — extiende ahora',
        html: wrapEmail(`
          <h1 style="font-size: 18px; margin: 0 0 12px;">Hoy es tu último día de acceso</h1>
          ${p(`Tu acceso termina el ${expires}. Después tendrás 7 días de gracia para extender sin perder tu avance.`)}
          ${extendCta}
        `),
      };
    case 'T0':
      return {
        subject: 'Tu acceso ha expirado — YaEntre',
        html: wrapEmail(`
          <h1 style="font-size: 18px; margin: 0 0 12px;">Tu acceso expiró el ${expires}</h1>
          ${p(`Tienes hasta el ${graceEnd} para extenderlo. Después de esa fecha dejarás de tener acceso a los simulacros y al contenido de pago.`)}
          ${p('Tu progreso y tus estadísticas se conservan.')}
          ${extendCta}
        `),
      };
    case 'GRACE_END':
      return {
        subject: 'Acceso finalizado — tu progreso está guardado',
        html: wrapEmail(`
          <h1 style="font-size: 18px; margin: 0 0 12px;">Tu acceso terminó</h1>
          ${p('Tu periodo de gracia terminó el ' + graceEnd + '. Tu progreso, tu historial y tu Entrómetro siguen guardados: si eliges un plan nuevo, retomas donde te quedaste.')}
          ${ctaButton(`${input.siteUrl}/precios`, 'Ver planes')}
        `),
      };
  }
}
