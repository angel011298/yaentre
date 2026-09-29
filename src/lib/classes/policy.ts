import { splitTariff } from '@/lib/teachers/tariff';

/**
 * POLÍTICA DE CLASES — Bloque 2 (spec §6). Módulo PURO: sin DB, sin Stripe, sin
 * `Date.now()` implícito (el `now` siempre entra como parámetro).
 *
 * Aquí viven las decisiones que mueven dinero o castigan a alguien: qué
 * transiciones de estado son legales, cuánto se le devuelve al alumno al
 * cancelar y cómo se reparte lo retenido, y cuándo se le pide confirmación al
 * profesor. La capa de datos (`src/lib/db/classes.ts`) solo las APLICA; no
 * decide nada por su cuenta. Tenerlas separadas es lo que permite probarlas
 * exhaustivamente sin base de datos.
 *
 * ── Constantes que la spec fija y constantes que la spec CALLA ──────────────
 *
 * Las marcadas «spec» vienen tal cual de la especificación. Las marcadas
 * «SUPUESTO» son huecos que la spec deja abiertos y que se fijaron para poder
 * construir el flujo; están listadas en RETORNO_BLOQUE2.md «Parámetros que
 * fijé» para que las confirmes o las cambies aquí, en un solo lugar.
 */

export type ClassStatusKey =
  | 'PENDING_PAYMENT'
  | 'BOOKED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW_TEACHER'
  | 'NO_SHOW_STUDENT'
  | 'DISPUTED';

// ─────────────────────────── Máquina de estados ───────────────────────────

/**
 * Transiciones legales. Todo lo que no está aquí es ilegal: una clase CANCELADA
 * no vuelve a estar reservada, una COMPLETADA no se cancela, y un pago que llega
 * tarde no revive una clase que el sistema ya soltó.
 *
 * `IN_PROGRESS` existe en el modelo (spec §2) pero hoy ninguna ruta lo escribe:
 * detectarlo exige los eventos de asistencia de Google Meet, que esta fase no
 * integra. La clase pasa de CONFIRMED a COMPLETED cuando el profesor la marca.
 */
export const TRANSITIONS: Record<ClassStatusKey, readonly ClassStatusKey[]> = {
  PENDING_PAYMENT: ['BOOKED', 'CANCELLED'],
  // BOOKED → NO_SHOW_TEACHER: un profesor que nunca confirmó y tampoco se
  // presentó. (El job cancela las sin confirmar antes del inicio; esta es la red
  // para cuando el job no alcanzó a correr.)
  BOOKED: ['CONFIRMED', 'CANCELLED', 'NO_SHOW_TEACHER'],
  CONFIRMED: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW_TEACHER', 'NO_SHOW_STUDENT'],
  IN_PROGRESS: ['COMPLETED', 'DISPUTED'],
  COMPLETED: ['DISPUTED'],
  CANCELLED: [],
  NO_SHOW_TEACHER: ['DISPUTED'],
  NO_SHOW_STUDENT: ['DISPUTED'],
  DISPUTED: [],
};

export function canTransition(from: ClassStatusKey, to: ClassStatusKey): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Estados en los que la clase OCUPA el horario del profesor y del alumno. */
export const SLOT_HOLDING_STATUSES: readonly ClassStatusKey[] = [
  'PENDING_PAYMENT',
  'BOOKED',
  'CONFIRMED',
  'IN_PROGRESS',
];

/** Estados en los que el alumno ya pagó y la clase sigue en pie (se puede cancelar). */
export const CANCELLABLE_STATUSES: readonly ClassStatusKey[] = ['PENDING_PAYMENT', 'BOOKED', 'CONFIRMED'];

// ─────────────────────────────── Constantes de tiempo ───────────────────────────────

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

/** spec §6.7: cancelación gratuita del alumno hasta 24 h antes. */
export const FREE_CANCELLATION_WINDOW_HOURS = 24;
/** spec §6.7: pasado ese límite se le devuelve el 50%. */
export const LATE_CANCELLATION_REFUND_PERCENT = 50;

/** spec §6.4: se le pide confirmar 24 h antes. */
export const CONFIRMATION_REQUEST_HOURS_BEFORE = 24;
/** spec §6.4: sin confirmar a las 4 h → alerta al admin y aviso al alumno. */
export const CONFIRMATION_ALERT_AFTER_HOURS = 4;
/** spec §6.4: sin confirmar a las 12 h → cancelación automática con reembolso. */
export const CONFIRMATION_AUTO_CANCEL_AFTER_HOURS = 12;

