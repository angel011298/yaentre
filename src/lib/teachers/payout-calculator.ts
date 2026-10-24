import { mexicoDayKey } from '@/lib/subscriptions/access-check';
import { addDaysToKey, mexicoLocalToInstant } from './slot-calculator';

/**
 * G103 — motor de liquidación semanal a profesores (spec marketplace §7 +
 * spec de horarios/cursos §5). PURO y en CENTAVOS ENTEROS.
 *
 * Una liquidación junta, por profesor y semana (lunes a domingo, hora de la
 * Ciudad de México), las dos fuentes de ingreso del profesor:
 *   · clases en vivo COMPLETADAS (nunca una clase que no se impartió);
 *   · inscripciones a cursos PAGADAS y no reembolsadas.
 * Sobre lo nuevo de la semana retiene el 15 % de reserva de desempeño durante
 * 30 días naturales; suma las reservas anteriores que ya se liberaron y los
 * ajustes del libro (`TeacherPayoutAdjustment`: reembolsos que llegaron DESPUÉS
 * de que la partida se pagó, con signo negativo). Si el neto no llega al
 * mínimo de $300, no se crea la liquidación y todo se acumula para la
 * siguiente semana: las partidas siguen sin liquidación asignada.
 *
 * Decisiones documentadas (docs/IMPLEMENTACION_HORARIOS_CURSOS.md):
 *   · El reembolso posterior a la liquidación se cobra como AJUSTE NEGATIVO en
 *     la siguiente, no reescribiendo la anterior (que ya salió por SPEI). Si
 *     el profesor no vuelve a vender, la deuda queda visible en el panel.
 *   · La reserva se calcula solo sobre lo NUEVO de la semana (bruto), nunca
 *     sobre reservas liberadas ni ajustes.
 *   · Todo lo que entra a la semana W tiene marca de tiempo ANTERIOR al cierre
 *     de W: recalcular una semana pasada da el mismo resultado.
 */
export const PAYOUT_RULES = {
  RETENTION_RATE_BPS: 1_500, // 15 %
  RETENTION_DAYS: 30,
  MIN_PAYOUT_CENTS: 30_000, // $300 MXN
} as const;

// ─────────────────────────── Semanas ───────────────────────────

function keyToUtcDate(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  // Rechaza fechas que JavaScript «corrige» en silencio (2026-02-31 → 3 mar).
  return d.toISOString().slice(0, 10) === key ? d : null;
}

/** Medianoche de la Ciudad de México del día `key`, como instante UTC. */
export function mexicoMidnight(key: string): Date {
  return mexicoLocalToInstant(key, '00:00');
}

export interface PayoutWeek {
  weekStartKey: string;
  periodStart: Date;
  /** EXCLUSIVO: el lunes siguiente a las 00:00 de México. */
  periodEnd: Date;
}

/** La semana que empieza el lunes `weekStartKey`; `null` si no es un lunes válido. */
export function payoutWeek(weekStartKey: string): PayoutWeek | null {
  const d = keyToUtcDate(weekStartKey);
  if (!d || d.getUTCDay() !== 1) return null;
  return {
    weekStartKey,
    periodStart: mexicoMidnight(weekStartKey),
    periodEnd: mexicoMidnight(addDaysToKey(weekStartKey, 7)),
  };
}

/** Lunes de la última semana YA CERRADA en `now` (la que se liquida el lunes). */
export function lastClosedWeekStart(now: Date): string {
  const today = mexicoDayKey(now);
  const dow = keyToUtcDate(today)!.getUTCDay(); // 0 = domingo
  const thisMonday = addDaysToKey(today, -((dow + 6) % 7));
  return addDaysToKey(thisMonday, -7);
}

/** La reserva se libera 30 días naturales después del cierre de su semana. */
export function retentionReleaseAt(periodEnd: Date): Date {
  return mexicoMidnight(addDaysToKey(mexicoDayKey(periodEnd), PAYOUT_RULES.RETENTION_DAYS));
}

// ─────────────────────────── Partidas ───────────────────────────

/**
 * Parte del profesor que SOBREVIVE a un reembolso. El reembolso se reparte en
 * la misma proporción que la venta: si el alumno recupera la mitad, el
 * profesor pierde la mitad de su parte. Total o mayor → 0.
 */
export function teacherShareAfterRefund(teacherPayCents: number, priceCents: number, refundedCents: number): number {
  if (refundedCents <= 0) return teacherPayCents;
  if (priceCents <= 0 || refundedCents >= priceCents) return 0;
  return teacherPayCents - Math.round((teacherPayCents * refundedCents) / priceCents);
}

export interface ClassForPayout {
  status: string;
  paidAt: Date | null;
  teacherPayCents: number;
  finalTariffCents: number;
  refundedCents: number;
}

/** Lo que una clase aporta a una liquidación: solo si se impartió y se cobró. */
export function classPayableCents(c: ClassForPayout): number {
  if (c.status !== 'COMPLETED' || !c.paidAt) return 0;
  return teacherShareAfterRefund(c.teacherPayCents, c.finalTariffCents, c.refundedCents);
}

export interface EnrollmentForPayout {
  status: string;
  paidAt: Date | null;
  pricePaidCents: number;
  teacherPayCents: number;
}

/** Lo que una inscripción aporta: pagada, con precio y no reembolsada. Las gratuitas no. */
export function enrollmentPayableCents(e: EnrollmentForPayout): number {
  if (e.status === 'REFUNDED' || !e.paidAt || e.pricePaidCents <= 0) return 0;
  return e.teacherPayCents;
}

