import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Bloque 2, fase Early Bird — Premium con el marketplace CERRADO.
 *
 * Igual que la prueba de G98, la pregunta no es «¿devuelve un error?» sino
 * «¿llega a tocar Stripe o la base?». Los dobles registran cada llamada y el
 * camino cerrado exige el registro VACÍO. El rojo es alcanzable y se demuestra:
 * con el marketplace abierto la MISMA acción sí crea la sesión de Stripe (si los
 * dobles estuvieran muertos, ese caso fallaría).
 */

const h = vi.hoisted(() => ({
  stripeCalls: [] as string[],
  dbCalls: [] as string[],
}));

vi.mock('@/lib/auth/guards', () => ({
  requireVerifiedForPurchase: vi.fn(async () => ({
    authUser: { email: 'alumna@acierta-test.mx' },
    profile: { id: 'prof_b2', birthDate: new Date('2000-01-01T00:00:00Z') },
  })),
}));

vi.mock('@/lib/stripe/client', () => ({
  getStripe: () => ({
    customers: {
      create: async () => {
        h.stripeCalls.push('customers.create');
        return { id: 'cus_b2' };
      },
    },
    checkout: {
      sessions: {
        create: async () => {
          h.stripeCalls.push('checkout.sessions.create');
          return { id: 'cs_b2', url: 'https://checkout.stripe.test/cs_b2', customer: 'cus_b2' };
        },
      },
    },
  }),
}));

vi.mock('@/lib/db/billing', () => ({
  resolveEffectiveSeason: async () => 'EARLY_BIRD',
  createPendingSubscription: async () => {
    h.dbCalls.push('createPendingSubscription');
  },
}));

vi.mock('@/lib/db/tutor-consent', () => ({ hasConfirmedTutorConsent: vi.fn(async () => true) }));
vi.mock('@/lib/rate-limit/store', () => ({
  consumeRateLimit: vi.fn(async () => ({ allowed: true, hits: 1, retryAfterSecs: 0 })),
}));
vi.mock('@/lib/analytics/server', () => ({ trackServerEvent: vi.fn(async () => {}) }));
vi.mock('@/lib/auth/site-url', () => ({ getSiteUrl: () => 'https://yaentre.test' }));

const { startCheckoutAction } = await import('@/app/actions/checkout');

const ORIGINAL = {
  salesOpen: process.env.SALES_OPEN,
  vercelEnv: process.env.VERCEL_ENV,
  stripeKey: process.env.STRIPE_SECRET_KEY,
  marketplaceOpen: process.env.MARKETPLACE_OPEN,
};

function restore(name: keyof typeof ORIGINAL, envName: string) {
  if (ORIGINAL[name] === undefined) delete process.env[envName];
  else process.env[envName] = ORIGINAL[name];
}

beforeEach(() => {
  // Venta ABIERTA fuera de producción, para que lo único que decida sea el
  // interruptor del marketplace.
  process.env.SALES_OPEN = 'true';
  process.env.VERCEL_ENV = 'preview';
  process.env.STRIPE_SECRET_KEY = 'sk_test_b2';
  delete process.env.MARKETPLACE_OPEN;
  h.stripeCalls.length = 0;
  h.dbCalls.length = 0;
  vi.clearAllMocks();
});

afterAll(() => {
  restore('salesOpen', 'SALES_OPEN');
  restore('vercelEnv', 'VERCEL_ENV');
  restore('stripeKey', 'STRIPE_SECRET_KEY');
  restore('marketplaceOpen', 'MARKETPLACE_OPEN');
});

describe('startCheckoutAction — Premium con el marketplace cerrado', () => {
  it('rechaza con MARKETPLACE_CLOSED y NO toca Stripe ni la base', async () => {
    const res = await startCheckoutAction({ plan: 'PREMIUM', art56Consent: true });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('inalcanzable');
    expect(res.code).toBe('MARKETPLACE_CLOSED');
    expect(res.message).toMatch(/disponible pronto/i);
    expect(h.stripeCalls).toEqual([]);
    expect(h.dbCalls).toEqual([]);
  });

  it('también rechaza con valores «parecidos a verdadero» (default CERRADO)', async () => {
    for (const value of ['TRUE', '1', 'yes', '']) {
      process.env.MARKETPLACE_OPEN = value;
      const res = await startCheckoutAction({ plan: 'PREMIUM', art56Consent: true });
      expect(res.ok).toBe(false);
    }
    expect(h.stripeCalls).toEqual([]);
  });

  it('el plan Básico NO se ve afectado: sigue comprándose con el marketplace cerrado', async () => {
    const res = await startCheckoutAction({ plan: 'SEASON_PASS', art56Consent: true });
    expect(res.ok).toBe(true);
    expect(h.stripeCalls).toContain('checkout.sessions.create');
    expect(h.dbCalls).toContain('createPendingSubscription');
  });

  it('el plan Mensual NO se ve afectado', async () => {
    const res = await startCheckoutAction({ plan: 'MONTHLY', art56Consent: true });
    expect(res.ok).toBe(true);
  });

  it('el rojo es alcanzable: con el marketplace ABIERTO, Premium sí llega a Stripe', async () => {
    process.env.MARKETPLACE_OPEN = 'true';
    const res = await startCheckoutAction({ plan: 'PREMIUM', art56Consent: true });
    expect(res.ok).toBe(true);
    // Si los dobles estuvieran muertos, este bloque fallaría: es la prueba de
    // que los `expect(h.stripeCalls).toEqual([])` de arriba comprueban algo.
    expect(h.stripeCalls).toEqual(['customers.create', 'checkout.sessions.create']);
    expect(h.dbCalls).toContain('createPendingSubscription');
  });
});
