import 'server-only';
import type { Prisma } from '@prisma/client';
import { dayOfYearFromKey, emptyMarketplaceRevenue, type MarketplaceRevenue } from '@/lib/admin/resico-monitor';
import { mexicoDayKey } from '@/lib/subscriptions/access-check';
import {
  calculateWeeklyPayout,
  classPayableCents,
  enrollmentPayableCents,
  mexicoMidnight,
  nextPayoutStatus,
  refundAdjustmentDelta,
  retentionReleaseAt,
  teacherShareAfterRefund,
  type PayoutDecision,
  type PayoutStatusName,
  type PayoutWeek,
  type WeeklyPayoutResult,
} from '@/lib/teachers/payout-calculator';
import { withKeyedAdvisoryLock } from './locks';
import { prisma } from './prisma';

/**
 * G103 — liquidaciones semanales a profesores (Fase 6). La aritmética vive en
 * `src/lib/teachers/payout-calculator.ts` (pura y probada); aquí solo se lee,
 * se bloquea y se escribe.
 *
 * Candado por profesor (`payout-teacher:<id>`): lo toman el cálculo de la
 * semana, la cancelación de una liquidación y los REEMBOLSOS (webhook). Sin
 * él, un reembolso que llega mientras se calcula la semana se perdería: el
 * cálculo leería la partida sin reembolsar, el webhook vería la partida aún
 * sin liquidación (y no asentaría ajuste), y el profesor cobraría algo que el
 * alumno ya recuperó.
 */
export function payoutLockKey(teacherId: string): string {
  return `payout-teacher:${teacherId}`;
}

type Db = Prisma.TransactionClient;

const PAYABLE_ENROLLMENT_STATUSES = ['ACTIVE', 'COMPLETED'] as const;

// ─────────────────────────── Lectura de partidas ───────────────────────────

async function loadPayableTx(db: Db, teacherId: string, cutoff: Date) {
  const classes = await db.classSession.findMany({
    where: { teacherId, status: 'COMPLETED', payoutId: null, paidAt: { not: null }, completedAt: { lt: cutoff } },
    select: { id: true, status: true, paidAt: true, teacherPayCents: true, finalTariffCents: true, refundedCents: true },
  });
  const enrollments = await db.courseEnrollment.findMany({
    where: {
      course: { teacherId },
      payoutId: null,
      status: { in: [...PAYABLE_ENROLLMENT_STATUSES] },
      paidAt: { not: null, lt: cutoff },
      teacherPayCents: { gt: 0 },
    },
    select: { id: true, status: true, paidAt: true, pricePaidCents: true, teacherPayCents: true },
  });
  const adjustments = await db.teacherPayoutAdjustment.findMany({
    where: { teacherId, appliedInPayoutId: null, voidedAt: null, createdAt: { lt: cutoff } },
    select: { id: true, amountCents: true },
  });
  const retentions = await db.teacherPayout.findMany({
    where: {
      teacherId,
      status: 'TRANSFERRED',
      retentionStatus: 'HELD',
      retentionCents: { gt: 0 },
      retentionPaidInPayoutId: null,
      retentionReleaseAt: { lte: cutoff },
    },
    select: { id: true, retentionCents: true },
  });
  return {
    classes: classes.map((c) => ({ id: c.id, payableCents: classPayableCents(c) })),
    enrollments: enrollments.map((e) => ({ id: e.id, payableCents: enrollmentPayableCents(e) })),
    adjustments,
    releasableRetentions: retentions.map((r) => ({ payoutId: r.id, retentionCents: r.retentionCents })),
  };
}

async function candidateTeacherIds(cutoff: Date): Promise<string[]> {
  const ids = new Set<string>();
  const classes = await prisma.classSession.findMany({
    where: { status: 'COMPLETED', payoutId: null, paidAt: { not: null }, completedAt: { lt: cutoff } },
    select: { teacherId: true },
    distinct: ['teacherId'],
  });
  classes.forEach((c) => ids.add(c.teacherId));
  const courses = await prisma.courseEnrollment.findMany({
    where: { payoutId: null, status: { in: [...PAYABLE_ENROLLMENT_STATUSES] }, paidAt: { not: null, lt: cutoff }, teacherPayCents: { gt: 0 } },
    select: { courseId: true },
    distinct: ['courseId'],
  });
  if (courses.length > 0) {
    const owners = await prisma.course.findMany({
      where: { id: { in: courses.map((c) => c.courseId) } },
      select: { teacherId: true },
    });
    owners.forEach((o) => ids.add(o.teacherId));
  }
  const adjustments = await prisma.teacherPayoutAdjustment.findMany({
    where: { appliedInPayoutId: null, voidedAt: null, createdAt: { lt: cutoff } },
    select: { teacherId: true },
    distinct: ['teacherId'],
  });
  adjustments.forEach((a) => ids.add(a.teacherId));
  const retentions = await prisma.teacherPayout.findMany({
    where: {
      status: 'TRANSFERRED',
      retentionStatus: 'HELD',
      retentionCents: { gt: 0 },
      retentionPaidInPayoutId: null,
      retentionReleaseAt: { lte: cutoff },
    },
    select: { teacherId: true },
    distinct: ['teacherId'],
  });
  retentions.forEach((r) => ids.add(r.teacherId));
  return [...ids].sort();
}

