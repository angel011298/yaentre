import { describe, expect, it } from 'vitest';
import type Stripe from 'stripe';
import type { PaymentMethod, PricingSeason, SubscriptionPlan } from '@prisma/client';
import {
  extractCheckoutActivation,
  handleStripeEvent,
  resolvePaymentMethod,
  type ApplyResult,
  type BillingStore,
  type CheckoutActivation,
} from '@/lib/stripe/webhook';
import { computeExpiresAt } from '@/lib/stripe/expiry';
import {
  currentSeason,
  degradeIfEarlyBirdExhausted,
  EARLY_BIRD_LICENSE_LIMIT,
  getPlanPricing,
  stripePriceEnvVar,
} from '@/lib/stripe/pricing';

/**
 * Tests de integración del webhook con el SDK de Stripe MOCKEADO (eventos
 * construidos a mano) y un `BillingStore` en memoria que reproduce fielmente la
 * semántica del store real (billing.ts): registra el `event.id` como PRIMERA
 * operación de la «transacción»; si ya estaba, la mutación es un no-op
 * ('duplicate'). Así los 4 casos exigidos por F8 se prueban sin tocar la DB.
 */

interface FakeSubscription {
  checkoutSessionId: string;
  plan: SubscriptionPlan;
  season: PricingSeason;
  status: 'PENDING' | 'ACTIVE' | 'FAILED' | 'CANCELED';
  stripeSubscriptionId: string | null;
  examDate: Date | null;
  startedAt: Date | null;
  expiresAt: Date | null;
  payments: Array<{
    method: PaymentMethod;
    status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
    amountMxn: number;
    paymentIntentId: string | null;
  }>;
}

/** Store en memoria: misma semántica atómica/idempotente que billing.ts. */
class FakeBillingStore implements BillingStore {
  private processedEvents = new Set<string>();
  private subs = new Map<string, FakeSubscription>();
  activateCount = 0;

  seedPending(input: {
    checkoutSessionId: string;
    plan: SubscriptionPlan;
    season: PricingSeason;
    stripeSubscriptionId?: string | null;
    examDate?: Date | null;
  }): void {
    this.subs.set(input.checkoutSessionId, {
      checkoutSessionId: input.checkoutSessionId,
      plan: input.plan,
      season: input.season,
      status: 'PENDING',
      stripeSubscriptionId: input.stripeSubscriptionId ?? null,
      examDate: input.examDate ?? null,
      startedAt: null,
      expiresAt: null,
      payments: [],
    });
  }

  get(checkoutSessionId: string): FakeSubscription | undefined {
    return this.subs.get(checkoutSessionId);
  }

  /** Modela «INSERT del event.id como primera sentencia de la transacción». */
  private recordOrDuplicate(eventId: string): boolean {
    if (this.processedEvents.has(eventId)) return false;
    this.processedEvents.add(eventId);
    return true;
  }

  private upsertPayment(sub: FakeSubscription, a: CheckoutActivation, status: 'PENDING' | 'SUCCEEDED' | 'FAILED') {
    const amountMxn = a.amountMxn ?? getPlanPricing(sub.plan, sub.season).amountMxn;
    const existing = a.paymentIntentId
      ? sub.payments.find((p) => p.paymentIntentId === a.paymentIntentId)
      : undefined;
    if (existing) {
      existing.status = status;
      existing.method = a.method;
    } else {
      sub.payments.push({ method: a.method, status, amountMxn, paymentIntentId: a.paymentIntentId });
    }
  }

  async activateFromCheckout(
    eventId: string,
    _eventType: string,
    a: CheckoutActivation
  ): Promise<ApplyResult> {
    if (!this.recordOrDuplicate(eventId)) return 'duplicate';
    const sub = this.subs.get(a.checkoutSessionId);
    if (!sub) throw new Error('subscription no encontrada');
    if (sub.status === 'ACTIVE') return 'applied';

    this.activateCount += 1;
    const now = new Date();
    sub.status = 'ACTIVE';
    sub.startedAt = now;
    sub.expiresAt = computeExpiresAt(sub.plan, sub.examDate, now);
    if (a.stripeSubscriptionId) sub.stripeSubscriptionId = a.stripeSubscriptionId;
    this.upsertPayment(sub, a, 'SUCCEEDED');
    return 'applied';
  }

