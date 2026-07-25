import { beforeEach, describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';
import type { ApplyResult, BillingStore, CheckoutActivation } from '@/lib/stripe/webhook';

/**
 * Pruebas de INTEGRACIÓN del webhook de pagos (F19 tarea 3) — los 5 casos
 * exigidos, contra el Route Handler REAL (`app/api/webhooks/stripe/route.ts`).
 *
 * Qué es real aquí y qué se simula:
 *  - REAL: la verificación de firma HMAC del SDK de Stripe. Los payloads se
 *    firman con `stripe.webhooks.generateTestHeaderString` (la utilidad oficial
 *    de simulación de Stripe) y se verifican con `constructEvent` — el mismo
 *    código que corre en producción. Nada de "mockear la firma".
 *  - REAL: el enrutado por tipo de evento, el contrato HTTP (200/400/500) y la
 *    semántica de idempotencia.
 *  - SIMULADO: la capa de datos (`billingStore`) y el envío de correo, para no
 *    requerir Postgres ni Resend. El store en memoria reproduce la garantía
 *    crítica del real: registrar el `event.id` es la PRIMERA operación de la
 *    transacción, así que un evento repetido aborta sin aplicar nada.
 *
 * A diferencia de `tests/stripe/webhook.test.ts` (F8, que prueba la función
 * pura `handleStripeEvent`), esto ejercita el borde HTTP completo: cabecera de
 * firma, cuerpo crudo, y los códigos de estado que Stripe usa para decidir si
 * reintenta.
 */

const WEBHOOK_SECRET = 'whsec_test_f19_secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_f19_dummy';
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;

// ── Store en memoria con la MISMA semántica atómica que billing.ts ──

interface FakeSub {
  checkoutSessionId: string;
  status: 'PENDING' | 'ACTIVE' | 'FAILED' | 'CANCELED';
  payments: Array<{ status: 'PENDING' | 'SUCCEEDED' | 'FAILED'; method: string; intentId: string | null }>;
}

class RouteFakeStore implements BillingStore {
  processedEvents = new Set<string>();
  subs = new Map<string, FakeSub>();
  activateCalls = 0;

  reset() {
    this.processedEvents.clear();
    this.subs.clear();
    this.activateCalls = 0;
  }

  seedPending(checkoutSessionId: string) {
    this.subs.set(checkoutSessionId, { checkoutSessionId, status: 'PENDING', payments: [] });
  }

  /** Modela el INSERT del event.id como primera sentencia de la transacción. */
  private markOrDuplicate(eventId: string): boolean {
    if (this.processedEvents.has(eventId)) return false;
    this.processedEvents.add(eventId);
    return true;
  }

  private upsertPayment(sub: FakeSub, a: CheckoutActivation, status: 'PENDING' | 'SUCCEEDED' | 'FAILED') {
    const existing = a.paymentIntentId
      ? sub.payments.find((p) => p.intentId === a.paymentIntentId)
      : undefined;
    if (existing) {
      existing.status = status;
      existing.method = a.method;
    } else {
      sub.payments.push({ status, method: a.method, intentId: a.paymentIntentId });
    }
  }

  async activateFromCheckout(eventId: string, _t: string, a: CheckoutActivation): Promise<ApplyResult> {
    if (!this.markOrDuplicate(eventId)) return 'duplicate';
    const sub = this.subs.get(a.checkoutSessionId);
    if (!sub) throw new Error('SubscriptionNotFound');
    if (sub.status === 'ACTIVE') return 'applied';
    this.activateCalls += 1;
    sub.status = 'ACTIVE';
    this.upsertPayment(sub, a, 'SUCCEEDED');
    return 'applied';
  }

  async recordPendingAsyncPayment(eventId: string, _t: string, a: CheckoutActivation): Promise<ApplyResult> {
    if (!this.markOrDuplicate(eventId)) return 'duplicate';
    const sub = this.subs.get(a.checkoutSessionId);
    if (!sub) throw new Error('SubscriptionNotFound');
    if (sub.status === 'ACTIVE') return 'applied';
    this.upsertPayment(sub, a, 'PENDING');
    return 'applied';
  }

  async failCheckout(eventId: string, _t: string, checkoutSessionId: string): Promise<ApplyResult> {
    if (!this.markOrDuplicate(eventId)) return 'duplicate';
    const sub = this.subs.get(checkoutSessionId);
    if (!sub || sub.status === 'ACTIVE') return 'applied';
    sub.status = 'FAILED';
    sub.payments.forEach((p) => {
      if (p.status === 'PENDING') p.status = 'FAILED';
    });
    return 'applied';
  }

  async cancelBySubscriptionId(eventId: string, _t: string, stripeSubscriptionId: string): Promise<ApplyResult> {
    if (!this.markOrDuplicate(eventId)) return 'duplicate';
    for (const sub of this.subs.values()) {
      if (stripeSubscriptionId && sub.status === 'ACTIVE') {
        sub.status = 'CANCELED';
        return 'applied';
      }
    }
    return 'applied';
  }
}

const store = new RouteFakeStore();
const sentEmails: Array<{ to: string; subject: string }> = [];

vi.mock('@/lib/db/billing', () => ({
  get billingStore() {
    return store;
  },
}));

vi.mock('@/lib/email/client', () => ({
  sendEmail: vi.fn(async (input: { to: string; subject: string }) => {
    sentEmails.push({ to: input.to, subject: input.subject });
    return { ok: true };
  }),
}));

// El Route Handler se importa DESPUÉS de registrar los mocks.
const { POST } = await import('@/app/api/webhooks/stripe/route');

// ── Utilidades: payloads firmados con la simulación oficial de Stripe ──

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { telemetry: false });
const CHECKOUT_ID = 'cs_test_f19';

