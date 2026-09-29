import { prisma } from './prisma';
import {
  calculateResicoStatus,
  fiscalYearOf,
  type ResicoStatus,
} from '@/lib/admin/resico-monitor';

/**
 * Lee los ingresos COBRADOS del año fiscal en curso y los pasa al cálculo puro
 * del monitor RESICO. Base de efectivo: cuenta cuándo se cobró, no cuándo se
 * impartió la clase.
 *
 * Ingreso de una clase = lo cobrado menos lo que se DEBE devolver
 * (`refundDueCents`, que incluye lo ya reembolsado): un reembolso pendiente no es
 * ingreso. La comisión es la que quedó sellada en la fila al cobrar/cancelar.
 */
export async function getResicoStatus(now: Date = new Date()): Promise<ResicoStatus & { year: number }> {
  const fy = fiscalYearOf(now);

  const [subscriptions, classes] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: 'SUCCEEDED', createdAt: { gte: fy.startUtc, lt: fy.endUtc } },
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

  let total = 0;
  let commission = 0;
  const carrils = { A: 0, B: 0 };
  const carrilA = { totalCents: 0, commissionCents: 0 };
  for (const c of classes) {
    const retained = Math.max(0, c.finalTariffCents - c.refundDueCents);
    if (retained === 0) continue;
    total += retained;
    commission += c.commissionCents;
    // Carril A = COMISION_MERCANTIL (factura y RFC propios); Carril B = ASIMILADOS.
    if (c.teacher.paymentRail === 'COMISION_MERCANTIL') {
      carrils.A += 1;
      carrilA.totalCents += retained;
      carrilA.commissionCents += c.commissionCents;
    } else {
      carrils.B += 1;
    }
  }

  return {
    year: fy.year,
    ...calculateResicoStatus(
      subscriptions._sum.amountMxn ?? 0,
      { totalCents: total, commissionCents: commission, carrils, carrilA },
      fy.dayOfYear,
      fy.daysInYear
    ),
  };
}