// ─────────────────────────── Cálculo de la semana ───────────────────────────

export type WeekOutcome =
  | { teacherId: string; outcome: 'created'; payoutId: string; netCents: number }
  | { teacherId: string; outcome: 'below_minimum'; netCents: number }
  | { teacherId: string; outcome: 'exists'; payoutId: string };

class PayoutRaceError extends Error {}

async function writePayoutTx(
  tx: Db,
  teacherId: string,
  week: PayoutWeek,
  calc: WeeklyPayoutResult,
  shares: ReadonlyMap<string, number>,
  now: Date
): Promise<string> {
  const payout = await tx.teacherPayout.create({
    data: {
      teacherId,
      periodStart: week.periodStart,
      periodEnd: week.periodEnd,
      classRevenueCents: calc.classRevenueCents,
      courseRevenueCents: calc.courseRevenueCents,
      grossCents: calc.grossCents,
      retentionCents: calc.retentionCents,
      adjustmentCents: calc.adjustmentCents,
      releasedRetentionCents: calc.releasedRetentionCents,
      netCents: calc.netCents,
      classCount: calc.classCount,
      enrollmentCount: calc.enrollmentCount,
      retentionReleaseAt: retentionReleaseAt(week.periodEnd),
      // Sin reserva (semana sin ventas nuevas) no hay nada que liberar después.
      retentionStatus: calc.retentionCents > 0 ? 'HELD' : 'RELEASED',
      retentionReleasedAt: calc.retentionCents > 0 ? null : now,
    },
  });
  // Cada partida, condicionada a seguir libre: si otra escritura la tomó, se
  // revierte TODO (el candado lo impide, esto es la segunda red).
  for (const c of calc.classIds) {
    const r = await tx.classSession.updateMany({ where: { id: c, payoutId: null }, data: { payoutId: payout.id, payoutTeacherCents: shares.get(c) } });
    if (r.count !== 1) throw new PayoutRaceError(`clase ${c}`);
  }
  for (const e of calc.enrollmentIds) {
    const r = await tx.courseEnrollment.updateMany({ where: { id: e, payoutId: null }, data: { payoutId: payout.id, payoutTeacherCents: shares.get(e) } });
    if (r.count !== 1) throw new PayoutRaceError(`inscripción ${e}`);
  }
  if (calc.adjustmentIds.length > 0) {
    const r = await tx.teacherPayoutAdjustment.updateMany({
      where: { id: { in: calc.adjustmentIds }, appliedInPayoutId: null, voidedAt: null },
      data: { appliedInPayoutId: payout.id },
    });
    if (r.count !== calc.adjustmentIds.length) throw new PayoutRaceError('ajustes');
  }
  if (calc.releasedFromPayoutIds.length > 0) {
    const r = await tx.teacherPayout.updateMany({
      where: { id: { in: calc.releasedFromPayoutIds }, retentionStatus: 'HELD', retentionPaidInPayoutId: null },
      data: { retentionStatus: 'RELEASED', retentionReleasedAt: now, retentionPaidInPayoutId: payout.id },
    });
    if (r.count !== calc.releasedFromPayoutIds.length) throw new PayoutRaceError('reservas');
  }
  return payout.id;
}