function checkoutSessionObject(overrides: Record<string, unknown> = {}) {
  return {
    id: CHECKOUT_ID,
    object: 'checkout.session',
    payment_status: 'paid',
    payment_intent: 'pi_f19',
    customer: 'cus_f19',
    subscription: null,
    payment_method_types: ['card'],
    amount_total: 49900,
    customer_details: { email: 'alumna@example.com' },
    metadata: { plan: 'SEASON_PASS', userProfileId: 'prof_1', season: 'EARLY_BIRD' },
    ...overrides,
  };
}

function buildPayload(id: string, type: string, object: unknown): string {
  return JSON.stringify({
    id,
    object: 'event',
    type,
    api_version: '2024-06-20',
    created: Math.floor(Date.now() / 1000),
    data: { object },
  });
}

/** Petición con firma REAL generada por el SDK de Stripe. */
function signedRequest(payload: string, secret = WEBHOOK_SECRET): Request {
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': header, 'content-type': 'application/json' },
    body: payload,
  });
}

// Next tipa el handler con NextRequest; en runtime solo usa headers + text().
type RouteRequest = Parameters<typeof POST>[0];
const asRouteRequest = (req: Request) => req as unknown as RouteRequest;

beforeEach(() => {
  store.reset();
  sentEmails.length = 0;
});

describe('Webhook de pagos — Caso 1: pago con tarjeta completado', () => {
  it('activa la suscripción y responde 200', async () => {
    store.seedPending(CHECKOUT_ID);
    const payload = buildPayload('evt_f19_card', 'checkout.session.completed', checkoutSessionObject());

    const res = await POST(asRouteRequest(signedRequest(payload)));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ received: true, status: 'handled', action: 'activated' });
    expect(store.subs.get(CHECKOUT_ID)!.status).toBe('ACTIVE');
    expect(store.subs.get(CHECKOUT_ID)!.payments[0]).toMatchObject({
      status: 'SUCCEEDED',
      method: 'CARD',
    });
    // El correo de confirmación sale del propio evento verificado.
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe('alumna@example.com');
  });
});

describe('Webhook de pagos — Caso 2: pago asíncrono confirmado (OXXO)', () => {
  it('el voucher NO da acceso; la confirmación asíncrona sí lo activa', async () => {
    store.seedPending(CHECKOUT_ID);

    // 2a) checkout.session.completed con payment_status 'unpaid' = voucher.
    const pendingPayload = buildPayload(
      'evt_f19_oxxo_pending',
      'checkout.session.completed',
      checkoutSessionObject({ payment_status: 'unpaid', payment_method_types: ['oxxo'] })
    );
    const pendingRes = await POST(asRouteRequest(signedRequest(pendingPayload)));

    expect(pendingRes.status).toBe(200);
    await expect(pendingRes.json()).resolves.toMatchObject({ action: 'pending' });
    // GUARDRAIL: sin acceso hasta que el dinero entre de verdad.
    expect(store.subs.get(CHECKOUT_ID)!.status).toBe('PENDING');
    expect(store.activateCalls).toBe(0);

    // 2b) async_payment_succeeded: aquí ya viene 'paid' pero NO fue tarjeta.
    const okPayload = buildPayload(
      'evt_f19_oxxo_ok',
      'checkout.session.async_payment_succeeded',
      checkoutSessionObject({ payment_status: 'paid', payment_method_types: ['oxxo'] })
    );
    const okRes = await POST(asRouteRequest(signedRequest(okPayload)));

    expect(okRes.status).toBe(200);
    await expect(okRes.json()).resolves.toMatchObject({ action: 'activated' });

    const sub = store.subs.get(CHECKOUT_ID)!;
    expect(sub.status).toBe('ACTIVE');
    // Mismo PaymentIntent ⇒ el Payment pasó de PENDING a SUCCEEDED, sin duplicar.
    expect(sub.payments).toHaveLength(1);
    expect(sub.payments[0]).toMatchObject({ status: 'SUCCEEDED', method: 'OXXO' });
  });
});

