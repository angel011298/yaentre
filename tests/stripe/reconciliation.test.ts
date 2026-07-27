import { describe, expect, it } from 'vitest';
import type Stripe from 'stripe';
import type { BillingStore, CheckoutActivation, ApplyResult } from '@/lib/stripe/webhook';
import { reconcileCheckoutSession } from '@/lib/stripe/reconciliation';

/**
 * Tests del job de reconciliación (F22). Mismo criterio que
 * tests/stripe/webhook.test.ts: un `BillingStore` en memoria que registra
 * qué se llamó, sin tocar la DB — la reconciliación reusa el store real de
 * producción, así que estos tests solo verifican el ENRUTAMIENTO
 * (qué método del store se invoca según el estado de la sesión de Stripe),
 * no la lógica de activación en sí (ya cubierta por webhook.test.ts).
 */

class SpyBillingStore implements BillingStore {
  activateCalls: { eventId: string; eventType: string; activation: CheckoutActivation }[] = [];
  failCalls: { eventId: string; eventType: string; checkoutSessionId: string }[] = [];
  pendingCalls: { eventId: string; eventType: string; activation: CheckoutActivation }[] = [];
  cancelCalls: { eventId: string; eventType: string; stripeSubscriptionId: string }[] = [];

  async activateFromCheckout(
    eventId: string,
    eventType: string,
    activation: CheckoutActivation
  ): Promise<ApplyResult> {
    this.activateCalls.push({ eventId, eventType, activation });
    return 'applied';
  }

  async recordPendingAsyncPayment(
    eventId: string,
    eventType: string,
    activation: CheckoutActivation
  ): Promise<ApplyResult> {
    this.pendingCalls.push({ eventId, eventType, activation });
    return 'applied';
  }

  async failCheckout(eventId: string, eventType: string, checkoutSessionId: string): Promise<ApplyResult> {
    this.failCalls.push({ eventId, eventType, checkoutSessionId });
    return 'applied';
  }

  async cancelBySubscriptionId(
    eventId: string,
    eventType: string,
    stripeSubscriptionId: string
  ): Promise<ApplyResult> {
    this.cancelCalls.push({ eventId, eventType, stripeSubscriptionId });
    return 'applied';
  }
}

function fakeSession(overrides: Partial<Stripe.Checkout.Session>): Stripe.Checkout.Session {
  return {
    id: 'cs_test_123',
    payment_status: 'unpaid',
    status: 'open',
    payment_intent: null,
    customer: null,
    subscription: null,
    payment_method_types: ['card'],
    amount_total: 10000,
    ...overrides,
  } as Stripe.Checkout.Session;
}

describe('reconcileCheckoutSession', () => {
  it('activa el acceso si Stripe confirma que la sesión ya se pagó (webhook nunca llegó)', async () => {
    const store = new SpyBillingStore();
    const session = fakeSession({ id: 'cs_paid', payment_status: 'paid' });

    const outcome = await reconcileCheckoutSession(session, store);

    expect(outcome).toEqual({ action: 'activated', checkoutSessionId: 'cs_paid' });
    expect(store.activateCalls).toHaveLength(1);
    expect(store.activateCalls[0].activation.checkoutSessionId).toBe('cs_paid');
    // El eventId sintético nunca debe parecer un event.id real de Stripe.
    expect(store.activateCalls[0].eventId).toMatch(/^reconcile:cs_paid:\d+$/);
    expect(store.failCalls).toHaveLength(0);
  });

  it('marca FAILED una sesión de Stripe expirada — deja de esperarla', async () => {
    const store = new SpyBillingStore();
    const session = fakeSession({ id: 'cs_expired', payment_status: 'unpaid', status: 'expired' });

    const outcome = await reconcileCheckoutSession(session, store);

    expect(outcome).toEqual({ action: 'expired', checkoutSessionId: 'cs_expired' });
    expect(store.failCalls).toHaveLength(1);
    expect(store.failCalls[0].checkoutSessionId).toBe('cs_expired');
    expect(store.activateCalls).toHaveLength(0);
  });

  it('no toca nada si Stripe todavía la reporta como pendiente (voucher OXXO/SPEI vigente)', async () => {
    const store = new SpyBillingStore();
    const session = fakeSession({ id: 'cs_still_pending', payment_status: 'unpaid', status: 'open' });

    const outcome = await reconcileCheckoutSession(session, store);

    expect(outcome).toEqual({ action: 'still_pending', checkoutSessionId: 'cs_still_pending' });
    expect(store.activateCalls).toHaveLength(0);
    expect(store.failCalls).toHaveLength(0);
    expect(store.pendingCalls).toHaveLength(0);
  });

  it('genera un eventId sintético distinto por cada llamada (nunca colisiona con un event.id real de Stripe)', async () => {
    const store = new SpyBillingStore();
    const session = fakeSession({ id: 'cs_paid_twice', payment_status: 'paid' });

    await reconcileCheckoutSession(session, store);
    await new Promise((r) => setTimeout(r, 2));
    await reconcileCheckoutSession(session, store);

    expect(store.activateCalls).toHaveLength(2);
    expect(store.activateCalls[0].eventId).not.toBe(store.activateCalls[1].eventId);
    // Ninguno de los dos debe tener forma de event.id real de Stripe (evt_...).
    for (const call of store.activateCalls) {
      expect(call.eventId.startsWith('evt_')).toBe(false);
    }
  });
});
