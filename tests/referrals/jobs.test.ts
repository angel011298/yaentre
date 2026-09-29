import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  order: [] as string[],
  backfill: (): Promise<unknown> => Promise.resolve({ examined: 2, recorded: 2, failed: 0 }),
  accrual: (): Promise<unknown> => Promise.resolve({ examined: 3, accrued: 3, reversed: 0, held: 0, failed: 0 }),
  stale: (): Promise<unknown> => Promise.resolve({ released: 1, healed: 0 }),
}));

vi.mock('@/lib/db/referrals', () => ({
  backfillMissingSales: vi.fn(async () => {
    h.order.push('backfill');
    return h.backfill();
  }),
  accrueDueSales: vi.fn(async () => {
    h.order.push('accrual');
    return h.accrual();
  }),
  releaseStaleRedemptions: vi.fn(async () => {
    h.order.push('redemptions');
    return h.stale();
  }),
}));
vi.mock('@/lib/observability/report', () => ({ reportSilentDegradation: vi.fn(), reportControlFailure: vi.fn() }));

const { runReferralJobs, stripeRefundLookup } = await import('@/lib/db/referral-jobs');
const { reportSilentDegradation } = await import('@/lib/observability/report');

const NOW = new Date('2026-11-10T14:00:00Z');
const DEPS = { getRefundedCents: async () => 0 };

beforeEach(() => {
  vi.clearAllMocks();
  h.order.length = 0;
  h.backfill = () => Promise.resolve({ examined: 2, recorded: 2, failed: 0 });
  h.accrual = () => Promise.resolve({ examined: 3, accrued: 3, reversed: 0, held: 0, failed: 0 });
  h.stale = () => Promise.resolve({ released: 1, healed: 0 });
});

describe('runReferralJobs', () => {
  it('corre los tres pasos, en orden, y reporta sus conteos', async () => {
    const s = await runReferralJobs(NOW, DEPS);
    expect(h.order).toEqual(['backfill', 'accrual', 'redemptions']);
    expect(s.failedSteps).toEqual([]);
    expect(s.accrual?.accrued).toBe(3);
    expect(s.backfill?.recorded).toBe(2);
    expect(s.redemptions?.released).toBe(1);
  });

  it('un paso que REVIENTA no detiene a los demás, se reporta y viaja en failedSteps (no un 0 limpio)', async () => {
    h.backfill = () => Promise.reject(new Error('db down'));
    const s = await runReferralJobs(NOW, DEPS);
    expect(h.order).toEqual(['backfill', 'accrual', 'redemptions']);
    expect(s.failedSteps).toEqual(['backfill']);
    expect(s.backfill).toBeNull();
    expect(reportSilentDegradation).toHaveBeenCalledWith('scheduled_job', expect.any(Error), { job: 'referrals', step: 'backfill' });
  });

  it('una acreditación con ventas que NO se pudieron verificar cuenta como fallo', async () => {
    h.accrual = () => Promise.resolve({ examined: 3, accrued: 2, reversed: 0, held: 0, failed: 1 });
    const s = await runReferralJobs(NOW, DEPS);
    expect(s.failedSteps).toEqual(['accrual:unverified']);
  });

  it('SIN Stripe no se acredita nada: el paso no corre y queda como fallo, no como éxito', async () => {
    const s = await runReferralJobs(NOW, null);
    expect(h.order).toEqual(['backfill', 'redemptions']);
    expect(s.accrual).toBeNull();
    expect(s.failedSteps).toEqual(['accrual:no_stripe']);
    expect(reportSilentDegradation).toHaveBeenCalled();
  });
});

describe('stripeRefundLookup', () => {
  const lookup = (charge: unknown) =>
    stripeRefundLookup({ paymentIntents: { retrieve: async () => ({ latest_charge: charge }) } } as never);

  it('lee lo reembolsado del cargo expandido', async () => {
    expect(await lookup({ amount_refunded: 5_000 }).getRefundedCents('pi_1')).toBe(5_000);
    expect(await lookup({ amount_refunded: 0 }).getRefundedCents('pi_1')).toBe(0);
  });

  it('sin cargo todavía: 0', async () => {
    expect(await lookup(null).getRefundedCents('pi_1')).toBe(0);
  });

  it('un cargo sin expandir (solo el id) es 0, no un error', async () => {
    expect(await lookup('ch_123').getRefundedCents('pi_1')).toBe(0);
  });

  it('pide el cargo EXPANDIDO al PaymentIntent correcto', async () => {
    const retrieve = vi.fn(async () => ({ latest_charge: null }));
    await stripeRefundLookup({ paymentIntents: { retrieve } } as never).getRefundedCents('pi_9');
    expect(retrieve).toHaveBeenCalledWith('pi_9', { expand: ['latest_charge'] });
  });
});