/**
 * SUPUESTO: una clase reservada con menos de 24 h de anticipación no tiene
 * «24 h antes» para pedir la confirmación, y los plazos de 4 h y 12 h caerían
 * DESPUÉS de la clase. Por eso la alerta se acota a 60 min antes del inicio y la
 * cancelación automática a 30 min antes.
 */
export const ALERT_MIN_MINUTES_BEFORE_CLASS = 60;
export const AUTO_CANCEL_MIN_MINUTES_BEFORE_CLASS = 30;

/**
 * SUPUESTO: una reserva sin pagar retiene el horario 30 minutos y luego se
 * suelta. No son 20 por capricho: una sesión de Checkout de Stripe NO puede
 * expirar en menos de 30 minutos (`expires_at` mínimo), así que retener menos
 * dejaría una ventana en la que el alumno aún puede pagar una clase que ya se
 * soltó. Este es el plazo que SE LE DICE al alumno.
 */
export const PAYMENT_HOLD_MINUTES = 30;
/**
 * Vigencia real de la sesión de Checkout: el mínimo de Stripe (30) más un
 * minuto de margen, porque Stripe valida `expires_at` contra SU reloj y no el
 * nuestro — pedir exactamente 30 puede rechazarse por unos milisegundos.
 */
export const CHECKOUT_EXPIRY_MINUTES = 31;
/**
 * Cuándo se SUELTA el horario retenido. Tiene que ser POSTERIOR a la vigencia de
 * la sesión de Checkout: si el horario se soltara a los 30 min pero la sesión
 * aún aceptara pago a los 30:30, el alumno A podría pagar una hora que ya se le
 * ofreció al alumno B, y habría dos clases reservadas en el mismo horario. Con
 * la sesión muerta antes de que el horario se libere, esa ventana no existe.
 * (Un pago que aun así llegue tarde se REEMBOLSA solo: `confirmPayment`.)
 */
export const PAYMENT_SLOT_RELEASE_MINUTES = 33;
/** spec §6.6: el alumno tiene 48 h para calificar. */
export const RATING_WINDOW_HOURS = 48;
/** SUPUESTO: el alumno tiene 48 h para reportar un problema de una clase «impartida». */
export const DISPUTE_WINDOW_HOURS = 48;
/** spec §6.5: el enlace de la clase se manda 15 min antes. */
export const MEETING_LINK_LEAD_MINUTES = 15;
/** SUPUESTO: un no-show solo se puede declarar pasados 15 min del inicio. */
export const NO_SHOW_GRACE_MINUTES = 15;

// ─────────────────────────── Cancelación y reembolso ───────────────────────────

/**
 * Por QUÉ se cancela. Decide el reembolso y a quién se le cuenta:
 *
 *  · STUDENT_REQUEST         — el alumno cancela (la ventana de 24 h decide).
 *  · TEACHER_REQUEST         — el profesor cancela: 100% y CUENTA contra él.
 *  · TEACHER_NO_CONFIRMATION — el profesor no confirmó a tiempo: 100% y CUENTA.
 *  · TEACHER_NO_SHOW         — el profesor no se presentó: 100% y CUENTA.
 *  · STUDENT_NO_SHOW         — el alumno no se presentó: sin reembolso (SUPUESTO).
 *  · PAYMENT_TIMEOUT         — el pago no se confirmó: no hubo cobro; NO cuenta.
 */
export type CancellationCause =
  | 'STUDENT_REQUEST'
  | 'TEACHER_REQUEST'
  | 'TEACHER_NO_CONFIRMATION'
  | 'TEACHER_NO_SHOW'
  | 'STUDENT_NO_SHOW'
  | 'PAYMENT_TIMEOUT';

export interface CancellationOutcome {
  /** Lo que se le devuelve al alumno, en centavos. */
  refundCents: number;
  /** Lo que se queda del cobro (el alumno no lo recupera). */
  retainedCents: number;
  /** Comisión de YaEntre SOBRE LO RETENIDO. */
  commissionCents: number;
  /** Parte del profesor SOBRE LO RETENIDO. */
  teacherPayCents: number;
  /** ¿Entra en la tasa de cancelación del profesor? */
  countsAgainstTeacher: boolean;
}

/**
 * Calcula el desenlace económico de una cancelación. `paid = false` significa
 * que nunca hubo cobro: no hay nada que devolver ni que repartir.
 *
 * Invariante que se prueba con propiedades: `refund + retained === final` y
 * `commission + teacherPay === retained` — ni un centavo se pierde ni se
 * inventa.
 */
