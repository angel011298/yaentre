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

/**
 * Escapa texto para interpolarlo en HTML de un correo. Todo dato que escribe una
 * PERSONA (nombre de alumno, nombre público de un profesor…) pasa por aquí antes
 * de entrar a una plantilla: sin él, un nombre con `<a href=…>` o `<img>` se
 * inyectaría en un correo que llega a un TERCERO (el tutor, el profesor) desde
 * el dominio de YaEntre — phishing con nuestro remitente.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

// ─────────────────────── Confirmación del tutor (menores, Bloque 1) ───────────────────────

/**
 * Correo al TUTOR de un alumno menor de 18 con la liga de confirmación
 * (handoff §3.1). Transaccional: sin enlace de baja. `confirmUrl` ya trae el
 * token en claro. El copy explica qué se le pide y que puede ignorarlo si no
 * reconoce al alumno.
 */
export function tutorConsentEmail(input: {
  studentName: string | null;
  confirmUrl: string;
}): EmailContent {
  const who = input.studentName ? `<strong>${escapeHtml(input.studentName)}</strong>` : 'una persona menor de edad';
  return {
    subject: 'Confirma la inscripción de tu hijo(a) en YaEntre',
    html: wrapEmail(
      `
      <h1 style="font-size: 18px; margin: 0 0 12px;">Te pidieron confirmar una inscripción</h1>
      <p style="font-size: 14px; line-height: 1.5; margin: 0 0 12px;">
        ${who} registró una cuenta en YaEntre (preparación para exámenes de admisión) y te
        indicó como su madre, padre o tutor. Como es menor de edad, necesitamos tu confirmación
        antes de que pueda contratar un plan de pago.
      </p>
      <p style="font-size: 14px; line-height: 1.5; margin: 0 0 20px;">
        Al confirmar, autorizas su uso de la plataforma y el tratamiento de sus datos, y podrás
        decidir sobre avisos, analítica y grabación de clases.
      </p>
      <p style="text-align: center; margin: 0 0 20px;">
        <a href="${escapeHtml(input.confirmUrl)}" style="display: inline-block; background: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 14px;">
          Revisar y confirmar
        </a>
      </p>
      <p style="font-size: 12px; line-height: 1.5; color: #888; margin: 0;">
        Si no reconoces esta solicitud, puedes ignorar este correo: sin tu confirmación no se
        activa ningún plan de pago. La liga caduca en 7 días.
      </p>
      `.trim()
    ),
  };
}

// ─────────────────────────── Confirmación de pago ───────────────────────────

