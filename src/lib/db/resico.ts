import { prisma } from './prisma';
import {
  aggregateClassRevenue,
  calculateResicoStatus,
  fiscalYearOf,
  type ClassRevenueRow,
  type ResicoStatus,
} from '@/lib/admin/resico-monitor';

/**
 * Lee los ingresos COBRADOS del año fiscal en curso y los pasa al cálculo puro
 * del monitor RESICO (`src/lib/admin/resico-monitor.ts`, donde viven las reglas
 * de qué cuenta en cada carril). Base de efectivo: cuenta cuándo se cobró, no
 * cuándo se impartió la clase.
 *
 * Suscripciones: lo cobrado en el año menos lo devuelto en el año (`payment_refunds`).
 *
 * Ingreso de una clase = lo cobrado menos lo que se DEBE devolver
 * (`refundDueCents`, que incluye lo ya reembolsado): un reembolso pendiente no es
 * ingreso. La comisión es la que quedó sellada en la fila al cobrar/cancelar.
 */
export async function getResicoStatus(now: Date = new Date()): Promise<ResicoStatus & { year: number }> {
  const fy = fiscalYearOf(now);

  const [subscriptions, refunds, classes] = await Promise.all([
    prisma.payment.aggregate({
      // Base de EFECTIVO: por la fecha en que se COBRÓ (`paidAt`), no en que se creó la fila.
      where: { status: 'SUCCEEDED', paidAt: { gte: fy.startUtc, lt: fy.endUtc } },
      _sum: { amountMxn: true },
    }),
    // Lo devuelto en el año, por la fecha en que se HIZO la devolución (puede ser de un
    // cobro de otro año): una devolución reduce el ingreso del periodo en que se otorga.
    prisma.paymentRefund.aggregate({
      where: { occurredAt: { gte: fy.startUtc, lt: fy.endUtc } },
      _sum: { amountMxn: true },
    }),
    prisma.classSession.findMany({
      where: { paidAt: { gte: fy.startUtc, lt: fy.endUtc } },
      select: {
        finalTariffCents: true,
        refundDueCents: true,
        commissionCents: true,
        teacher: { select: { paymentRail: true } },
      },
    }),
  ]);

  const rows: ClassRevenueRow[] = classes.map((c) => ({
    retainedCents: Math.max(0, c.finalTariffCents - c.refundDueCents),
    commissionCents: c.commissionCents,
    rail: c.teacher.paymentRail,
  }));

  return {
    year: fy.year,
    ...calculateResicoStatus(
      Math.max(0, (subscriptions._sum.amountMxn ?? 0) - (refunds._sum.amountMxn ?? 0)),
      aggregateClassRevenue(rows),
      fy.dayOfYear,
      fy.daysInYear
    ),
  };
}
