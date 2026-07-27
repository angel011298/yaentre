import type Stripe from 'stripe';
import { extractCheckoutActivation, type BillingStore } from './webhook';

/**
 * Reconciliación de pagos (F22 — edge case documentado desde F8: "Webhook
 * nunca llega → Job de reconciliación consulta Stripe; alerta a soporte",
 * Flujo_App §15.1). Cubre el caso en que el webhook de Stripe nunca llegó
 * (Stripe reintenta con backoff pero puede agotarse, o el endpoint estuvo
 * caído) y una `Subscription` se quedó PENDING para siempre aunque el
 * cliente sí haya pagado.
 *
 * Reusa el MISMO `BillingStore` que el webhook real (`src/lib/stripe/
 * webhook.ts`) — cero lógica de activación duplicada. La única diferencia:
 * en vez de recibir un `Stripe.Event` ya verificado por firma HMAC, este
 * módulo recibe una `Stripe.Checkout.Session` ya obtenida por polling activo
 * (`stripe.checkout.sessions.retrieve`, autenticado con `STRIPE_SECRET_KEY`
 * server-side — la autenticidad viene de la llamada API, no de una firma).
 *
 * Idempotencia: cada llamada genera su propio `eventId` sintético
 * (`reconcile:<sessionId>:<timestamp>`) para la tabla `processed_stripe_events`
 * — sin colisionar nunca con un `event.id` real de Stripe (formato `evt_...`).
 * La guarda REAL contra doble activación es `activateFromCheckout` revisando
 * `sub.status === 'ACTIVE'` antes de mutar (ver billing.ts) — el eventId
 * sintético solo satisface el mismo mecanismo transaccional que ya usa el
 * webhook, no es la única defensa.
 */

export type ReconcileOutcome =
  | { action: 'activated'; checkoutSessionId: string }
  | { action: 'still_pending'; checkoutSessionId: string }
  | { action: 'expired'; checkoutSessionId: string };

function syntheticEventId(checkoutSessionId: string): string {
  return `reconcile:${checkoutSessionId}:${Date.now()}`;
}

/**
 * Decide y aplica la acción para UNA sesión de Stripe ya obtenida por
 * polling. Reglas:
 * - `payment_status === 'paid'` → el pago sí se completó del lado de Stripe
 *   pero el webhook nunca lo reflejó aquí → activar ahora (mismo camino que
 *   `checkout.session.async_payment_succeeded`/`completed` con tarjeta).
 * - Sesión de Stripe expirada (`status === 'expired'`) → no va a pagarse
 *   nunca; se marca FAILED igual que `async_payment_failed` para dejar de
 *   esperarla.
 * - Cualquier otro caso (todavía sin pagar, voucher OXXO/SPEI aún vigente)
 *   → `still_pending`, se reintentará en la siguiente corrida.
 */
export async function reconcileCheckoutSession(
  session: Stripe.Checkout.Session,
  store: BillingStore
): Promise<ReconcileOutcome> {
  if (session.payment_status === 'paid') {
    const activation = extractCheckoutActivation(session, true);
    await store.activateFromCheckout(
      syntheticEventId(session.id),
      'reconciliation.activated',
      activation
    );
    return { action: 'activated', checkoutSessionId: session.id };
  }

  if (session.status === 'expired') {
    await store.failCheckout(
      syntheticEventId(session.id),
      'reconciliation.expired',
      session.id
    );
    return { action: 'expired', checkoutSessionId: session.id };
  }

  return { action: 'still_pending', checkoutSessionId: session.id };
}
