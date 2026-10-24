import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * G103 — POST /api/me/subscription/extend. Mismo estándar que
 * `tests/sales/checkout-closed.test.ts`: la pregunta no es «¿devuelve error?»
 * sino «¿llegó a tocar Stripe o la base?». Los dobles registran cada llamada y
 * los caminos cerrados exigen el registro VACÍO.
 */

const calls: string[] = [];
const identity = { verified: true };
const sub = {
  id: 'cks_1',
  userProfileId: 'cku_1',
  status: 'ACTIVE',
  plan: 'SEASON_PASS',
  expiresAt: new Date(Date.now() + 10 * 24 * 3600 * 1000),
  graceEndsAt: new Date(Date.now() + 17 * 24 * 3600 * 1000),
  stripeCustomerId: null as string | null,
};
let created: Record<string, unknown> | null = null;

vi.mock('@/lib/auth/guards', async () => {
  const { AuthError } = await import('@/lib/auth/errors');
  return {
    requireVerifiedForPurchase: vi.fn(async () => {
      calls.push('guard');
      if (!identity.verified) throw new AuthError('UNAUTHORIZED', 'Verifica tu correo antes de comprar.');
      return { authUser: { email: 'alumna@acierta-test.mx' }, profile: { id: 'cku_1' } };
    }),
  };
});

vi.mock('@/lib/db/access-extension', () => ({
  findExtendableSubscription: vi.fn(async () => {
    calls.push('db.findExtendable');
    return sub;
  }),
  findKnownStripeCustomerId: vi.fn(async () => null),
}));

vi.mock('@/lib/rate-limit/store', () => ({
  consumeRateLimit: vi.fn(async () => {
    calls.push('rateLimit');
    return { allowed: true, hits: 1, retryAfterSecs: 0 };
  }),
}));

vi.mock('@/lib/stripe/client', () => ({
  getStripe: () => ({
    customers: {
      create: async () => {
        calls.push('stripe.customers.create');
        return { id: 'cus_new' };
      },
    },
    checkout: {
      sessions: {
        create: async (params: Record<string, unknown>) => {
          calls.push('stripe.checkout.create');
          created = params;
          return { id: 'cs_test_x', url: 'https://checkout.stripe.test/cs_test_x' };
        },
      },
    },
  }),
}));

const { POST } = await import('@/app/api/me/subscription/extend/route');

function req(body: unknown, headers: Record<string, string> = { 'sec-fetch-site': 'same-origin' }) {
  return new NextRequest('http://localhost:3000/api/me/subscription/extend', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const ENV = { ...process.env };
beforeEach(() => {
  calls.length = 0;
  created = null;
  identity.verified = true;
  process.env.SALES_OPEN = 'true';
  process.env.VERCEL_ENV = 'preview';
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
});
afterEach(() => {
  process.env = { ...ENV };
});

describe('venta cerrada: no toca nada', () => {
  it('SALES_OPEN ausente → 409 SALES_CLOSED sin guard, sin base y sin Stripe', async () => {
    delete process.env.SALES_OPEN;
    const res = await POST(req({ acceptImmediateAccess: true }));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('SALES_CLOSED');
    expect(calls).toEqual([]);
  });

  it('producción con llave de PRUEBA → cerrada aunque SALES_OPEN=true', async () => {
    process.env.VERCEL_ENV = 'production';
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    const res = await POST(req({ acceptImmediateAccess: true }));
    expect(res.status).toBe(409);
    expect(calls).toEqual([]);
  });
});

describe('bordes', () => {
  it('petición de otro sitio → 403 antes de todo', async () => {
    const res = await POST(req({ acceptImmediateAccess: true }, { 'sec-fetch-site': 'cross-site' }));
    expect(res.status).toBe(403);
    expect(calls).toEqual([]);
  });

  it('sin la casilla del art. 56 → 400 y sin Stripe', async () => {
    const res = await POST(req({ acceptImmediateAccess: false }));
    expect(res.status).toBe(400);
    expect(calls).not.toContain('stripe.checkout.create');
  });

  it('campos de más (código de referido, monto) → 400: el precio no viene del cliente', async () => {
    for (const extra of [{ referralCode: 'PEDRO2026' }, { amountCents: 100 }, { subscriptionId: 'cks_otro' }]) {
      calls.length = 0;
      const res = await POST(req({ acceptImmediateAccess: true, ...extra }));
      expect(res.status, JSON.stringify(extra)).toBe(400);
      expect(calls).not.toContain('stripe.checkout.create');
    }
  });

  it('correo sin verificar → 401 sin Stripe', async () => {
    identity.verified = false;
    const res = await POST(req({ acceptImmediateAccess: true }));
    expect(res.status).toBe(401);
    expect(calls).not.toContain('stripe.checkout.create');
  });
});

describe('control positivo: con la venta abierta SÍ crea el checkout', () => {
  it('precio fijo del servidor, metadatos de la extensión y sin códigos de promoción', async () => {
    const res = await POST(req({ acceptImmediateAccess: true }));
    expect(res.status).toBe(200);
    expect((await res.json()).url).toContain('checkout.stripe.test');
    expect(calls).toContain('stripe.checkout.create');
    const params = created as {
      metadata: Record<string, string>;
      allow_promotion_codes: boolean;
      line_items: Array<{ price_data: { unit_amount: number; currency: string } }>;
    };
    expect(params.line_items[0].price_data).toMatchObject({ unit_amount: 49_900, currency: 'mxn' });
    expect(params.allow_promotion_codes).toBe(false);
    expect(params.metadata).toMatchObject({
      kind: 'access_extension',
      userProfileId: 'cku_1',
      subscriptionId: 'cks_1',
      expectedAmountCents: '49900',
      consentVersion: 'art56-planes-v1',
    });
  });
});
