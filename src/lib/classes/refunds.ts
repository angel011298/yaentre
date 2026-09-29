import type Stripe from 'stripe';
import { prisma } from '@/lib/db/prisma';
import { reportControlFailure } from '@/lib/observability/report';

/**
 * REEMBOLSO DE UNA CLASE — Bloque 2 (spec §6.7). Es DINERO que sale hacia un
 * alumno (a veces un menor), así que las reglas son estrictas:
 *
 *  · La deuda vive en la fila: `refundDueCents` (lo que se debe) y
 *    `refundedCents` (lo ya devuelto). Pendiente = deuda − devuelto. Cancelar
 *    una clase escribe la deuda; ESTE módulo la salda. Separarlo hace que un
 *    fallo de Stripe no revierta la cancelación ni pierda lo que se le debe al
 *    alumno: el job del ciclo de vida reintenta hasta que quede en cero.
 *
 *  · IDEMPOTENTE. La clave de idempotencia de Stripe incluye lo ya devuelto y lo
 *    pendiente: repetir exactamente el mismo intento (un reintento del job, un
 *    doble clic) devuelve el MISMO reembolso, no otro. Sin ella, un timeout
 *    entre «Stripe aceptó» y «lo anotamos» duplicaría el reembolso.
 *
 *  · Un fallo NO es silencioso: deja un evento en Sentry (`payment_consistency`).
 *    Es un alumno al que se le debe dinero y nadie lo ve en el flujo normal.
 */

export type RefundResult =
  | { status: 'refunded'; amountCents: number }
  | { status: 'nothing_due' }
  | { status: 'no_payment' }
  | { status: 'failed' };

/** Subconjunto de Stripe que este módulo usa: permite probarlo con un doble. */
export type RefundStripe = { refunds: Pick<Stripe['refunds'], 'create'> };

function isAlreadyRefunded(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'charge_already_refunded';
}

export async function refundClassIfDue(classId: string, stripe: RefundStripe): Promise<RefundResult> {
  const c = await prisma.classSession.findUnique({
    where: { id: classId },
    select: { id: true, stripePaymentId: true, refundDueCents: true, refundedCents: true },
  });
  if (!c) return { status: 'nothing_due' };

  const pending = c.refundDueCents - c.refundedCents;
  if (pending <= 0) return { status: 'nothing_due' };

  if (!c.stripePaymentId) {
    // Se debe dinero pero no hay cobro al que aplicarlo: los datos son
    // incoherentes y un humano tiene que mirarlo.
    reportControlFailure(
      'payment_consistency',
      'degraded',
      new Error('Reembolso pendiente sin PaymentIntent asociado'),
      { classId, pendingCents: pending }
    );
    return { status: 'no_payment' };
  }

  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: c.stripePaymentId,
        amount: pending,
        metadata: { type: 'class_refund', classSessionId: c.id },
      },
      { idempotencyKey: `class-refund:${c.id}:${c.refundedCents}:${pending}` }
    );

    // Condicionado a que `refundedCents` siga siendo lo que leímos: si otro
    // proceso ya lo movió, no se suma dos veces (Stripe ya devolvió una sola vez
    // por la clave de idempotencia).
    await prisma.classSession.updateMany({
      where: { id: c.id, refundedCents: c.refundedCents },
      data: { refundedCents: c.refundedCents + pending, stripeRefundId: refund.id },
    });
    return { status: 'refunded', amountCents: pending };
  } catch (err) {
    if (isAlreadyRefunded(err)) {
      // Alguien (p. ej. el admin desde el panel de Stripe) ya lo devolvió: la
      // deuda está saldada, y reintentar para siempre no aporta nada.
      await prisma.classSession.updateMany({
        where: { id: c.id, refundedCents: c.refundedCents },
        data: { refundedCents: c.refundDueCents },
      });
      return { status: 'refunded', amountCents: 0 };
    }
    reportControlFailure('payment_consistency', 'degraded', err, {
      classId: c.id,
      stage: 'class_refund',
      pendingCents: pending,
    });
    return { status: 'failed' };
  }
}
