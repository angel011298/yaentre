import { beforeEach, describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';

/**
 * El pago de una CLASE entra por el mismo webhook que las suscripciones y se
 * desvía antes. Contra el Route Handler REAL, con firma HMAC real (misma
 * técnica que tests/stripe/webhook-route.test.ts).
 */

const WEBHOOK_SECRET = 'whsec_test_class_secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_class_dummy';
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;

const h = vi.hoisted(() => ({
  outcome: { kind: 'booked', classId: 'ckclass1' } as { kind: string; classId?: string },
  storeThrows: false,
  confirmCalls: [] as Array<{ eventId: string; input: Record<string, unknown> }>,
  expireCalls: [] as Array<{ eventId: string; input: Record<string, unknown> }>,
  billingCalls: 0,
  announced: [] as Array<{ id: string; method: string }>,
  refunded: [] as string[],
  reports: [] as string[],
  emails: 0,
}));

vi.mock('@/lib/db/billing', () => {
  const trap = async () => {
    h.billingCalls += 1;
    throw new Error('SubscriptionNotFound');
  };
  return {
    billingStore: {
      activateFromCheckout: trap,
      recordPendingAsyncPayment: trap,
      failCheckout: trap,
      cancelBySubscriptionId: trap,
    },
  };
});
vi.mock('@/lib/db/classes', () => ({
  classPaymentStore: {
    confirmPayment: async (eventId: string, _t: string, input: Record<string, unknown>) => {
      if (h.storeThrows) throw new Error('db caída');
      h.confirmCalls.push({ eventId, input });
      return h.outcome;
    },
    expireCheckout: async (eventId: string, _t: string, input: Record<string, unknown>) => {
      h.expireCalls.push({ eventId, input });
      return { kind: 'cancelled', classId: 'ckclass1' };
    },
  },
}));
vi.mock('@/lib/classes/notify', () => ({
  announceBooked: async (id: string, method: string) => {
    h.announced.push({ id, method });
  },
}));
vi.mock('@/lib/classes/refunds', () => ({
  refundClassIfDue: async (id: string) => {
    h.refunded.push(id);
    return { status: 'refunded', amountCents: 1 };
  },
}));
vi.mock('@/lib/observability/report', () => ({
  reportControlFailure: (control: string) => h.reports.push(control),
  reportSilentDegradation: (area: string) => h.reports.push(area),
}));
vi.mock('@/lib/email/client', () => ({
  sendEmail: vi.fn(async () => {
    h.emails += 1;
    return { ok: true };
  }),
}));

const { POST } = await import('@/app/api/webhooks/stripe/route');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { telemetry: false });

const payload = (id: string, type: string, object: unknown) =>
  JSON.stringify({
    id,
    object: 'event',
    type,
    api_version: '2024-06-20',
    livemode: false,
    created: Math.floor(Date.now() / 1000),
    data: { object },
  });

function signed(body: string): Parameters<typeof POST>[0] {
  const header = stripe.webhooks.generateTestHeaderString({ payload: body, secret: WEBHOOK_SECRET });
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': header, 'content-type': 'application/json' },
    body,
  }) as never;
}

const intent = (meta: Record<string, string> = { type: 'class_booking', classSessionId: 'ckclass1', method: 'ONE_CLICK' }) => ({
  id: 'pi_1',
  object: 'payment_intent',
  amount: 30000,
  amount_received: 30000,
  currency: 'mxn',
  metadata: meta,
});

beforeEach(() => {
  h.outcome = { kind: 'booked', classId: 'ckclass1' };
  h.storeThrows = false;
  for (const k of ['confirmCalls', 'expireCalls', 'announced', 'refunded', 'reports'] as const) h[k].length = 0;
  h.billingCalls = 0;
  h.emails = 0;
});

