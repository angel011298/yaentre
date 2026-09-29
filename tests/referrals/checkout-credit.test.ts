/* eslint-disable @typescript-eslint/no-explicit-any -- dobles de prueba que capturan los parámetros arbitrarios que la acción manda a Stripe y a Prisma */
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * El crédito de referidos en `startCheckoutAction`.
 *
 * Lo que se comprueba es lo que llega a STRIPE (el monto y la línea) y lo que se
 * hace con el apartado en cada camino de fallo — no que la acción «devuelva ok».
 */

const h = vi.hoisted(() => ({
  stripeParams: [] as Array<Record<string, any>>,
  available: 0,
  attributed: false,
  reserved: null as null | { redemptionId: string; reservedCents: number },
  releases: [] as Array<[string, string]>,
  pendingInputs: [] as Array<Record<string, any>>,
  failStripeSession: false,
  failPending: false,
  failReserve: false,
  failCustomer: false,
  reserveAsked: [] as number[],
  configuredPrice: undefined as string | undefined,
}));

vi.mock('@/lib/auth/guards', () => ({
  requireVerifiedForPurchase: vi.fn(async () => ({
    authUser: { email: 'a@acierta-test.mx' },
    profile: { id: 'prof1', birthDate: new Date('2000-01-01T00:00:00Z') },
  })),
  requireUser: vi.fn(),
}));
vi.mock('@/lib/stripe/client', () => ({
  getStripe: () => ({
    customers: {
      create: async () => {
        if (h.failCustomer) throw new Error('customer down');
        return { id: 'cus1' };
      },
    },
    checkout: {
      sessions: {
        create: async (params: Record<string, any>) => {
          if (h.failStripeSession) throw new Error('stripe down');
          h.stripeParams.push(params);
          return { id: 'cs1', url: 'https://checkout.test/cs1', customer: 'cus1' };
        },
      },
    },
  }),
}));
vi.mock('@/lib/db/billing', () => ({
  resolveEffectiveSeason: async () => 'EARLY_BIRD',
  createPendingSubscription: async (input: Record<string, any>) => {
    if (h.failPending) throw new Error('db down');
    h.pendingInputs.push(input);
  },
}));
vi.mock('@/lib/db/referrals', () => ({
  getAvailableCreditCents: vi.fn(async () => h.available),
  buyerIsAttributed: vi.fn(async () => h.attributed),
  reserveCredit: vi.fn(async (_id: string, cents: number) => {
    if (h.failReserve) throw new Error('reserve down');
    h.reserveAsked.push(cents);
    return h.reserved;
  }),
  releaseRedemptionById: vi.fn(async (id: string, reason: string) => {
    h.releases.push([id, reason]);
    return true;
  }),
}));
vi.mock('@/lib/db/tutor-consent', () => ({ hasConfirmedTutorConsent: vi.fn(async () => true) }));
vi.mock('@/lib/db/notifications', () => ({ setNotificationPreference: vi.fn() }));
vi.mock('@/lib/rate-limit/store', () => ({ consumeRateLimit: vi.fn(async () => ({ allowed: true, hits: 1, retryAfterSecs: 0 })) }));
vi.mock('@/lib/analytics/server', () => ({ trackServerEvent: vi.fn(async () => {}) }));
vi.mock('@/lib/auth/site-url', () => ({ getSiteUrl: () => 'https://yaentre.test' }));
vi.mock('@/lib/observability/report', () => ({ reportControlFailure: vi.fn(), reportSilentDegradation: vi.fn() }));

const { startCheckoutAction } = await import('@/app/actions/checkout');
const { reportControlFailure } = await import('@/lib/observability/report');
const { getAvailableCreditCents } = await import('@/lib/db/referrals');

beforeEach(() => {
  vi.clearAllMocks();
  h.stripeParams.length = 0;
  h.releases.length = 0;
  h.pendingInputs.length = 0;
  h.reserveAsked.length = 0;
  h.available = 0;
  h.attributed = false;
  h.reserved = null;
  h.failStripeSession = h.failPending = h.failReserve = h.failCustomer = false;
  process.env.SALES_OPEN = 'true';
  process.env.VERCEL_ENV = 'preview';
  process.env.STRIPE_SECRET_KEY = 'sk_test_x';
  process.env.MARKETPLACE_OPEN = 'true';
  delete process.env.STRIPE_PRICE_PASE_EB;
});

const amount = (p: Record<string, any>) => p.line_items[0].price_data?.unit_amount;

describe('sin crédito: el checkout es el de siempre', () => {
  it('cobra el precio de lista y no aparta nada', async () => {
    const res = await startCheckoutAction({ plan: 'SEASON_PASS', art56Consent: true });
    expect(res.ok).toBe(true);
    expect(amount(h.stripeParams[0])).toBe(99_900);
    expect(h.reserveAsked).toEqual([]);
    expect(h.stripeParams[0].metadata.referralCreditCents).toBeUndefined();
    expect(h.pendingInputs[0].creditRedemptionId).toBeUndefined();
  });

  it('el plan MENSUAL ni siquiera consulta el crédito', async () => {
    h.available = 50_000;
    await startCheckoutAction({ plan: 'MONTHLY', art56Consent: true });
    expect(getAvailableCreditCents).not.toHaveBeenCalled();
    expect(h.reserveAsked).toEqual([]);
    expect(amount(h.stripeParams[0])).toBe(9_900);
  });
});