async function computeTeacherWeekTx(tx: Db, teacherId: string, week: PayoutWeek, now: Date): Promise<WeekOutcome | null> {
  const existing = await tx.teacherPayout.findFirst({
    where: { teacherId, periodStart: week.periodStart, status: { not: 'CANCELLED' } },
    select: { id: true },
  });
  if (existing) return { teacherId, outcome: 'exists', payoutId: existing.id };

  const input = await loadPayableTx(tx, teacherId, week.periodEnd);
  const calc = calculateWeeklyPayout(input);
  if (calc.classCount + calc.enrollmentCount + calc.adjustmentIds.length + calc.releasedFromPayoutIds.length === 0) return null;
  if (!calc.meetsMinimum) return { teacherId, outcome: 'below_minimum', netCents: calc.netCents };

  // Lo que se le acredita por cada partida queda congelado en la partida: es
  // la base de un ajuste si después se reembolsa (ids de cuid: no chocan).
  const shares = new Map([...input.classes, ...input.enrollments].map((i) => [i.id, i.payableCents] as const));
  const payoutId = await writePayoutTx(tx, teacherId, week, calc, shares, now);
  return { teacherId, outcome: 'created', payoutId, netCents: calc.netCents };
}

/**
 * Calcula la semana para TODOS los profesores con algo que liquidar. Una
 * transacción (y un candado) por profesor: el error de uno no tumba a los
 * demás. Idempotente: un profesor que ya tiene liquidación vigente esa semana
 * se reporta como `exists` y no se toca.
 */
export async function computeWeekPayouts(week: PayoutWeek, now: Date): Promise<WeekOutcome[]> {
  const out: WeekOutcome[] = [];
  for (const teacherId of await candidateTeacherIds(week.periodEnd)) {
    const r = await withKeyedAdvisoryLock(payoutLockKey(teacherId), (tx) => computeTeacherWeekTx(tx, teacherId, week, now));
    if (r) out.push(r);
  }
  return out;
}

// ─────────────────────────── Reembolsos posteriores ───────────────────────────

/**
 * Asienta en el libro el descuento que falta tras un reembolso de una partida
 * que YA está en una liquidación. Lo llaman los manejadores de reembolso
 * dentro de su transacción, con el candado del profesor tomado.
 */
export async function recordRefundAdjustmentTx(
  tx: Db,
  input: {
    teacherId: string;
    sourceKind: 'CLASS' | 'COURSE';
    sourceId: string;
    sourcePayoutId: string;
    creditedCents: number;
    currentShareCents: number;
    note: string;
  }
): Promise<number> {
  const existing = await tx.teacherPayoutAdjustment.aggregate({
    _sum: { amountCents: true },
    where: { sourceKind: input.sourceKind, sourceId: input.sourceId, sourcePayoutId: input.sourcePayoutId, voidedAt: null },
  });
  const delta = refundAdjustmentDelta({
    creditedCents: input.creditedCents,
    currentShareCents: input.currentShareCents,
    existingCents: existing._sum.amountCents ?? 0,
  });
  if (delta === 0) return 0;
  await tx.teacherPayoutAdjustment.create({
    data: {
      teacherId: input.teacherId,
      kind: 'REFUND',
      sourceKind: input.sourceKind,
      sourceId: input.sourceId,
      sourcePayoutId: input.sourcePayoutId,
      amountCents: delta,
      note: input.note,
    },
  });
  return delta;
}

// ─────────────────────────── Decisiones del admin ───────────────────────────

export type PayoutDecisionResult =
  | { ok: true; teacherId: string; teacherUserProfileId: string; from: PayoutStatusName; to: PayoutStatusName }
  | { ok: false; reason: 'NOT_FOUND' | 'INVALID' };

/**
 * Cancelar devuelve todo a la bolsa: las partidas quedan sin liquidación (se
 * vuelven a calcular, al monto vigente), los ajustes que ESTA liquidación
 * aplicaba vuelven a pendientes, y las reservas que liberaba vuelven a
 * retenidas. Los ajustes NACIDOS de partidas que esta liquidación pagaba se
 * anulan si aún no se aplicaron, o se compensan con un ajuste positivo si ya
 * se descontaron en otra: el profesor nunca recibió ese dinero.
 */
async function cancelPayoutTx(tx: Db, payoutId: string, now: Date): Promise<void> {
  await tx.classSession.updateMany({ where: { payoutId }, data: { payoutId: null, payoutTeacherCents: null } });
  await tx.courseEnrollment.updateMany({ where: { payoutId }, data: { payoutId: null, payoutTeacherCents: null } });
  await tx.teacherPayoutAdjustment.updateMany({ where: { appliedInPayoutId: payoutId }, data: { appliedInPayoutId: null } });

  const born = await tx.teacherPayoutAdjustment.findMany({
    where: { sourcePayoutId: payoutId, kind: 'REFUND', voidedAt: null },
  });
  for (const a of born) {
    if (!a.appliedInPayoutId) {
      await tx.teacherPayoutAdjustment.update({ where: { id: a.id }, data: { voidedAt: now } });
    } else {
      await tx.teacherPayoutAdjustment.create({
        data: {
          teacherId: a.teacherId,
          kind: 'CANCEL_REVERSAL',
          sourceKind: a.sourceKind,
          sourceId: a.sourceId,
          sourcePayoutId: payoutId,
          amountCents: -a.amountCents,
          note: 'Se canceló la liquidación que había pagado la partida reembolsada.',
        },
      });
    }
  }
  await tx.teacherPayout.updateMany({
    where: { retentionPaidInPayoutId: payoutId },
    data: { retentionPaidInPayoutId: null, retentionStatus: 'HELD', retentionReleasedAt: null },
  });
}

