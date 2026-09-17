import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';
import { livemodeMismatch } from '@/lib/stripe/webhook';
import type { ApplyResult, BillingStore, CheckoutActivation } from '@/lib/stripe/webhook';

/**
 * G98 — SEGUNDA DEFENSA: el webhook rechaza los eventos cuyo `livemode` no
 * corresponde al modo de la llave.
 *
 * El interruptor de ventas cierra `startCheckoutAction`, pero el webhook es
 * una puerta independiente: lo llama Stripe, sin sesión y sin guard, y es el
 * ÚNICO sitio del sistema que activa acceso de pago. Un endpoint de prueba
 * apuntado al webhook de producción —o uno del modo anterior que sobrevive al
 * cambio de llaves— podría activar un plan con un evento del modo equivocado.
 *
 * Se prueban las dos mitades: que el evento incoherente no aplica NADA y que
 * deja rastro en Sentry, y —el rojo alcanzable— que el evento COHERENTE, por
 * la misma ruta y con la misma firma, sí activa. Sin la segunda mitad, el
 * primer bloque pasaría igual si el webhook estuviera roto entero.
 */

const captureException = vi.fn();
const withScope = vi.fn((cb: (scope: unknown) => void) =>
  cb({
    setLevel: vi.fn(),
    setTag: vi.fn(),
    setFingerprint: vi.fn(),
    setContext: vi.fn(),
  })
);
vi.mock('@sentry/nextjs', () => ({ captureException, withScope }));

const WEBHOOK_SECRET = 'whsec_g98_secret';
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.STRIPE_SECRET_KEY = 'sk_test_g98_dummy';

class FakeStore implements BillingStore {
  processed = new Set<string>();
  activations = 0;
  pendings = 0;
  fails = 0;
  cancels = 0;

  reset() {
    this.processed.clear();
    this.activations = 0;
    this.pendings = 0;
    this.fails = 0;
    this.cancels = 0;
  }

  private mark(eventId: string): boolean {
    if (this.processed.has(eventId)) return false;
    this.processed.add(eventId);
    return true;
  }

  async activateFromCheckout(id: string, _t: string, _a: CheckoutActivation): Promise<ApplyResult> {
    if (!this.mark(id)) return 'duplicate';
    this.activations += 1;
    return 'applied';
  }
  async recordPendingAsyncPayment(id: string): Promise<ApplyResult> {
    if (!this.mark(id)) return 'duplicate';
    this.pendings += 1;
    return 'applied';
  }
  async failCheckout(id: string): Promise<ApplyResult> {
    if (!this.mark(id)) return 'duplicate';
    this.fails += 1;
    return 'applied';
  }
  async cancelBySubscriptionId(id: string): Promise<ApplyResult> {
    if (!this.mark(id)) return 'duplicate';
    this.cancels += 1;
    return 'applied';
  }
}

const store = new FakeStore();
const sentEmails: string[] = [];

vi.mock('@/lib/db/billing', () => ({
  get billingStore() {
    return store;
  },
}));

vi.mock('@/lib/email/client', () => ({
  sendEmail: vi.fn(async (input: { to: string }) => {
    sentEmails.push(input.to);
    return { ok: true, mode: 'sent' };
  }),
}));

const { POST } = await import('@/app/api/webhooks/stripe/route');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { telemetry: false });

function buildPayload(id: string, livemode: boolean): string {
  return JSON.stringify({
    id,
    object: 'event',
    type: 'checkout.session.completed',
    api_version: '2024-06-20',
    created: Math.floor(Date.now() / 1000),
    livemode,
    data: {
      object: {
        id: 'cs_g98',
        object: 'checkout.session',
        payment_status: 'paid',
        payment_intent: 'pi_g98',
        customer: 'cus_g98',
        subscription: null,
        payment_method_types: ['card'],
        amount_total: 49900,
        customer_details: { email: 'alumna@acierta-test.mx' },
        metadata: { plan: 'SEASON_PASS', userProfileId: 'prof_g98', season: 'EARLY_BIRD' },
      },
    },
  });
}

function signedRequest(payload: string): Request {
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': header, 'content-type': 'application/json' },
    body: payload,
  });
}

