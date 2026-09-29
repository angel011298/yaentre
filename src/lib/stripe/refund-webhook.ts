import type Stripe from 'stripe';
import { prisma } from '@/lib/db/prisma';
import { runIdempotent } from '@/lib/db/billing';
import { recordRefundsForPaymentIntent, type RecordedRefunds, type StripeRefundLite } from '@/lib/db/refunds';
import { reverseSaleForSubscription } from '@/lib/db/referrals';
import { reportControlFailure } from '@/lib/observability/report';

/**
 * REEMBOLSOS QUE LLEGAN DE STRIPE — Bloque 3.
 *
 * Un reembolso puede nacer en tres sitios: la acción de soporte, el panel de
 * Stripe (a mano, sin pasar por esta app) o Stripe mismo (una disputa perdida).
 * El webhook `charge.refunded` y la reconciliación diaria son la única forma de
 * enterarse de los dos últimos. Sin ellos, el tablero fiscal seguiría contando
 * como ingreso un dinero que ya se devolvió, y una venta de referido de esa
 * compra se acreditaría igual.
 *
 * ── Lo que NO hace, a propósito ────────────────────────────────────────────
 *
 * NO da de baja el plan de un reembolso emitido desde el panel de Stripe. Quitarle
 * el acceso a una persona por un evento externo, sin ojos humanos, es una decisión
 * de la que no hay vuelta cómoda (el alumno puede estar a días de su examen). Lo
 * que hace es dejar el evento en Sentry (`refund_reconciliation`) para que alguien
 * decida: el silencio sería regalar el plan sin saberlo (G73b).
 */

export function stripeListRefunds(stripe: Stripe): (paymentIntentId: string) => Promise<StripeRefundLite[]> {
  return async (paymentIntentId) => {
    const out: StripeRefundLite[] = [];
    for await (const r of stripe.refunds.list({ payment_intent: paymentIntentId, limit: 100 })) {
      out.push(toLite(r));
      if (out.length >= 500) break; // un solo pago no tiene 500 reembolsos; tope contra un bucle
    }
    return out;
  };
}

export function toLite(r: Stripe.Refund): StripeRefundLite {
  return {
    id: r.id,
    amount: r.amount,
    created: r.created,
    status: r.status,
    reason: r.reason ?? null,
    origin: r.metadata?.origin ?? null,
  };
}

export type RefundWebhookResult =
  | { status: 'duplicate'; type: string }
  | { status: 'ignored'; type: string; reason: 'no_payment_intent' | 'not_a_plan_payment' }
  | { status: 'handled'; type: string; inserted: number; refundedCents: number };

/**
 * Consecuencias de que ya haya dinero devuelto, DESPUÉS del commit y sin poder
 * lanzar (el reembolso ya es un hecho y el webhook no puede volverse un 500 por
 * esto). Cada paso reporta su propio fallo.
 */
export async function applyRefundConsequences(recorded: RecordedRefunds): Promise<void> {
  if (!recorded.paymentId || !recorded.subscriptionId || recorded.refundedCents <= 0) return;

  // 1. La venta de referido de esta compra ya no tiene sustento (cualquier monto reembolsado).
  try {
    await reverseSaleForSubscription(recorded.subscriptionId, 'refund');
  } catch (err) {
    reportControlFailure('refund_reconciliation', 'degraded', err, {
      stage: 'reverse_referral',
      subscriptionId: recorded.subscriptionId,
    });
  }

  // 2. Reembolso TOTAL de un plan que sigue ACTIVO y que NO gestionó soporte.
  if (recorded.refundedCents >= recorded.paymentAmountCents && !recorded.anyFromSupport) {
    try {
      const sub = await prisma.subscription.findUnique({
        where: { id: recorded.subscriptionId },
        select: { status: true },
      });
      if (sub?.status === 'ACTIVE') {
        reportControlFailure(
          'refund_reconciliation',
          'degraded',
          new Error('Reembolso TOTAL emitido fuera de la app sobre un plan ACTIVO: el acceso NO se revocó'),
          { subscriptionId: recorded.subscriptionId, refundedCents: recorded.refundedCents }
        );
      }
    } catch (err) {
      reportControlFailure('refund_reconciliation', 'degraded', err, {
        stage: 'check_active',
        subscriptionId: recorded.subscriptionId,
      });
    }
  }
}

export async function handleChargeRefunded(
  event: Stripe.Event,
  deps: { listRefunds: (paymentIntentId: string) => Promise<StripeRefundLite[]> }
): Promise<RefundWebhookResult> {
  const charge = event.data.object as Stripe.Charge;
  const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id ?? null;
  if (!pi) return { status: 'ignored', type: event.type, reason: 'no_payment_intent' };

  // La lista de reembolsos se pide ANTES de abrir la transacción: no se mantiene
  // una transacción de base abierta durante una llamada de red.
  const refunds = await deps.listRefunds(pi);

  const holder: { recorded: RecordedRefunds | null } = { recorded: null };
  const result = await runIdempotent(event.id, event.type, async (tx) => {
    holder.recorded = await recordRefundsForPaymentIntent(tx, pi, refunds, 'WEBHOOK');
  });
  if (result === 'duplicate') return { status: 'duplicate', type: event.type };

  const recorded = holder.recorded;
  if (!recorded || !recorded.paymentId) return { status: 'ignored', type: event.type, reason: 'not_a_plan_payment' };

  await applyRefundConsequences(recorded);
  return { status: 'handled', type: event.type, inserted: recorded.inserted, refundedCents: recorded.refundedCents };
}

export interface RefundReconciliationSummary {
  examined: number;
  inserted: number;
}

/**
 * Red de seguridad diaria: revisa los reembolsos de los últimos 3 días en Stripe y
 * escribe los que el webhook no dejó (endpoint sin suscribir a `charge.refunded`,
 * caída del endpoint, reintentos agotados). Idempotente por `stripeRefundId`.
 */
export async function reconcileRecentRefunds(stripe: Stripe, now: Date): Promise<RefundReconciliationSummary> {
  const since = Math.floor(now.getTime() / 1000) - 3 * 24 * 60 * 60;
  const byPaymentIntent = new Map<string, StripeRefundLite[]>();
  let examined = 0;

  for await (const r of stripe.refunds.list({ created: { gte: since }, limit: 100 })) {
    examined++;
    const pi = typeof r.payment_intent === 'string' ? r.payment_intent : r.payment_intent?.id ?? null;
    if (pi) byPaymentIntent.set(pi, [...(byPaymentIntent.get(pi) ?? []), toLite(r)]);
    if (examined >= 1000) break;
  }

  let inserted = 0;
  for (const [pi, refunds] of byPaymentIntent) {
    const recorded = await recordRefundsForPaymentIntent(prisma, pi, refunds, 'RECONCILIATION');
    inserted += recorded.inserted;
    // Solo si esta corrida escribió algo: es lo que el webhook no alcanzó a procesar.
    if (recorded.inserted > 0) await applyRefundConsequences(recorded);
  }
  return { examined, inserted };
}