export async function applyPayoutDecision(
  payoutId: string,
  decision: PayoutDecision,
  input: { actorProfileId: string; reason: string; speiReference?: string; now: Date }
): Promise<PayoutDecisionResult> {
  const row = await prisma.teacherPayout.findUnique({
    where: { id: payoutId },
    select: {
      status: true,
      teacherId: true,
      retentionStatus: true,
      retentionPaidInPayoutId: true,
      retentionCents: true,
      teacher: { select: { userProfileId: true } },
    },
  });
  if (!row) return { ok: false, reason: 'NOT_FOUND' };
  const from = row.status as PayoutStatusName;
  const to = nextPayoutStatus(from, decision, {
    status: row.retentionStatus,
    paidInPayoutId: row.retentionPaidInPayoutId,
    cents: row.retentionCents,
  });
  if (!to) return { ok: false, reason: 'INVALID' };

  const ok = await withKeyedAdvisoryLock(payoutLockKey(row.teacherId), async (tx) => {
    // Condicionado al estado leído: dos admins a la vez no aplican dos veces.
    const guard = { id: payoutId, status: from };
    switch (decision) {
      case 'APPROVE':
        return (await tx.teacherPayout.updateMany({ where: guard, data: { status: to, approvedAt: input.now, approvedBy: input.actorProfileId } })).count === 1;
      case 'MARK_TRANSFERRED':
        return (
          await tx.teacherPayout.updateMany({
            where: guard,
            data: { status: to, transferredAt: input.now, speiReference: input.speiReference ?? null, failReason: null },
          })
        ).count === 1;
      case 'MARK_FAILED':
        return (await tx.teacherPayout.updateMany({ where: guard, data: { status: to, failedAt: input.now, failReason: input.reason } })).count === 1;
      case 'CANCEL': {
        const r = await tx.teacherPayout.updateMany({ where: guard, data: { status: to } });
        if (r.count !== 1) return false;
        await cancelPayoutTx(tx, payoutId, input.now);
        return true;
      }
      case 'FORFEIT_RETENTION':
        return (
          await tx.teacherPayout.updateMany({
            where: { ...guard, retentionStatus: 'HELD', retentionPaidInPayoutId: null },
            data: { retentionStatus: 'FORFEITED' },
          })
        ).count === 1;
    }
  });
  if (!ok) return { ok: false, reason: 'INVALID' };
  return { ok: true, teacherId: row.teacherId, teacherUserProfileId: row.teacher.userProfileId, from, to };
}

// ─────────────────────────── Lecturas para las pantallas ───────────────────────────

const ADMIN_PAYOUT_SELECT = {
  id: true,
  status: true,
  periodStart: true,
  periodEnd: true,
  classRevenueCents: true,
  courseRevenueCents: true,
  grossCents: true,
  retentionCents: true,
  adjustmentCents: true,
  releasedRetentionCents: true,
  netCents: true,
  classCount: true,
  enrollmentCount: true,
  speiReference: true,
  transferredAt: true,
  retentionStatus: true,
  retentionReleaseAt: true,
  failReason: true,
  teacher: { select: { fullName: true, displayName: true, clabe: true, bankName: true, paymentRail: true } },
} as const;

export function listPayoutsForAdmin(filter: { status?: PayoutStatusName }) {
  return prisma.teacherPayout.findMany({
    where: filter.status ? { status: filter.status } : {},
    orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
    take: 200,
    select: ADMIN_PAYOUT_SELECT,
  });
}