describe('con crédito', () => {
  beforeEach(() => {
    h.available = 15_000;
    h.reserved = { redemptionId: 'red1', reservedCents: 15_000 };
  });

  it('cobra el precio MENOS el crédito, con el descuento a la vista y en la metadata', async () => {
    const res = await startCheckoutAction({ plan: 'SEASON_PASS', art56Consent: true });
    expect(res.ok).toBe(true);
    const p = h.stripeParams[0];
    expect(amount(p)).toBe(84_900); // 99 900 − 15 000
    expect(p.line_items[0].price_data.product_data.name).toMatch(/crédito de referidos de −\$150\.00/);
    expect(p.metadata.referralCreditCents).toBe('15000');
  });

  it('une el apartado con la suscripción PENDING (para consumirlo o liberarlo por webhook)', async () => {
    await startCheckoutAction({ plan: 'SEASON_PASS', art56Consent: true });
    expect(h.pendingInputs[0].creditRedemptionId).toBe('red1');
  });

  it('pide como máximo lo que cabe bajo el piso de $500: comprador SIN referidor, $341.76', async () => {
    h.available = 1_000_000;
    h.reserved = { redemptionId: 'red1', reservedCents: 34_176 };
    await startCheckoutAction({ plan: 'SEASON_PASS', art56Consent: true });
    expect(h.reserveAsked).toEqual([34_176]);
    expect(amount(h.stripeParams[0])).toBe(99_900 - 34_176);
  });

  it('pide menos si el comprador VIENE de un referidor (su venta generará $150 de comisión): $156.96', async () => {
    h.available = 1_000_000;
    h.attributed = true;
    h.reserved = { redemptionId: 'red1', reservedCents: 15_696 };
    await startCheckoutAction({ plan: 'SEASON_PASS', art56Consent: true });
    expect(h.reserveAsked).toEqual([15_696]);
  });

  it('con crédito NO usa el Price fijo de Stripe (su monto no se puede rebajar)', async () => {
    process.env.STRIPE_PRICE_PASE_EB = 'price_fijo';
    await startCheckoutAction({ plan: 'SEASON_PASS', art56Consent: true });
    expect(h.stripeParams[0].line_items[0].price).toBeUndefined();
    expect(amount(h.stripeParams[0])).toBe(84_900);
  });

  it('sin crédito SÍ usa el Price fijo (control positivo del caso anterior)', async () => {
    process.env.STRIPE_PRICE_PASE_EB = 'price_fijo';
    h.available = 0;
    await startCheckoutAction({ plan: 'SEASON_PASS', art56Consent: true });
    expect(h.stripeParams[0].line_items[0].price).toBe('price_fijo');
  });
});

describe('si el pago no va a ocurrir, el crédito vuelve a sus lotes', () => {
  beforeEach(() => {
    h.available = 15_000;
    h.reserved = { redemptionId: 'red1', reservedCents: 15_000 };
  });

  it('falla la creación de la sesión de Stripe', async () => {
    h.failStripeSession = true;
    const res = await startCheckoutAction({ plan: 'SEASON_PASS', art56Consent: true });
    expect(res.ok).toBe(false);
    expect(h.releases).toEqual([['red1', 'session_failed']]);
  });

  it('falla la creación del Customer', async () => {
    h.failCustomer = true;
    const res = await startCheckoutAction({ plan: 'SEASON_PASS', art56Consent: true });
    expect(res.ok).toBe(false);
    expect(h.releases).toEqual([['red1', 'customer_failed']]);
  });

  it('falla la fila PENDING (y se alerta el pago sin fila que ya existía)', async () => {
    h.failPending = true;
    const res = await startCheckoutAction({ plan: 'SEASON_PASS', art56Consent: true });
    expect(res.ok).toBe(false);
    expect(h.releases).toEqual([['red1', 'subscription_failed']]);
    expect(reportControlFailure).toHaveBeenCalledWith('payment_consistency', 'degraded', expect.anything(), expect.anything());
  });

  it('el rojo es alcanzable: en el camino feliz NO se libera nada', async () => {
    const res = await startCheckoutAction({ plan: 'SEASON_PASS', art56Consent: true });
    expect(res.ok).toBe(true);
    expect(h.releases).toEqual([]);
  });
});

describe('si el crédito no se puede consultar o apartar', () => {
  it('NO cobra el precio completo por la libre: devuelve un error y avisa', async () => {
    h.available = 15_000;
    h.failReserve = true;
    const res = await startCheckoutAction({ plan: 'SEASON_PASS', art56Consent: true });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('inalcanzable');
    expect(res.message).toMatch(/crédito de referidos/);
    expect(h.stripeParams).toEqual([]);
    expect(reportControlFailure).toHaveBeenCalledWith('referral_credit', 'fail-closed', expect.anything(), expect.anything());
  });
});