/**
 * Ajuste que falta asentar para una partida YA incluida en una liquidación,
 * después de un reembolso. Idempotente: `existingCents` es la suma (negativa)
 * de los ajustes que ya hay para ESA inclusión, así que un segundo evento del
 * mismo reembolso no descuenta dos veces y un segundo reembolso parcial
 * descuenta solo la diferencia. Nunca devuelve un ajuste positivo.
 */
export function refundAdjustmentDelta(input: { creditedCents: number; currentShareCents: number; existingCents: number }): number {
  const owed = Math.min(0, input.currentShareCents - input.creditedCents);
  return Math.min(0, owed - input.existingCents);
}

// ─────────────────────────── Liquidación ───────────────────────────

export interface WeeklyPayoutInput {
  classes: ReadonlyArray<{ id: string; payableCents: number }>;
  enrollments: ReadonlyArray<{ id: string; payableCents: number }>;
  adjustments: ReadonlyArray<{ id: string; amountCents: number }>;
  releasableRetentions: ReadonlyArray<{ payoutId: string; retentionCents: number }>;
}

export interface WeeklyPayoutResult {
  classIds: string[];
  enrollmentIds: string[];
  adjustmentIds: string[];
  releasedFromPayoutIds: string[];
  classRevenueCents: number;
  courseRevenueCents: number;
  grossCents: number;
  retentionCents: number;
  adjustmentCents: number;
  releasedRetentionCents: number;
  netCents: number;
  classCount: number;
  enrollmentCount: number;
  meetsMinimum: boolean;
}

function assertCents(n: number, what: string): void {
  if (!Number.isInteger(n)) throw new Error(`${what} debe ser un entero de centavos: ${n}`);
}

export function retentionFor(grossCents: number): number {
  return Math.round((grossCents * PAYOUT_RULES.RETENTION_RATE_BPS) / 10_000);
}

export function calculateWeeklyPayout(input: WeeklyPayoutInput): WeeklyPayoutResult {
  const classes = input.classes.filter((c) => c.payableCents > 0);
  const enrollments = input.enrollments.filter((e) => e.payableCents > 0);
  const adjustments = input.adjustments.filter((a) => a.amountCents !== 0);
  const releases = input.releasableRetentions.filter((r) => r.retentionCents > 0);
  for (const c of classes) assertCents(c.payableCents, 'Clase');
  for (const e of enrollments) assertCents(e.payableCents, 'Inscripción');
  for (const a of adjustments) assertCents(a.amountCents, 'Ajuste');
  for (const r of releases) assertCents(r.retentionCents, 'Reserva');

  const classRevenueCents = classes.reduce((s, c) => s + c.payableCents, 0);
  const courseRevenueCents = enrollments.reduce((s, e) => s + e.payableCents, 0);
  const grossCents = classRevenueCents + courseRevenueCents;
  const retentionCents = retentionFor(grossCents);
  const adjustmentCents = adjustments.reduce((s, a) => s + a.amountCents, 0);
  const releasedRetentionCents = releases.reduce((s, r) => s + r.retentionCents, 0);
  const netCents = grossCents - retentionCents + releasedRetentionCents + adjustmentCents;

  return {
    classIds: classes.map((c) => c.id),
    enrollmentIds: enrollments.map((e) => e.id),
    adjustmentIds: adjustments.map((a) => a.id),
    releasedFromPayoutIds: releases.map((r) => r.payoutId),
    classRevenueCents,
    courseRevenueCents,
    grossCents,
    retentionCents,
    adjustmentCents,
    releasedRetentionCents,
    netCents,
    classCount: classes.length,
    enrollmentCount: enrollments.length,
    meetsMinimum: netCents >= PAYOUT_RULES.MIN_PAYOUT_CENTS,
  };
}

// ─────────────────────────── Estados ───────────────────────────

export type PayoutDecision = 'APPROVE' | 'MARK_TRANSFERRED' | 'MARK_FAILED' | 'CANCEL' | 'FORFEIT_RETENTION';
export type PayoutStatusName = 'PENDING' | 'APPROVED' | 'TRANSFERRED' | 'FAILED' | 'CANCELLED';

const TRANSITIONS: Record<Exclude<PayoutDecision, 'FORFEIT_RETENTION'>, { from: readonly PayoutStatusName[]; to: PayoutStatusName }> = {
  APPROVE: { from: ['PENDING'], to: 'APPROVED' },
  MARK_TRANSFERRED: { from: ['APPROVED', 'FAILED'], to: 'TRANSFERRED' },
  MARK_FAILED: { from: ['APPROVED'], to: 'FAILED' },
  // Una liquidación transferida ya salió del banco: no se cancela, se ajusta.
  CANCEL: { from: ['PENDING', 'APPROVED', 'FAILED'], to: 'CANCELLED' },
};

/**
 * Estado siguiente, o `null` si la decisión no aplica. Perder la reserva
 * (incidencia grave, decisión del admin) solo aplica a una liquidación
 * TRANSFERIDA cuya reserva sigue retenida y no se ha pagado.
 */
export function nextPayoutStatus(
  current: PayoutStatusName,
  decision: PayoutDecision,
  retention?: { status: string; paidInPayoutId: string | null; cents: number }
): PayoutStatusName | null {
  if (decision === 'FORFEIT_RETENTION') {
    return current === 'TRANSFERRED' && retention?.status === 'HELD' && !retention.paidInPayoutId && retention.cents > 0
      ? current
      : null;
  }
  const t = TRANSITIONS[decision];
  return t.from.includes(current) ? t.to : null;
}

/** Clave de rastreo SPEI: alfanumérica, hasta 30 caracteres (Banxico). */
export function isValidSpeiTrackingKey(value: string): boolean {
  return /^[A-Za-z0-9]{6,30}$/.test(value);
}