type RouteRequest = Parameters<typeof POST>[0];
const asRouteRequest = (req: Request) => req as unknown as RouteRequest;

const ORIGINAL_VERCEL_ENV = process.env.VERCEL_ENV;

beforeEach(() => {
  store.reset();
  sentEmails.length = 0;
  captureException.mockClear();
});

afterEach(() => {
  if (ORIGINAL_VERCEL_ENV === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = ORIGINAL_VERCEL_ENV;
});

describe('livemodeMismatch — la decisión pura', () => {
  it('fuera de producción NUNCA hay desajuste: se trabaja con llave y eventos de prueba', () => {
    for (const eventLivemode of [true, false, undefined]) {
      for (const keyMode of ['live', 'test', 'unknown'] as const) {
        expect(livemodeMismatch({ eventLivemode, keyMode, isProduction: false })).toBe(false);
      }
    }
  });

  it('en producción, coincidir es la única forma de pasar', () => {
    expect(livemodeMismatch({ eventLivemode: true, keyMode: 'live', isProduction: true })).toBe(false);
    expect(livemodeMismatch({ eventLivemode: false, keyMode: 'test', isProduction: true })).toBe(false);
  });

  it('en producción, un evento del modo contrario se rechaza en ambos sentidos', () => {
    // El caso de HOY: producción corre con llave de prueba y un evento REAL
    // (de un endpoint live olvidado) no puede activar nada.
    expect(livemodeMismatch({ eventLivemode: true, keyMode: 'test', isProduction: true })).toBe(true);
    // El caso de MAÑANA: con llave real, un evento de prueba tampoco.
    expect(livemodeMismatch({ eventLivemode: false, keyMode: 'live', isProduction: true })).toBe(true);
  });

  it('en producción, un evento sin `livemode` o con llave irreconocible se rechaza', () => {
    expect(livemodeMismatch({ eventLivemode: undefined, keyMode: 'live', isProduction: true })).toBe(true);
    expect(livemodeMismatch({ eventLivemode: true, keyMode: 'unknown', isProduction: true })).toBe(true);
    expect(livemodeMismatch({ eventLivemode: false, keyMode: 'unknown', isProduction: true })).toBe(true);
  });
});

describe('Route Handler — evento con livemode incoherente en producción', () => {
  it('responde 200, no activa nada y deja el evento en Sentry', async () => {
    process.env.VERCEL_ENV = 'production'; // llave de prueba (arriba) + evento real
    const payload = buildPayload('evt_g98_mismatch', true);

    const res = await POST(asRouteRequest(signedRequest(payload)));
    const body = await res.json();

    // 200 a propósito: el evento es auténtico (su firma verificó) y no
    // queremos que Stripe lo reintente durante días contra una configuración
    // que no se va a arreglar sola.
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ status: 'rejected', reason: 'livemode_mismatch' });

    // Nada aplicado, por ningún camino.
    expect(store.activations).toBe(0);
    expect(store.pendings).toBe(0);
    expect(sentEmails).toEqual([]);

    // Y NO se registró el evento: la idempotencia no cambia, así que si el
    // modo se corrige, ese mismo evento todavía puede reprocesarse.
    expect(store.processed.size).toBe(0);

    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('fuera de producción el MISMO evento se procesa: la guarda es solo de prod', async () => {
    delete process.env.VERCEL_ENV;
    const payload = buildPayload('evt_g98_preview', true);

    const res = await POST(asRouteRequest(signedRequest(payload)));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ status: 'handled', action: 'activated' });
    expect(store.activations).toBe(1);
  });
});

describe('Route Handler — el rojo es alcanzable (G71 §6 D6)', () => {
  it('en producción, el evento COHERENTE con la llave sí activa', async () => {
    process.env.VERCEL_ENV = 'production'; // llave de prueba + evento de prueba
    const payload = buildPayload('evt_g98_match', false);

    const res = await POST(asRouteRequest(signedRequest(payload)));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ status: 'handled', action: 'activated' });
    expect(store.activations).toBe(1);
    expect(store.processed.has('evt_g98_match')).toBe(true);
    expect(captureException).not.toHaveBeenCalled();
  });
});
