import type { Prisma, RefundSource } from '@prisma/client';
import { prisma } from './prisma';
import { restoreConsumedCreditTx } from './referrals';

/**
 * REEMBOLSOS — capa de datos (Bloque 3). Tres caminos escriben `payment_refunds`:
 * la acción de soporte (`SUPPORT`), el webhook `charge.refunded` (`WEBHOOK`) y la
 * reconciliación diaria (`RECONCILIATION`). Los tres por `stripeRefundId` ÚNICO
 * con `skipDuplicates`: el primero que llega gana y los demás son no-op, así que
 * ni el orden de llegada ni un reintento pueden contar un reembolso dos veces.
 *
 * Un `Payment` NO cambia de estado al reembolsarse: sigue SUCCEEDED y lo
 * reembolsado se deriva de esta tabla (el tablero fiscal ya lo resta por fecha).
 */

/** Lo mínimo de un Refund de Stripe que este módulo necesita. */
export interface StripeRefundLite {
  id: string;
  amount: number;
  /** Segundos Unix. */
  created: number;
  status: string | null;
  reason: string | null;
  /** `metadata.origin`: «support» cuando lo emitió la acción de soporte. */
  origin: string | null;
}

export interface RecordedRefunds {
  /** `null` = el PaymentIntent no es de un plan (una clase, u otro cobro): no es asunto de esta tabla. */
  paymentId: string | null;
  subscriptionId: string | null;
  /** Filas NUEVAS escritas ahora (0 si todo ya estaba). */
  inserted: number;
  /** Total reembolsado del pago según nuestra tabla, ya con lo recién escrito. */
  refundedCents: number;
  paymentAmountCents: number;
  /** ¿El reembolso lo emitió soporte? Solo entonces sabemos que el plan ya se gestionó. */
  anyFromSupport: boolean;
}

/**
 * Escribe los reembolsos EXITOSOS de un PaymentIntent. Solo `succeeded`: uno
 * `pending` (reembolsos a OXXO/SPEI, que tardan) o `failed` no es dinero devuelto.
 */
export async function recordRefundsForPaymentIntent(
  tx: Prisma.TransactionClient | typeof prisma,
  paymentIntentId: string,
  refunds: StripeRefundLite[],
  source: RefundSource
): Promise<RecordedRefunds> {
  const payment = await tx.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
    select: { id: true, subscriptionId: true, amountMxn: true },
  });
  if (!payment) {
    return { paymentId: null, subscriptionId: null, inserted: 0, refundedCents: 0, paymentAmountCents: 0, anyFromSupport: false };
  }

  const ok = refunds.filter((r) => r.status === 'succeeded' && r.amount > 0);
  const created = ok.length
    ? await tx.paymentRefund.createMany({
        data: ok.map((r) => ({
          paymentId: payment.id,
          stripeRefundId: r.id,
          amountMxn: r.amount,
          occurredAt: new Date(r.created * 1000),
          source,
          reason: r.reason,
        })),
        skipDuplicates: true,
      })
    : { count: 0 };

  const total = await tx.paymentRefund.aggregate({ where: { paymentId: payment.id }, _sum: { amountMxn: true } });
  return {
    paymentId: payment.id,
    subscriptionId: payment.subscriptionId,
    inserted: created.count,
    refundedCents: total._sum.amountMxn ?? 0,
    paymentAmountCents: payment.amountMxn,
    anyFromSupport: refunds.some((r) => r.origin === 'support'),
  };
}

/** Lo ya reembolsado de un pago, para calcular cuánto falta por devolver. */
export async function refundedCentsOfPayment(paymentId: string): Promise<number> {
  const total = await prisma.paymentRefund.aggregate({ where: { paymentId }, _sum: { amountMxn: true } });
  return total._sum.amountMxn ?? 0;
}

/**
 * Da de baja un plan reembolsado, y con él: la venta de referido se revierte y el
 * crédito de referidos que la persona GASTÓ en esa compra se le devuelve (pagó
 * menos por ese plan; si se le reembolsa lo pagado y se queda sin el plan, no
 * puede además perder el crédito). Todo en una transacción.
 */
export async function cancelRefundedSubscription(
  subscriptionId: string,
  now: Date
): Promise<{ canceled: boolean; creditRestoredCents: number }> {
  return prisma.$transaction(async (tx) => {
    const changed = await tx.subscription.updateMany({
      where: { id: subscriptionId, status: { not: 'CANCELED' } },
      data: { status: 'CANCELED' },
    });
    const restored = await restoreConsumedCreditTx(tx, subscriptionId, now);
    return { canceled: changed.count > 0, creditRestoredCents: restored };
  });
}