  async recordPendingAsyncPayment(
    eventId: string,
    _eventType: string,
    a: CheckoutActivation
  ): Promise<ApplyResult> {
    if (!this.recordOrDuplicate(eventId)) return 'duplicate';
    const sub = this.subs.get(a.checkoutSessionId);
    if (!sub) throw new Error('subscription no encontrada');
    if (sub.status === 'ACTIVE') return 'applied';
    this.upsertPayment(sub, a, 'PENDING');
    return 'applied';
  }

  async failCheckout(
    eventId: string,
    _eventType: string,
    checkoutSessionId: string
  ): Promise<ApplyResult> {
    if (!this.recordOrDuplicate(eventId)) return 'duplicate';
    const sub = this.subs.get(checkoutSessionId);
    if (!sub || sub.status === 'ACTIVE') return 'applied';
    sub.status = 'FAILED';
    sub.payments.forEach((p) => {
      if (p.status === 'PENDING') p.status = 'FAILED';
    });
    return 'applied';
  }

  async cancelBySubscriptionId(
    eventId: string,
    _eventType: string,
    stripeSubscriptionId: string
  ): Promise<ApplyResult> {
    if (!this.recordOrDuplicate(eventId)) return 'duplicate';
    for (const sub of this.subs.values()) {
      if (sub.stripeSubscriptionId === stripeSubscriptionId) {
        sub.status = 'CANCELED';
        return 'applied';
      }
    }
    return 'applied';
  }
}

// ── Fábricas de objetos Stripe mockeados ──