describe('Webhook de pagos — Caso 3: evento duplicado no se reprocesa', () => {
  it('el mismo event.id entregado dos veces activa UNA sola vez', async () => {
    store.seedPending(CHECKOUT_ID);
    const payload = buildPayload('evt_f19_dup', 'checkout.session.completed', checkoutSessionObject());

    const first = await POST(asRouteRequest(signedRequest(payload)));
    const second = await POST(asRouteRequest(signedRequest(payload)));

    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toMatchObject({ status: 'handled', action: 'activated' });

    // Stripe reintenta: debe recibir 200 (para dejar de reintentar) pero sin re-aplicar.
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toMatchObject({ status: 'duplicate' });

    expect(store.activateCalls).toBe(1);
    expect(store.subs.get(CHECKOUT_ID)!.payments).toHaveLength(1);
    // Tampoco se reenvía el correo de confirmación en el duplicado.
    expect(sentEmails).toHaveLength(1);
  });
});

describe('Webhook de pagos — Caso 4: firma inválida rechazada', () => {
  it('una firma de otro secreto responde 400 y NO toca el estado de pago', async () => {
    store.seedPending(CHECKOUT_ID);
    const payload = buildPayload('evt_f19_forged', 'checkout.session.completed', checkoutSessionObject());

    // Firmado con un secreto distinto: exactamente un payload falsificado.
    const res = await POST(asRouteRequest(signedRequest(payload, 'whsec_secreto_del_atacante')));

    expect(res.status).toBe(400);
    expect(store.subs.get(CHECKOUT_ID)!.status).toBe('PENDING');
    expect(store.activateCalls).toBe(0);
    expect(store.processedEvents.size).toBe(0);
  });

  it('sin cabecera de firma responde 400 sin procesar nada', async () => {
    store.seedPending(CHECKOUT_ID);
    const payload = buildPayload('evt_f19_nosig', 'checkout.session.completed', checkoutSessionObject());

    const res = await POST(
      asRouteRequest(
        new Request('http://localhost/api/webhooks/stripe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: payload,
        })
      )
    );

    expect(res.status).toBe(400);
    expect(store.subs.get(CHECKOUT_ID)!.status).toBe('PENDING');
    expect(store.activateCalls).toBe(0);
  });

  it('un cuerpo manipulado tras firmar se rechaza (la firma cubre el payload)', async () => {
    store.seedPending(CHECKOUT_ID);
    const original = buildPayload('evt_f19_tamper', 'checkout.session.completed', checkoutSessionObject());
    const header = stripe.webhooks.generateTestHeaderString({
      payload: original,
      secret: WEBHOOK_SECRET,
    });

    // Se altera el monto DESPUÉS de firmar.
    const tampered = original.replace('49900', '1');
    const res = await POST(
      asRouteRequest(
        new Request('http://localhost/api/webhooks/stripe', {
          method: 'POST',
          headers: { 'stripe-signature': header, 'content-type': 'application/json' },
          body: tampered,
        })
      )
    );

    expect(res.status).toBe(400);
    expect(store.activateCalls).toBe(0);
  });
});

describe('Webhook de pagos — Caso 5: pago asíncrono fallido', () => {
  it('async_payment_failed marca FAILED y nunca deja acceso activo', async () => {
    store.seedPending(CHECKOUT_ID);

    // Primero el voucher pendiente.
    await POST(
      asRouteRequest(
        signedRequest(
          buildPayload(
            'evt_f19_spei_pending',
            'checkout.session.completed',
            checkoutSessionObject({
              payment_status: 'unpaid',
              payment_method_types: ['customer_balance'],
            })
          )
        )
      )
    );

    // El alumno nunca pagó: el voucher expira.
    const failedPayload = buildPayload(
      'evt_f19_spei_failed',
      'checkout.session.async_payment_failed',
      checkoutSessionObject({ payment_status: 'unpaid', payment_method_types: ['customer_balance'] })
    );
    const res = await POST(asRouteRequest(signedRequest(failedPayload)));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ status: 'handled', action: 'failed' });

    const sub = store.subs.get(CHECKOUT_ID)!;
    expect(sub.status).toBe('FAILED');
    expect(sub.payments[0]).toMatchObject({ status: 'FAILED', method: 'SPEI' });
    expect(store.activateCalls).toBe(0);
  });
});

describe('Webhook de pagos — contrato de reintento de Stripe', () => {
  it('un fallo transitorio del store responde 500 para que Stripe reintente', async () => {
    // Sin `seedPending`: el store lanza (modela la carrera "evento antes de la
    // Subscription"). Debe ser 500, no 200 — un 200 haría que Stripe DEJE de
    // reintentar y el alumno pagaría sin que nunca se le active el acceso.
    const payload = buildPayload('evt_f19_race', 'checkout.session.completed', checkoutSessionObject());
    const res = await POST(asRouteRequest(signedRequest(payload)));

    expect(res.status).toBe(500);
  });

  it('un evento irrelevante se ignora con 200 sin tocar el store', async () => {
    const payload = buildPayload('evt_f19_ping', 'payment_intent.created', { id: 'pi_x' });
    const res = await POST(asRouteRequest(signedRequest(payload)));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ status: 'ignored' });
    expect(store.processedEvents.size).toBe(0);
    expect(sentEmails).toHaveLength(0);
  });
});