export function computeCancellation(input: {
  cause: CancellationCause;
  paid: boolean;
  finalTariffCents: number;
  scheduledAt: Date;
  now: Date;
}): CancellationOutcome {
  const { cause, paid, finalTariffCents, scheduledAt, now } = input;
  const countsAgainstTeacher =
    cause === 'TEACHER_REQUEST' || cause === 'TEACHER_NO_CONFIRMATION' || cause === 'TEACHER_NO_SHOW';

  if (!paid) {
    return { refundCents: 0, retainedCents: 0, commissionCents: 0, teacherPayCents: 0, countsAgainstTeacher };
  }

  let refundCents: number;
  switch (cause) {
    case 'TEACHER_REQUEST':
    case 'TEACHER_NO_CONFIRMATION':
    case 'TEACHER_NO_SHOW':
    case 'PAYMENT_TIMEOUT':
      refundCents = finalTariffCents;
      break;
    case 'STUDENT_NO_SHOW':
      refundCents = 0;
      break;
    case 'STUDENT_REQUEST': {
      const hoursBefore = (scheduledAt.getTime() - now.getTime()) / HOUR_MS;
      refundCents =
        hoursBefore >= FREE_CANCELLATION_WINDOW_HOURS
          ? finalTariffCents
          : Math.floor((finalTariffCents * LATE_CANCELLATION_REFUND_PERCENT) / 100);
      break;
    }
  }

  const retainedCents = finalTariffCents - refundCents;
  const { commissionCents, teacherPayCents } = splitTariff(retainedCents);
  return { refundCents, retainedCents, commissionCents, teacherPayCents, countsAgainstTeacher };
}

/** ¿Todavía puede el alumno cancelar por su cuenta? Una vez que la clase empezó, ya no. */
export function studentCanCancel(status: ClassStatusKey, scheduledAt: Date, now: Date): boolean {
  return CANCELLABLE_STATUSES.includes(status) && now.getTime() < scheduledAt.getTime();
}

// ─────────────────────── Confirmación del profesor (spec §6.4) ───────────────────────

export interface ConfirmationSchedule {
  /** Cuándo se le pide confirmar. */
  requestAt: Date;
  /** Cuándo, sin confirmar, se alerta al admin y se avisa al alumno. */
  alertAt: Date;
  /** Cuándo, sin confirmar, se cancela con reembolso. */
  autoCancelAt: Date;
}

/**
 * Línea de tiempo de la confirmación. Garantiza `requestAt ≤ alertAt ≤
 * autoCancelAt ≤ inicio de la clase`, incluso para una reserva de último minuto
 * (ver SUPUESTO arriba): nunca se cancela una clase DESPUÉS de que empezó.
 */
export function confirmationSchedule(scheduledAt: Date, paidAt: Date): ConfirmationSchedule {
  const start = scheduledAt.getTime();
  const requestAt = Math.max(paidAt.getTime(), start - CONFIRMATION_REQUEST_HOURS_BEFORE * HOUR_MS);

  const alertAt = Math.max(
    requestAt,
    Math.min(requestAt + CONFIRMATION_ALERT_AFTER_HOURS * HOUR_MS, start - ALERT_MIN_MINUTES_BEFORE_CLASS * MINUTE_MS)
  );
  const autoCancelAt = Math.max(
    alertAt,
    Math.min(
      requestAt + CONFIRMATION_AUTO_CANCEL_AFTER_HOURS * HOUR_MS,
      start - AUTO_CANCEL_MIN_MINUTES_BEFORE_CLASS * MINUTE_MS
    )
  );

  return { requestAt: new Date(requestAt), alertAt: new Date(alertAt), autoCancelAt: new Date(autoCancelAt) };
}

/** ¿Ya toca pedirle al profesor que confirme? */
export function confirmationRequestDue(scheduledAt: Date, paidAt: Date, now: Date): boolean {
  return now.getTime() >= confirmationSchedule(scheduledAt, paidAt).requestAt.getTime();
}

/** Momento a partir del cual se manda el enlace de la clase (spec §6.5). */
export function meetingLinkDueAt(scheduledAt: Date): Date {
  return new Date(scheduledAt.getTime() - MEETING_LINK_LEAD_MINUTES * MINUTE_MS);
}

