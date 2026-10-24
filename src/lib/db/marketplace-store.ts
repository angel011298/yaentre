import type { MarketplaceStore, ClassConfirmOutcome } from '@/lib/stripe/marketplace-webhook';
import { getStripe } from '@/lib/stripe/client';
import { reportControlFailure } from '@/lib/observability/report';
import { prisma } from './prisma';
import { applyAccessExtension } from './access-extension';
import { runIdempotent } from './billing';
import { confirmClassBookingTx, recordClassRefundTx, releaseClassBookingTx } from './classes';

/**
 * G103 — implementación real (Prisma) del `MarketplaceStore` que usa el
 * webhook para los pagos que NO son de planes. Cada mutación es idempotente
 * por `event.id` (`runIdempotent`, misma transacción que la mutación).
 */
export const marketplaceStore: MarketplaceStore = {
  applyAccessExtension,

  async confirmClassBooking(eventId, eventType, payment) {
    const holder: { outcome: ClassConfirmOutcome | null } = { outcome: null };
    const result = await runIdempotent(eventId, eventType, async (tx) => {
      holder.outcome = await confirmClassBookingTx(tx, { ...payment, now: new Date() });
      if (holder.outcome === 'mismatch' || holder.outcome === 'not_found') {
        // Cobrado sin reserva que corresponda: dinero a revisar a mano.
        reportControlFailure(
          'payment_consistency',
          'fail-closed',
          new Error(`Cobro de clase que no corresponde a la reserva (${holder.outcome})`),
          { classSessionId: payment.classSessionId, paymentIntentId: payment.paymentIntentId }
        );
      }
    });
    return { result, outcome: holder.outcome };
  },

  releaseClassBooking(eventId, eventType, classSessionId, reason) {
    return runIdempotent(eventId, eventType, (tx) => releaseClassBookingTx(tx, classSessionId, reason, new Date()));
  },

  async recordRefund(eventId, eventType, paymentIntentId, refundedCents) {
    const isClass = await prisma.classSession.count({ where: { stripePaymentId: paymentIntentId } });
    if (isClass === 0) return 'unknown';
    return runIdempotent(eventId, eventType, async (tx) => {
      await recordClassRefundTx(tx, paymentIntentId, refundedCents, new Date());
    });
  },

  async refundClassPayment(classSessionId, paymentIntentId) {
    try {
      const refund = await getStripe().refunds.create(
        { payment_intent: paymentIntentId, reason: 'duplicate', metadata: { classSessionId, cause: 'slot_taken_after_payment' } },
        { idempotencyKey: `refund-class-conflict-${classSessionId}` }
      );
      await prisma.classSession.update({
        where: { id: classSessionId },
        data: { stripeRefundId: refund.id },
      });
    } catch (err) {
      // El alumno pagó un horario que ya no existe y el reembolso automático
      // falló: hay que reembolsar a mano. Queda visible en /admin/profesores.
      reportControlFailure('class_booking', 'degraded', err, { classSessionId, paymentIntentId });
    }
  },
};