function makeSession(overrides: Partial<Stripe.Checkout.Session>): Stripe.Checkout.Session {
  return {
    id: 'cs_test_1',
    object: 'checkout.session',
    payment_status: 'paid',
    payment_intent: 'pi_1',
    customer: 'cus_1',
    subscription: null,
    payment_method_types: ['card'],
    amount_total: 49900,
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

function makeEvent(
  id: string,
  type: Stripe.Event['type'],
  object: unknown
): Stripe.Event {
  return { id, type, data: { object } } as unknown as Stripe.Event;
}

const CHECKOUT_ID = 'cs_test_1';

describe('handleStripeEvent — Caso 1: pago con tarjeta exitoso', () => {
  it('checkout.session.completed (paid) activa la suscripción y registra Payment SUCCEEDED CARD', async () => {
    const store = new FakeBillingStore();
    store.seedPending({ checkoutSessionId: CHECKOUT_ID, plan: 'SEASON_PASS', season: 'EARLY_BIRD' });

    const event = makeEvent(
      'evt_card_1',
      'checkout.session.completed',
      makeSession({ payment_status: 'paid', payment_method_types: ['card'], payment_intent: 'pi_card' })
    );

    const result = await handleStripeEvent(event, store);

    expect(result).toEqual({ status: 'handled', type: 'checkout.session.completed', action: 'activated' });
    const sub = store.get(CHECKOUT_ID)!;
    expect(sub.status).toBe('ACTIVE');
    expect(sub.startedAt).not.toBeNull();
    expect(sub.payments).toHaveLength(1);
    expect(sub.payments[0]).toMatchObject({ method: 'CARD', status: 'SUCCEEDED' });
  });
});

describe('handleStripeEvent — Caso 2: OXXO pendiente → confirmado', () => {
  it('completed (unpaid, oxxo) deja PENDING; async_payment_succeeded activa y marca el Payment SUCCEEDED', async () => {
    const store = new FakeBillingStore();
    store.seedPending({ checkoutSessionId: CHECKOUT_ID, plan: 'PREMIUM', season: 'HIGH_SEASON' });

    // 1) Voucher generado: el pago aún no se confirma → NO activa.
    const pending = makeEvent(
      'evt_oxxo_pending',
      'checkout.session.completed',
      makeSession({
        payment_status: 'unpaid',
        payment_method_types: ['oxxo'],
        payment_intent: 'pi_oxxo',
      })
    );
    const r1 = await handleStripeEvent(pending, store);
    expect(r1).toMatchObject({ status: 'handled', action: 'pending' });

    let sub = store.get(CHECKOUT_ID)!;
    expect(sub.status).toBe('PENDING'); // sin acceso hasta confirmar
    expect(sub.payments).toHaveLength(1);
    expect(sub.payments[0]).toMatchObject({ method: 'OXXO', status: 'PENDING' });

    // 2) Confirmación asíncrona: aquí payment_status ya es 'paid' pero NO es tarjeta.
    const succeeded = makeEvent(
      'evt_oxxo_succeeded',
      'checkout.session.async_payment_succeeded',
      makeSession({
        payment_status: 'paid',
        payment_method_types: ['oxxo'],
        payment_intent: 'pi_oxxo',
      })
    );
    const r2 = await handleStripeEvent(succeeded, store);
    expect(r2).toMatchObject({ status: 'handled', action: 'activated' });

    sub = store.get(CHECKOUT_ID)!;
    expect(sub.status).toBe('ACTIVE');
    // El mismo Payment (mismo paymentIntentId) pasó de PENDING a SUCCEEDED, no se duplicó.
    expect(sub.payments).toHaveLength(1);
    expect(sub.payments[0]).toMatchObject({ method: 'OXXO', status: 'SUCCEEDED' });
    expect(store.activateCount).toBe(1);
  });
});

describe('handleStripeEvent — Caso 3: pago fallido', () => {
  it('async_payment_failed marca la suscripción FAILED y el Payment pendiente FAILED', async () => {
    const store = new FakeBillingStore();
    store.seedPending({ checkoutSessionId: CHECKOUT_ID, plan: 'PREMIUM', season: 'LAST_MINUTE' });

    // Primero el voucher (pending), luego el fallo.
    await handleStripeEvent(
      makeEvent(
        'evt_spei_pending',
        'checkout.session.completed',
        makeSession({
          payment_status: 'unpaid',
          payment_method_types: ['customer_balance'],
          payment_intent: 'pi_spei',
        })
      ),
      store
    );

    const failed = makeEvent(
      'evt_spei_failed',
      'checkout.session.async_payment_failed',
      makeSession({ payment_status: 'unpaid', payment_method_types: ['customer_balance'] })
    );
    const result = await handleStripeEvent(failed, store);

    expect(result).toMatchObject({ status: 'handled', action: 'failed' });
    const sub = store.get(CHECKOUT_ID)!;
    expect(sub.status).toBe('FAILED');
    expect(sub.payments[0]).toMatchObject({ method: 'SPEI', status: 'FAILED' });
  });
});

describe('handleStripeEvent — Caso 4: evento duplicado NO reactiva', () => {
  it('el mismo event.id entregado dos veces se procesa una sola vez', async () => {
    const store = new FakeBillingStore();
    store.seedPending({ checkoutSessionId: CHECKOUT_ID, plan: 'MONTHLY', season: 'EARLY_BIRD' });

    const event = makeEvent(
      'evt_dup',
      'checkout.session.completed',
      makeSession({ payment_status: 'paid', payment_method_types: ['card'], payment_intent: 'pi_dup' })
    );

    const first = await handleStripeEvent(event, store);
    const second = await handleStripeEvent(event, store);

    expect(first).toMatchObject({ status: 'handled', action: 'activated' });
    expect(second).toEqual({ status: 'duplicate', type: 'checkout.session.completed' });

    const sub = store.get(CHECKOUT_ID)!;
    expect(sub.status).toBe('ACTIVE');
    expect(store.activateCount).toBe(1); // activó UNA sola vez
    expect(sub.payments).toHaveLength(1); // no duplicó el Payment
  });
});

describe('handleStripeEvent — cancelación y eventos ignorados', () => {
  it('customer.subscription.deleted cancela la suscripción por su stripeSubscriptionId', async () => {
    const store = new FakeBillingStore();
    store.seedPending({
      checkoutSessionId: CHECKOUT_ID,
      plan: 'MONTHLY',
      season: 'EARLY_BIRD',
      stripeSubscriptionId: 'sub_123',
    });
    // Activar primero (mensual con suscripción de Stripe).
    await handleStripeEvent(
      makeEvent(
        'evt_sub_active',
        'checkout.session.completed',
        makeSession({
          payment_status: 'paid',
          payment_method_types: ['card'],
          subscription: 'sub_123',
        })
      ),
      store
    );
    expect(store.get(CHECKOUT_ID)!.status).toBe('ACTIVE');

    const deleted = makeEvent('evt_sub_deleted', 'customer.subscription.deleted', { id: 'sub_123' });
    const result = await handleStripeEvent(deleted, store);

    expect(result).toMatchObject({ status: 'handled', action: 'canceled' });
    expect(store.get(CHECKOUT_ID)!.status).toBe('CANCELED');
  });

  it('un evento no relevante se ignora sin tocar el store', async () => {
    const store = new FakeBillingStore();
    const ignored = makeEvent('evt_ping', 'payment_intent.created', { id: 'pi_x' });
    const result = await handleStripeEvent(ignored, store);
    expect(result).toEqual({ status: 'ignored', type: 'payment_intent.created' });
  });
});

// ── Funciones puras de apoyo ──

describe('resolvePaymentMethod', () => {
  it('paid sin forzar async ⇒ CARD', () => {
    expect(resolvePaymentMethod(makeSession({ payment_status: 'paid' }))).toBe('CARD');
  });

  it('unpaid con oxxo ⇒ OXXO', () => {
    expect(
      resolvePaymentMethod(makeSession({ payment_status: 'unpaid', payment_method_types: ['oxxo'] }))
    ).toBe('OXXO');
  });

  it('paid pero forceAsync (confirmación OXXO) ⇒ NO CARD', () => {
    const session = makeSession({ payment_status: 'paid', payment_method_types: ['oxxo'] });
    expect(resolvePaymentMethod(session, true)).toBe('OXXO');
  });

  it('customer_balance ⇒ SPEI', () => {
    const session = makeSession({
      payment_status: 'unpaid',
      payment_method_types: ['customer_balance'],
    });
    expect(resolvePaymentMethod(session)).toBe('SPEI');
  });
});

describe('extractCheckoutActivation', () => {
  it('extrae ids de campos string u objeto', () => {
    const a = extractCheckoutActivation(
      makeSession({ payment_intent: 'pi_9', customer: 'cus_9', subscription: 'sub_9' })
    );
    expect(a).toMatchObject({
      checkoutSessionId: 'cs_test_1',
      paymentIntentId: 'pi_9',
      stripeCustomerId: 'cus_9',
      stripeSubscriptionId: 'sub_9',
      method: 'CARD',
      amountMxn: 49900,
    });
  });
});

describe('pricing — matriz de precios (PRD §9)', () => {
  it('valores de referencia en centavos por plan y temporada', () => {
    expect(getPlanPricing('MONTHLY', 'EARLY_BIRD').amountMxn).toBe(9900);
    expect(getPlanPricing('SEASON_PASS', 'EARLY_BIRD').amountMxn).toBe(49900);
    expect(getPlanPricing('PREMIUM', 'EARLY_BIRD').amountMxn).toBe(89900);
    expect(getPlanPricing('MONTHLY', 'HIGH_SEASON').amountMxn).toBe(14900);
    expect(getPlanPricing('SEASON_PASS', 'HIGH_SEASON').amountMxn).toBe(79900);
    expect(getPlanPricing('PREMIUM', 'HIGH_SEASON').amountMxn).toBe(129900);
    expect(getPlanPricing('MONTHLY', 'LAST_MINUTE').amountMxn).toBe(19900);
    expect(getPlanPricing('SEASON_PASS', 'LAST_MINUTE').amountMxn).toBe(99900);
    expect(getPlanPricing('PREMIUM', 'LAST_MINUTE').amountMxn).toBe(149900);
  });

  it('MONTHLY es recurrente (subscription); pase y premium son pago único', () => {
    expect(getPlanPricing('MONTHLY', 'EARLY_BIRD')).toMatchObject({ mode: 'subscription', isRecurring: true });
    expect(getPlanPricing('SEASON_PASS', 'EARLY_BIRD')).toMatchObject({ mode: 'payment', isRecurring: false });
    expect(getPlanPricing('PREMIUM', 'EARLY_BIRD')).toMatchObject({ mode: 'payment', hasGuarantee: true });
  });

  it('currentSeason es monotónica por fecha de corte', () => {
    expect(currentSeason(new Date('2026-10-15T00:00:00Z'))).toBe('EARLY_BIRD');
    expect(currentSeason(new Date('2026-12-20T00:00:00Z'))).toBe('EARLY_BIRD'); // pre-launch
    expect(currentSeason(new Date('2027-02-01T00:00:00Z'))).toBe('HIGH_SEASON');
    expect(currentSeason(new Date('2027-05-10T00:00:00Z'))).toBe('LAST_MINUTE');
  });
});

describe('expiry — vigencia por plan', () => {
  it('MONTHLY no calcula expiración (la maneja Stripe)', () => {
    expect(computeExpiresAt('MONTHLY', new Date('2027-06-01'), new Date('2027-01-01'))).toBeNull();
  });

  it('SEASON_PASS/PREMIUM expiran el día del examen objetivo', () => {
    const examDate = new Date('2027-06-01T00:00:00Z');
    expect(computeExpiresAt('SEASON_PASS', examDate, new Date('2027-01-01'))).toEqual(examDate);
    expect(computeExpiresAt('PREMIUM', examDate, new Date('2027-01-01'))).toEqual(examDate);
  });

  it('sin fecha de examen, usa el respaldo de 150 días desde la activación', () => {
    const now = new Date('2027-01-01T00:00:00Z');
    const result = computeExpiresAt('SEASON_PASS', null, now);
    expect(result).not.toBeNull();
    const days = Math.round((result!.getTime() - now.getTime()) / (24 * 3600 * 1000));
    expect(days).toBe(150);
  });
});

describe('degradeIfEarlyBirdExhausted — F9 Task 4: fallback al agotar el cupo', () => {
  it('con licencias disponibles, se mantiene en Early Bird', () => {
    expect(degradeIfEarlyBirdExhausted('EARLY_BIRD', 1)).toBe('EARLY_BIRD');
    expect(degradeIfEarlyBirdExhausted('EARLY_BIRD', EARLY_BIRD_LICENSE_LIMIT)).toBe('EARLY_BIRD');
  });

  it('con 0 licencias restantes, cae a Temporada Alta', () => {
    expect(degradeIfEarlyBirdExhausted('EARLY_BIRD', 0)).toBe('HIGH_SEASON');
  });

  it('nunca degrada si la fecha ya no era Early Bird de por sí', () => {
    expect(degradeIfEarlyBirdExhausted('HIGH_SEASON', 0)).toBe('HIGH_SEASON');
    expect(degradeIfEarlyBirdExhausted('LAST_MINUTE', 0)).toBe('LAST_MINUTE');
  });

  it('el cupo documentado es exactamente 500 (PRD §9: max_redemptions)', () => {
    expect(EARLY_BIRD_LICENSE_LIMIT).toBe(500);
  });
});

describe('stripePriceEnvVar — nombres de variable exactos del PRD §9', () => {
  it('mapea plan y temporada a STRIPE_PRICE_<PLAN>_<TEMPORADA>', () => {
    expect(stripePriceEnvVar('MONTHLY', 'EARLY_BIRD')).toBe('STRIPE_PRICE_MENSUAL_EB');
    expect(stripePriceEnvVar('MONTHLY', 'HIGH_SEASON')).toBe('STRIPE_PRICE_MENSUAL_REG');
    expect(stripePriceEnvVar('MONTHLY', 'LAST_MINUTE')).toBe('STRIPE_PRICE_MENSUAL_LM');
    expect(stripePriceEnvVar('SEASON_PASS', 'EARLY_BIRD')).toBe('STRIPE_PRICE_PASE_EB');
    expect(stripePriceEnvVar('SEASON_PASS', 'HIGH_SEASON')).toBe('STRIPE_PRICE_PASE_REG');
    expect(stripePriceEnvVar('SEASON_PASS', 'LAST_MINUTE')).toBe('STRIPE_PRICE_PASE_LM');
    expect(stripePriceEnvVar('PREMIUM', 'EARLY_BIRD')).toBe('STRIPE_PRICE_PREMIUM_EB');
    expect(stripePriceEnvVar('PREMIUM', 'HIGH_SEASON')).toBe('STRIPE_PRICE_PREMIUM_REG');
    expect(stripePriceEnvVar('PREMIUM', 'LAST_MINUTE')).toBe('STRIPE_PRICE_PREMIUM_LM');
  });
});
