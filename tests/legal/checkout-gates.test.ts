import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Bloque 1 — gates del checkout: consentimiento art. 56 (obligatorio) y
 * protección de menores (fecha de nacimiento + confirmación del tutor). La
 * prueba comprueba, como la de G98, no solo el código de error sino que la
 * acción NO toque Stripe cuando un gate la detiene.
 */

const h = vi.hoisted(() => ({
  birthDate: new Date('2000-01-01T00:00:00Z') as Date | null, // adulto por defecto
  tutorConfirmed: false,
  stripeCalls: [] as string[],
  dbCalls: [] as string[],
}));

vi.mock('@/lib/auth/guards', () => ({
  requireVerifiedForPurchase: vi.fn(async () => ({
    authUser: { email: 'alumna@acierta-test.mx' },
    profile: { id: 'prof_b1', birthDate: h.birthDate },
  })),
}));

vi.mock('@/lib/stripe/client', () => ({
  getStripe: () => ({
    customers: {
      create: async () => {
        h.stripeCalls.push('customers.create');
        return { id: 'cus_b1' };
      },
    },
    checkout: {
      sessions: {
        create: async () => {
          h.stripeCalls.push('checkout.sessions.create');
          return { id: 'cs_b1', url: 'https://checkout.stripe.test/cs_b1', customer: 'cus_b1' };
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

vi.mock('@/lib/db/tutor-consent', () => ({
  hasConfirmedTutorConsent: vi.fn(async () => h.tutorConfirmed),
}));

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
};

beforeEach(() => {
  // Venta ABIERTA (fuera de producción basta SALES_OPEN=true) para que los
  // gates de consentimiento/menores sean los que decidan.
  process.env.SALES_OPEN = 'true';
  process.env.VERCEL_ENV = 'preview';
  process.env.STRIPE_SECRET_KEY = 'sk_test_b1';
  h.birthDate = new Date('2000-01-01T00:00:00Z');
  h.tutorConfirmed = false;
  h.stripeCalls.length = 0;
  h.dbCalls.length = 0;
  vi.clearAllMocks();
});

afterAll(() => {
  if (ORIGINAL.salesOpen === undefined) delete process.env.SALES_OPEN;
  else process.env.SALES_OPEN = ORIGINAL.salesOpen;
  if (ORIGINAL.vercelEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = ORIGINAL.vercelEnv;
  if (ORIGINAL.stripeKey === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = ORIGINAL.stripeKey;
});

describe('gate art. 56', () => {
  it('sin consentimiento art. 56 rechaza y NO toca Stripe', async () => {
    const res = await startCheckoutAction({ plan: 'SEASON_PASS', art56Consent: false });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('inalcanzable');
    expect(res.code).toBe('ART56_CONSENT_REQUIRED');
    expect(h.stripeCalls).toEqual([]);
    expect(h.dbCalls).toEqual([]);
  });
});

describe('gate de menores', () => {
  it('sin fecha de nacimiento rechaza con BIRTHDATE_REQUIRED', async () => {
    h.birthDate = null;
    const res = await startCheckoutAction({ plan: 'SEASON_PASS', art56Consent: true });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('inalcanzable');
    expect(res.code).toBe('BIRTHDATE_REQUIRED');
    expect(h.stripeCalls).toEqual([]);
  });

  it('menor de 18 SIN confirmación del tutor rechaza con TUTOR_CONSENT_REQUIRED', async () => {
    h.birthDate = new Date('2012-01-01T00:00:00Z'); // ~14-15 según now, en todo caso < 18
    h.tutorConfirmed = false;
    const res = await startCheckoutAction({ plan: 'SEASON_PASS', art56Consent: true });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('inalcanzable');
    expect(res.code).toBe('TUTOR_CONSENT_REQUIRED');
    expect(h.stripeCalls).toEqual([]);
  });

  it('menor de 18 CON confirmación del tutor y art. 56 sí procede a Stripe', async () => {
    h.birthDate = new Date('2010-01-01T00:00:00Z'); // < 18
    h.tutorConfirmed = true;
    const res = await startCheckoutAction({ plan: 'SEASON_PASS', art56Consent: true });
    expect(res.ok).toBe(true);
    expect(h.stripeCalls).toContain('checkout.sessions.create');
    expect(h.dbCalls).toContain('createPendingSubscription');
  });

  it('adulto con art. 56 procede sin necesitar tutor', async () => {
    h.birthDate = new Date('1999-01-01T00:00:00Z');
    const res = await startCheckoutAction({ plan: 'PREMIUM', art56Consent: true });
    expect(res.ok).toBe(true);
    expect(h.stripeCalls).toContain('checkout.sessions.create');
  });
});