// Bloque 1 (handoff §3.2): nombres nuevos, sin «garantía».
const PLAN_LABELS: Record<string, string> = {
  MONTHLY: 'Plan Mensual',
  SEASON_PASS: 'Básico',
  PREMIUM: 'Premium',
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
      <h1 style="font-size: 18px; margin: 0 0 12px;">Progreso de ${escapeHtml(input.studentName)} esta semana</h1>
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

// ═══════════════════ Marketplace de profesores (Bloque 2) ═══════════════════
//
// Todos son TRANSACCIONALES (sin enlace de baja): avisan de algo que la persona
// puso en marcha —una clase que reservó o que va a impartir— y sin lo cual la
// clase no funciona. Todo texto que escribe una persona pasa por `escapeHtml`.
//
// Lenguaje obligatorio (contexto maestro §3.2/§8): «profesores independientes
// verificados en YaEntre»; el pago al profesor es una «liquidación de comisión
// mercantil»; nunca «garantía», «nuestros profesores» ni «próximamente».

function ctaButton(href: string, label: string): string {
  return `
      <p style="text-align: center; margin: 20px 0;">
        <a href="${escapeHtml(href)}" style="display: inline-block; background: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 14px;">${escapeHtml(label)}</a>
      </p>`;
}

const MXN = (cents: number) =>
  `$${(cents / 100).toLocaleString('es-MX', { minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })} MXN`;

/** Bienvenida al aprobarse el onboarding (spec §3.1 paso 5). */
export function teacherApprovedEmail(input: { publicName: string; dashboardUrl: string }): EmailContent {
  return {
    subject: '¡Bienvenido al directorio de YaEntre!',
    html: wrapEmail(`
      <h1 style="font-size: 18px; margin: 0 0 12px;">¡Bienvenido, ${escapeHtml(input.publicName)}!</h1>
      <p style="font-size: 14px; line-height: 1.6;">
        Revisamos tu solicitud y ya eres profesor independiente verificado en YaEntre. Tu perfil ya
        aparece en el directorio para los alumnos con acceso Premium. Empiezas en el nivel
        <strong>Inicial</strong>; subes de nivel por mérito conforme impartes clases y recibes buenas
        calificaciones.
      </p>${ctaButton(input.dashboardUrl, 'Ir a mi panel')}
    `),
  };
}

/** Aviso de seguridad: cambió la CLABE de destino de las liquidaciones. */
export function teacherClabeChangedEmail(input: { bankName: string; clabeMasked: string }): EmailContent {
  return {
    subject: 'Cambiaste tu cuenta para recibir liquidaciones — YaEntre',
    html: wrapEmail(`
      <h1 style="font-size: 18px; margin: 0 0 12px;">Cambió tu cuenta de destino</h1>
      <p style="font-size: 14px; line-height: 1.6;">
        Tus liquidaciones de comisión mercantil se depositarán ahora en la cuenta
        <strong>${escapeHtml(input.clabeMasked)}</strong> (${escapeHtml(input.bankName)}).
      </p>
      <p style="font-size: 14px; line-height: 1.6;">
        <strong>Si no fuiste tú</strong>, entra de inmediato a yaentre.com, cambia tu contraseña y
        escríbenos a soporte: alguien podría haber entrado a tu cuenta.
      </p>
    `),
  };
}

/** Al profesor: llegó una reserva pagada. */
export function classBookedTeacherEmail(input: {
  studentLabel: string;
  subjectLabel: string;
  whenLabel: string;
  durationMinutes: number;
  dashboardUrl: string;
}): EmailContent {
  return {
    subject: 'Nueva clase reservada — YaEntre',
    html: wrapEmail(`
      <h1 style="font-size: 18px; margin: 0 0 12px;">Nueva clase reservada</h1>
      <p style="font-size: 14px; line-height: 1.6;">
        <strong>${escapeHtml(input.studentLabel)}</strong> reservó una clase de
        <strong>${escapeHtml(input.subjectLabel)}</strong> contigo:<br/>
        ${escapeHtml(input.whenLabel)} · ${input.durationMinutes} min.
      </p>
      <p style="font-size: 13px; color: #555;">Te pediremos que la confirmes 24 horas antes.</p>${ctaButton(input.dashboardUrl, 'Ver mis clases')}
    `),
  };
}

/** Al profesor: pedirle que confirme (spec §6.4). */
export function confirmClassRequestEmail(input: {
  studentLabel: string;
  subjectLabel: string;
  whenLabel: string;
  dashboardUrl: string;
}): EmailContent {
  return {
    subject: 'Confirma tu clase — YaEntre',
    html: wrapEmail(`
      <h1 style="font-size: 18px; margin: 0 0 12px;">Confirma tu clase</h1>
      <p style="font-size: 14px; line-height: 1.6;">
        Tienes una clase de <strong>${escapeHtml(input.subjectLabel)}</strong> con
        <strong>${escapeHtml(input.studentLabel)}</strong>: ${escapeHtml(input.whenLabel)}.
        Confirma que vas a estar para que se mantenga la reserva.
      </p>
      <p style="font-size: 13px; color: #555;">
        Si no la confirmas a tiempo, la clase se cancela y se le devuelve el pago completo al alumno;
        cuenta como una cancelación tuya.
      </p>${ctaButton(input.dashboardUrl, 'Confirmar clase')}
    `),
  };
}

/** Al alumno: su profesor aún no confirma (spec §6.4, a las 4 h). */
export function classUnconfirmedStudentEmail(input: {
  teacherName: string;
  subjectLabel: string;
  whenLabel: string;
}): EmailContent {
  return {
    subject: 'Tu profesor aún no confirma tu clase — YaEntre',
    html: wrapEmail(`
      <h1 style="font-size: 18px; margin: 0 0 12px;">Estamos pendientes de tu clase</h1>
      <p style="font-size: 14px; line-height: 1.6;">
        <strong>${escapeHtml(input.teacherName)}</strong> todavía no confirma tu clase de
        ${escapeHtml(input.subjectLabel)} (${escapeHtml(input.whenLabel)}). Ya le avisamos. Si no la
        confirma a tiempo, se cancela y te devolvemos el pago completo.
      </p>
    `),
  };
}

/** A alumno o profesor: la clase se canceló. */
export function classCancelledEmail(input: {
  audience: 'student' | 'teacher';
  subjectLabel: string;
  whenLabel: string;
  by: 'STUDENT' | 'TEACHER' | 'SYSTEM';
  refundCents: number;
}): EmailContent {
  const who =
    input.by === 'STUDENT' ? 'el alumno' : input.by === 'TEACHER' ? 'el profesor' : 'YaEntre';
  const refundLine =
    input.audience === 'student'
      ? input.refundCents > 0
        ? `Te devolvemos <strong>${MXN(input.refundCents)}</strong> al método de pago con el que reservaste; puede tardar unos días en reflejarse.`
        : 'Esta clase no genera reembolso.'
      : '';
  return {
    subject: 'Se canceló una clase — YaEntre',
    html: wrapEmail(`
      <h1 style="font-size: 18px; margin: 0 0 12px;">Se canceló una clase</h1>
      <p style="font-size: 14px; line-height: 1.6;">
        La clase de <strong>${escapeHtml(input.subjectLabel)}</strong> del ${escapeHtml(input.whenLabel)}
        fue cancelada por ${who}. ${refundLine}
      </p>
    `),
  };
}

/** A ambos, 15 min antes: el enlace de la clase (spec §6.5). */
export function classLinkEmail(input: {
  audience: 'student' | 'teacher';
  counterpartName: string;
  subjectLabel: string;
  whenLabel: string;
  meetingUrl: string;
  recordingNotice: string | null;
}): EmailContent {
  return {
    subject: 'Tu clase empieza en unos minutos — YaEntre',
    html: wrapEmail(`
      <h1 style="font-size: 18px; margin: 0 0 12px;">Tu clase empieza pronto</h1>
      <p style="font-size: 14px; line-height: 1.6;">
        ${input.audience === 'student' ? 'Clase con' : 'Clase para'}
        <strong>${escapeHtml(input.counterpartName)}</strong> · ${escapeHtml(input.subjectLabel)} ·
        ${escapeHtml(input.whenLabel)}.
      </p>${ctaButton(input.meetingUrl, 'Entrar a la clase')}${
        input.recordingNotice
          ? `<p style="font-size: 12px; color: #555;">${escapeHtml(input.recordingNotice)}</p>`
          : ''
      }
    `),
  };
}

/**
 * Alerta INTERNA para el/los administradores maestros (spec §6.4: «alerta
 * admin»): un profesor sin confirmar, una ausencia, una disputa, un reembolso
 * que no salió. El texto son datos técnicos e identificadores de clase, no
 * datos personales.
 */
export function adminAlertEmail(input: { title: string; lines: string[] }): EmailContent {
  return {
    subject: `[YaEntre] ${input.title}`,
    html: wrapEmail(`
      <h1 style="font-size: 18px; margin: 0 0 12px;">${escapeHtml(input.title)}</h1>
      <ul style="font-size: 14px; line-height: 1.6; padding-left: 18px;">
        ${input.lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('\n        ')}
      </ul>
    `),
  };
}