/** Deudas por reembolso que siguen sin descontar (para que no se olviden). */
export async function pendingAdjustmentsByTeacher() {
  const rows = await prisma.teacherPayoutAdjustment.groupBy({
    by: ['teacherId'],
    where: { appliedInPayoutId: null, voidedAt: null },
    _sum: { amountCents: true },
    _count: { _all: true },
  });
  if (rows.length === 0) return [];
  const teachers = await prisma.teacher.findMany({ where: { id: { in: rows.map((r) => r.teacherId) } }, select: { id: true, displayName: true } });
  const name = new Map(teachers.map((t) => [t.id, t.displayName]));
  return rows.map((r) => ({ teacherId: r.teacherId, displayName: name.get(r.teacherId) ?? '—', amountCents: r._sum.amountCents ?? 0, count: r._count._all }));
}

export async function getTeacherPayoutOverview(teacherId: string, now: Date) {
  const payouts = await prisma.teacherPayout.findMany({
    where: { teacherId, status: { not: 'CANCELLED' } },
    orderBy: { periodStart: 'desc' },
    take: 26,
    select: {
      id: true,
      status: true,
      periodStart: true,
      periodEnd: true,
      classRevenueCents: true,
      courseRevenueCents: true,
      grossCents: true,
      retentionCents: true,
      adjustmentCents: true,
      releasedRetentionCents: true,
      netCents: true,
      classCount: true,
      enrollmentCount: true,
      transferredAt: true,
      retentionStatus: true,
      retentionReleaseAt: true,
    },
  });
  // Vista previa: lo que se liquidaría si la semana cerrara ahora.
  const preview = calculateWeeklyPayout(await loadPayableTx(prisma, teacherId, now));
  const held = payouts.filter((p) => p.status === 'TRANSFERRED' && p.retentionStatus === 'HELD' && p.retentionCents > 0);
  return {
    payouts,
    preview,
    heldRetentionCents: held.reduce((s, p) => s + p.retentionCents, 0),
    nextReleaseAt: held.length > 0 ? held.reduce((d, p) => (p.retentionReleaseAt < d ? p.retentionReleaseAt : d), held[0].retentionReleaseAt) : null,
  };
}

// ─────────────────────────── Monitor RESICO ───────────────────────────

function railOf(paymentRail: string): 'A' | 'B' {
  return paymentRail === 'COMISION_MERCANTIL' ? 'A' : 'B';
}

function addTo(rev: MarketplaceRevenue, rail: 'A' | 'B', totalCents: number, commissionCents: number): void {
  rev.totalCents += totalCents;
  rev.commissionCents += commissionCents;
  rev.carrils[rail].count += 1;
  rev.carrils[rail].totalCents += totalCents;
  rev.carrils[rail].commissionCents += commissionCents;
}

/**
 * Ingresos cobrados en el año fiscal (calendario de la Ciudad de México), netos
 * de reembolsos registrados. Suscripciones = pagos SUCCEEDED (planes y
 * extensiones de vigencia); clases = cobradas, menos lo reembolsado (reparto
 * proporcional); cursos = inscripciones pagadas no reembolsadas.
 */
export async function getResicoInputs(now: Date) {
  const todayKey = mexicoDayKey(now);
  const { year, dayOfYear, daysInYear } = dayOfYearFromKey(todayKey);
  const from = mexicoMidnight(`${year}-01-01`);
  const to = mexicoMidnight(`${year + 1}-01-01`);

  const subs = await prisma.payment.aggregate({
    _sum: { amountMxn: true },
    where: { status: 'SUCCEEDED', createdAt: { gte: from, lt: to } },
  });

  const classRevenue = emptyMarketplaceRevenue();
  const classes = await prisma.classSession.findMany({
    where: { paidAt: { gte: from, lt: to } },
    select: { finalTariffCents: true, refundedCents: true, teacherPayCents: true, teacher: { select: { paymentRail: true } } },
  });
  for (const c of classes) {
    const total = Math.max(0, c.finalTariffCents - c.refundedCents);
    if (total === 0) continue;
    const teacherPart = teacherShareAfterRefund(c.teacherPayCents, c.finalTariffCents, c.refundedCents);
    addTo(classRevenue, railOf(c.teacher.paymentRail), total, total - teacherPart);
  }

  const courseRevenue = emptyMarketplaceRevenue();
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { paidAt: { gte: from, lt: to }, status: { not: 'REFUNDED' }, pricePaidCents: { gt: 0 } },
    select: { pricePaidCents: true, commissionCents: true, course: { select: { teacher: { select: { paymentRail: true } } } } },
  });
  for (const e of enrollments) addTo(courseRevenue, railOf(e.course.teacher.paymentRail), e.pricePaidCents, e.commissionCents);

  return { year, dayOfYear, daysInYear, subscriptionRevenueCents: subs._sum.amountMxn ?? 0, classRevenue, courseRevenue };
}
