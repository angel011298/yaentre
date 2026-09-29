import { prisma } from './prisma';
import {
  buildFiscalYear,
  mexicoMonthOf,
  monthRangeUtc,
  retentionScenarios,
  summarizeReserves,
  totalsOf,
  type ClassIncomeRow,
  type MonthRef,
  type MonthlyFiscal,
  type ReserveSummary,
  type RetentionScenario,
  type RefundRow,
  type SubscriptionPaymentRow,
} from '@/lib/admin/fiscal';
import type { ExportPayment } from '@/lib/admin/fiscal-export';
import { planLabel } from '@/lib/stripe/pricing';

/**
 * Lectura del tablero fiscal — Bloque 3. SOLO LECTURA: ninguna función de este
 * archivo escribe. Las reglas (qué cuenta como ingreso, cómo se parte el IVA)
 * viven en `src/lib/admin/fiscal.ts`; aquí solo se leen las filas del año.
 *
 * Volumen: unas miles de filas por año como mucho; se traen y se agregan en
 * memoria, con los meses en hora de México (un `GROUP BY` en UTC los movería de
 * mes en el borde).
 */

function yearRangeUtc(year: number) {
  return { startUtc: monthRangeUtc({ year, month: 1 }).startUtc, endUtc: monthRangeUtc({ year, month: 12 }).endUtc };
}

/** Lo cobrado menos lo que se debe devolver: el mismo criterio del monitor RESICO. */
const retained = (finalTariffCents: number, refundDueCents: number) => Math.max(0, finalTariffCents - refundDueCents);

export async function readYearRows(year: number) {
  const { startUtc, endUtc } = yearRangeUtc(year);

  const [payments, refunds, classes] = await Promise.all([
    prisma.payment.findMany({
      where: { status: 'SUCCEEDED', paidAt: { gte: startUtc, lt: endUtc } },
      select: { amountMxn: true, paidAt: true },
    }),
    prisma.paymentRefund.findMany({
      where: { occurredAt: { gte: startUtc, lt: endUtc } },
      select: { amountMxn: true, occurredAt: true },
    }),
    prisma.classSession.findMany({
      where: { paidAt: { gte: startUtc, lt: endUtc } },
      select: {
        finalTariffCents: true,
        refundDueCents: true,
        commissionCents: true,
        paidAt: true,
        teacher: { select: { paymentRail: true } },
      },
    }),
  ]);

  return {
    payments: payments.flatMap((p): SubscriptionPaymentRow[] =>
      p.paidAt ? [{ amountCents: p.amountMxn, paidAt: p.paidAt }] : []
    ),
    refunds: refunds.map((r): RefundRow => ({ amountCents: r.amountMxn, occurredAt: r.occurredAt })),
    classes: classes.flatMap((c): ClassIncomeRow[] =>
      c.paidAt
        ? [
            {
              retainedCents: retained(c.finalTariffCents, c.refundDueCents),
              commissionCents: c.commissionCents,
              rail: c.teacher.paymentRail,
              paidAt: c.paidAt,
            },
          ]
        : []
    ),
  };
}

export interface DataCoverage {
  /** Suscripciones Mensuales activas con más de 30 días: sus renovaciones NO están en esta base. */
  monthlyRenewalsUnrecorded: number;
  /** Pagos OXXO/SPEI todavía pendientes: el dinero no ha llegado y no cuenta. */
  pendingAsyncPayments: number;
  /** Pagos cobrados sin fecha de cobro (anteriores a la migración 0022): su fecha es la de creación de la fila. */
  paymentsWithoutPaidAt: number;
  /** Clases con un reembolso por emitir o por completar. */
  classRefundsPending: number;
}

async function readCoverage(now: Date): Promise<DataCoverage> {
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const [monthlyRenewalsUnrecorded, pendingAsyncPayments, paymentsWithoutPaidAt, pendingRefunds] = await Promise.all([
    prisma.subscription.count({
      where: { plan: 'MONTHLY', status: 'ACTIVE', startedAt: { lt: thirtyDaysAgo } },
    }),
    prisma.payment.count({ where: { status: 'PENDING' } }),
    prisma.payment.count({ where: { status: 'SUCCEEDED', paidAt: null } }),
    // Comparar dos columnas entre sí no se expresa con `where` de Prisma.
    prisma.$queryRaw<Array<{ n: number }>>`
      SELECT COUNT(*)::int AS n FROM class_sessions WHERE "refundDueCents" > "refundedCents"
    `,
  ]);
  return {
    monthlyRenewalsUnrecorded,
    pendingAsyncPayments,
    paymentsWithoutPaidAt,
    classRefundsPending: pendingRefunds[0]?.n ?? 0,
  };
}