describe('webhook — pago de una clase', () => {
  it('payment_intent.succeeded reserva vía el almacén de clases, con el monto RECIBIDO', async () => {
    const res = await POST(signed(payload('evt_c1', 'payment_intent.succeeded', intent())));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ received: true, status: 'handled', outcome: 'booked' });
    expect(h.confirmCalls[0]).toMatchObject({
      eventId: 'evt_c1',
      input: { classSessionId: 'ckclass1', paymentIntentId: 'pi_1', amountReceivedCents: 30000, currency: 'mxn' },
    });
    expect(h.announced).toEqual([{ id: 'ckclass1', method: 'ONE_CLICK' }]);
  });

  it('NUNCA cae en el camino de suscripciones ni manda el correo de confirmación de plan', async () => {
    await POST(signed(payload('evt_c2', 'payment_intent.succeeded', intent())));
    expect(h.billingCalls).toBe(0);
    expect(h.emails).toBe(0);
  });

  it('un cobro por Checkout se anuncia con método CHECKOUT', async () => {
    await POST(
      signed(payload('evt_c3', 'payment_intent.succeeded', intent({ type: 'class_booking', classSessionId: 'ckclass1', method: 'CHECKOUT' })))
    );
    expect(h.announced[0]!.method).toBe('CHECKOUT');
  });

  it('un evento duplicado responde 200 y NO vuelve a avisar', async () => {
    h.outcome = { kind: 'duplicate' };
    const res = await POST(signed(payload('evt_c4', 'payment_intent.succeeded', intent())));
    expect(res.status).toBe(200);
    expect(h.announced).toEqual([]);
  });

  it('un monto que no coincide o un pago tardío disparan el REEMBOLSO', async () => {
    h.outcome = { kind: 'mismatch', classId: 'ckclass1' };
    await POST(signed(payload('evt_c5', 'payment_intent.succeeded', intent())));
    h.outcome = { kind: 'refund_due', classId: 'ckclass1' };
    await POST(signed(payload('evt_c6', 'payment_intent.succeeded', intent())));
    expect(h.refunded).toEqual(['ckclass1', 'ckclass1']);
    expect(h.announced).toEqual([]);
  });

  it('un cobro sin clase asociada responde 200 pero se REPORTA', async () => {
    h.outcome = { kind: 'not_found' };
    const res = await POST(signed(payload('evt_c7', 'payment_intent.succeeded', intent())));
    expect(res.status).toBe(200);
    expect(h.reports).toContain('payment_consistency');
  });

  it('un evento de clase SIN id de clase no se reintenta para siempre: 200 + reporte, sin tocar suscripciones', async () => {
    const res = await POST(signed(payload('evt_c8', 'payment_intent.succeeded', intent({ type: 'class_booking' }))));
    expect(res.status).toBe(200);
    expect(h.confirmCalls).toEqual([]);
    expect(h.billingCalls).toBe(0);
    expect(h.reports).toContain('payment_consistency');
  });

  it('un fallo de la base devuelve 500 para que Stripe REINTENTE', async () => {
    h.storeThrows = true;
    const res = await POST(signed(payload('evt_c9', 'payment_intent.succeeded', intent())));
    expect(res.status).toBe(500);
    expect(h.announced).toEqual([]);
  });

  it('checkout.session.expired suelta el horario', async () => {
    const res = await POST(
      signed(
        payload('evt_c10', 'checkout.session.expired', {
          id: 'cs_1',
          object: 'checkout.session',
          metadata: { type: 'class_booking', classSessionId: 'ckclass1' },
        })
      )
    );
    expect(res.status).toBe(200);
    expect(h.expireCalls[0]).toMatchObject({ eventId: 'evt_c10', input: { classSessionId: 'ckclass1' } });
  });

  it('payment_intent.payment_failed se ignora a propósito (Checkout permite otra tarjeta)', async () => {
    const res = await POST(signed(payload('evt_c11', 'payment_intent.payment_failed', intent())));
    expect(res.status).toBe(200);
    expect(h.confirmCalls).toEqual([]);
    expect(h.expireCalls).toEqual([]);
  });

  it('con una firma inválida no se procesa nada', async () => {
    const body = payload('evt_c12', 'payment_intent.succeeded', intent());
    const bad = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 't=1,v1=deadbeef' },
      body,
    });
    const res = await POST(bad as never);
    expect(res.status).toBe(400);
    expect(h.confirmCalls).toEqual([]);
  });
});