/** ¿La reserva sin pagar ya venció y hay que soltar el horario? */
export function paymentHoldExpired(createdAt: Date, now: Date): boolean {
  return now.getTime() - createdAt.getTime() >= PAYMENT_SLOT_RELEASE_MINUTES * MINUTE_MS;
}

// ───────────────────────── Ciclo de vida posterior a la clase ─────────────────────────

/** ¿Ya se puede declarar un no-show? Solo pasada la gracia desde el inicio. */
export function noShowDeclarable(scheduledAt: Date, now: Date): boolean {
  return now.getTime() >= scheduledAt.getTime() + NO_SHOW_GRACE_MINUTES * MINUTE_MS;
}

/** ¿Ya empezó la clase? */
export function classHasStarted(scheduledAt: Date, now: Date): boolean {
  return now.getTime() >= scheduledAt.getTime();
}

/** SUPUESTO: se puede marcar como impartida desde 10 min antes del final (una clase puede acabar un poco antes). */
export const COMPLETION_EARLY_MINUTES = 10;

/**
 * ¿Ya se puede marcar como IMPARTIDA? Marcar una clase completada es la
 * evidencia con la que después se le paga al profesor (spec §13: «NUNCA pagar
 * sin que la clase haya sido impartida»), así que no se acepta antes de que la
 * clase esté por terminar: con solo «ya empezó», bastaría marcarla al minuto 1.
 *
 * ⚠️ Es un control de TIEMPO, no de asistencia: no prueba que alguien haya
 * estado en la sala (eso exige los eventos de asistencia de Meet, que esta fase
 * no integra). Lo respaldan la ventana de disputa del alumno y la aprobación
 * manual de cada liquidación.
 */
export function classCompletable(scheduledAt: Date, durationMinutes: number, now: Date): boolean {
  const end = scheduledAt.getTime() + durationMinutes * MINUTE_MS;
  return now.getTime() >= end - COMPLETION_EARLY_MINUTES * MINUTE_MS;
}

export type RatingRejection = 'NOT_COMPLETED' | 'ALREADY_RATED' | 'WINDOW_CLOSED' | 'INVALID_RATING';

export function checkCanRate(input: {
  status: ClassStatusKey;
  completedAt: Date | null;
  ratedAt: Date | null;
  rating: number;
  now: Date;
}): { ok: true } | { ok: false; reason: RatingRejection } {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { ok: false, reason: 'INVALID_RATING' };
  }
  if (input.status !== 'COMPLETED' || !input.completedAt) return { ok: false, reason: 'NOT_COMPLETED' };
  if (input.ratedAt) return { ok: false, reason: 'ALREADY_RATED' };
  if (input.now.getTime() > input.completedAt.getTime() + RATING_WINDOW_HOURS * HOUR_MS) {
    return { ok: false, reason: 'WINDOW_CLOSED' };
  }
  return { ok: true };
}

/** ¿Sigue abierta la ventana para reportar un problema de una clase ya marcada como impartida? */
export function disputeWindowOpen(completedAt: Date, now: Date): boolean {
  return now.getTime() <= completedAt.getTime() + DISPUTE_WINDOW_HOURS * HOUR_MS;
}

// ──────────────────────────────── Grabación ────────────────────────────────

/**
 * ¿Se puede GRABAR esta clase? Contexto maestro §4.5: la grabación genera datos
 * de imagen y voz de menores, así que exige consentimiento EXPRESO:
 *
 *  · alumno MENOR de 18 → el consentimiento de grabación lo da el TUTOR (en la
 *    liga de confirmación, Bloque 1). El del propio menor no cuenta.
 *  · alumno ADULTO → lo da él al reservar.
 *
 * Sin consentimiento NO se graba. Y el profesor firmó la política de grabación
 * al onboarding: la grabación necesita AMBOS lados.
 */
export function recordingConsentGranted(input: {
  studentIsMinor: boolean;
  tutorRecordingConsent: boolean;
  adultRecordingConsent: boolean;
  teacherAcceptedRecordingPolicy: boolean;
}): boolean {
  if (!input.teacherAcceptedRecordingPolicy) return false;
  return input.studentIsMinor ? input.tutorRecordingConsent : input.adultRecordingConsent;
}

/** Vencimiento de una grabación: fin de la clase + los días de retención. */
export function recordingExpiry(endedAt: Date, retentionDays: number): Date {
  if (!Number.isInteger(retentionDays) || retentionDays < 1) {
    throw new Error('Los días de retención deben ser un entero positivo.');
  }
  return new Date(endedAt.getTime() + retentionDays * 24 * HOUR_MS);
}