export interface RetentionBase {
  month: MonthRef;
  /** Lo que YaEntre debe a profesores del Carril A por clases IMPARTIDAS en el mes (IVA incluido). */
  carrilAPayCents: number;
  scenarios: RetentionScenario[];
}

async function readRetentionBases(year: number, months: readonly MonthlyFiscal[]): Promise<RetentionBase[]> {
  const { startUtc, endUtc } = yearRangeUtc(year);
  const completed = await prisma.classSession.findMany({
    where: {
      status: 'COMPLETED',
      completedAt: { gte: startUtc, lt: endUtc },
      teacher: { paymentRail: 'COMISION_MERCANTIL' },
    },
    select: { teacherPayCents: true, completedAt: true },
  });

  return months.map((m) => {
    const carrilAPayCents = completed.reduce((sum, c) => {
      if (!c.completedAt) return sum;
      const cm = mexicoMonthOf(c.completedAt);
      return cm.year === m.month.year && cm.month === m.month.month ? sum + c.teacherPayCents : sum;
    }, 0);
    return { month: m.month, carrilAPayCents, scenarios: retentionScenarios(carrilAPayCents) };
  });
}

async function readReserves(now: Date): Promise<ReserveSummary> {
  const payouts = await prisma.teacherPayout.findMany({
    select: { retentionCents: true, retentionStatus: true, transferredAt: true },
  });
  return summarizeReserves(
    payouts.map((p) => ({
      retentionCents: p.retentionCents,
      status: p.retentionStatus,
      transferredAt: p.transferredAt,
    })),
    now
  );
}

export interface FiscalSnapshot {
  year: number;
  months: MonthlyFiscal[];
  totals: ReturnType<typeof totalsOf>;
  retentionBases: RetentionBase[];
  reserves: ReserveSummary;
  /** Cuántos payouts hay: 0 = el motor de liquidación no está activo (o aún no se ha pagado a nadie). */
  payoutCount: number;
  coverage: DataCoverage;
}

/**
 * El estado fiscal de un año. Para el año en curso solo se devuelven los meses
 * hasta el actual: los futuros no tienen nada que mostrar.
 */
export async function getFiscalSnapshot(year: number, now: Date = new Date()): Promise<FiscalSnapshot> {
  const current = mexicoMonthOf(now);
  const through = year < current.year ? 12 : year === current.year ? current.month : 0;

  const [rows, coverage, reserves, payoutCount] = await Promise.all([
    readYearRows(year),
    readCoverage(now),
    readReserves(now),
    prisma.teacherPayout.count(),
  ]);

  const months = buildFiscalYear(year, rows, through);
  return {
    year,
    months,
    totals: totalsOf(months),
    retentionBases: await readRetentionBases(year, months),
    reserves,
    payoutCount,
    coverage,
  };
}

// ─────────────────────────────── Exportación ───────────────────────────────

export async function readExportInput(ref: MonthRef) {
  const { startUtc, endUtc } = monthRangeUtc(ref);

  const [payments, refunds, classes] = await Promise.all([
    prisma.payment.findMany({
      where: { status: 'SUCCEEDED', paidAt: { gte: startUtc, lt: endUtc } },
      select: { amountMxn: true, paidAt: true, method: true, subscription: { select: { plan: true } } },
    }),
    prisma.paymentRefund.findMany({
      where: { occurredAt: { gte: startUtc, lt: endUtc } },
      select: {
        amountMxn: true,
        occurredAt: true,
        payment: { select: { method: true, subscription: { select: { plan: true } } } },
      },
    }),
    prisma.classSession.findMany({
      where: { paidAt: { gte: startUtc, lt: endUtc } },
      select: {
        finalTariffCents: true,
        refundDueCents: true,
        commissionCents: true,
        paidAt: true,
        teacher: { select: { paymentRail: true } },
      },
    }),
  ]);

  return {
    payments: payments.flatMap((p): ExportPayment[] =>
      p.paidAt
        ? [{ amountCents: p.amountMxn, paidAt: p.paidAt, planLabel: planLabel(p.subscription.plan), method: p.method }]
        : []
    ),
    refunds: refunds.map((r) => ({
      amountCents: r.amountMxn,
      occurredAt: r.occurredAt,
      planLabel: planLabel(r.payment.subscription.plan),
      method: r.payment.method,
    })),
    classes: classes.flatMap((c): ClassIncomeRow[] =>
      c.paidAt
        ? [
            {
              retainedCents: retained(c.finalTariffCents, c.refundDueCents),
              commissionCents: c.commissionCents,
              rail: c.teacher.paymentRail,
              paidAt: c.paidAt,
            },
          ]
        : []
    ),
  };
}
