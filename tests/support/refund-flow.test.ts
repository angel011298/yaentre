/* eslint-disable @typescript-eslint/no-explicit-any -- dobles de prueba: parámetros arbitrarios de Stripe */
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * El flujo del reembolso de soporte, con Stripe y la base simulados. La autoridad
 * (quién puede) ya la fija `authz.test.ts`; aquí se comprueba QUÉ se le manda a
 * Stripe y QUÉ pasa cuando algo falla DESPUÉS de mover el dinero: el reembolso
 * nunca se revierte, y tampoco queda en silencio.
 */

const h = vi.hoisted(() => ({
  stripe: [] as any[],
  stripeFails: [] as boolean[],
  refundStatus: 'succeeded',
  recorded: [] as any[],
  cancelFails: false,
  reverseFails: false,
  cancelResult: { canceled: true, creditRestoredCents: 15_000 },
  facts: null as any,
  audit: [] as any[],
  reports: [] as any[],
}));

vi.mock('@/lib/auth/guards', () => ({
  requireCapability: vi.fn(async () => ({
    authUser: { id: 'auth-uid', email: 'soporte@x.mx' },
    profile: { id: 'cku0000000000000000000001', role: 'SUPPORT' },
  })),
}));
vi.mock('@/lib/rate-limit/store', () => ({ consumeRateLimit: vi.fn(async () => ({ allowed: true, hits: 1, retryAfterSecs: 0 })) }));
vi.mock('@/lib/admin/audit-log', () => ({
  logAdminAction: vi.fn(async (action: string, _a: unknown, d: unknown) => void h.audit.push({ action, ...(d as object) })),
}));
vi.mock('@/lib/observability/report', () => ({
  reportControlFailure: vi.fn((...args: unknown[]) => void h.reports.push(args)),
  reportSilentDegradation: vi.fn((...args: unknown[]) => void h.reports.push(args)),
}));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), withScope: vi.fn() }));
vi.mock('@/lib/stripe/client', () => ({
  getStripe: () => ({
    refunds: {
      create: async (params: any, opts: any) => {
        const fail = h.stripeFails.shift();
        if (fail) throw new Error('Stripe caído');
        h.stripe.push({ params, opts });
        return { id: `re_${h.stripe.length}`, amount: params.amount, created: 1_790_000_000, status: h.refundStatus, reason: params.reason, metadata: params.metadata };
      },
    },
  }),
}));
vi.mock('@/lib/db/support', () => ({ loadRefundFacts: vi.fn(async () => h.facts), loadSupportFicha: vi.fn(), searchUsersForSupportDb: vi.fn() }));
vi.mock('@/lib/db/refunds', () => ({
  recordRefundsForPaymentIntent: vi.fn(async (_tx: unknown, pi: string, refunds: any[], source: string) => {
    h.recorded.push({ pi, refunds, source });
    return { paymentId: 'p', subscriptionId: 's', inserted: refunds.length, refundedCents: 0, paymentAmountCents: 0, anyFromSupport: true };
  }),
  cancelRefundedSubscription: vi.fn(async () => {
    if (h.cancelFails) throw new Error('db down');
    return h.cancelResult;
  }),
}));
vi.mock('@/lib/db/referrals', () => ({
  reverseSaleForSubscription: vi.fn(async () => {
    if (h.reverseFails) throw new Error('db down');
    return { reversed: true, wasAccrued: false, consumedBeforeReversalCents: 0 };
  }),
}));
vi.mock('@/lib/db/account', () => ({ buildUserDataExport: vi.fn() }));
vi.mock('@/lib/db/auth-users', () => ({ getAuthEmail: vi.fn() }));
vi.mock('@/lib/db/notifications', () => ({ setNotificationPreference: vi.fn() }));
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));

const { issueRefundForSupport } = await import('@/lib/support/service');

const SUB = 'cku0000000000000000000009';
const REASON = 'El titular lo pidió a las pocas horas.';
const NOW = new Date('2026-11-11T12:00:00.000Z');

function facts(over: Record<string, unknown> = {}) {
  return {
    id: SUB,
    plan: 'SEASON_PASS',
    status: 'ACTIVE',
    isComp: false,
    userProfileId: 'cku0000000000000000000003',
    paidAt: new Date('2026-11-10T12:00:00.000Z'),
    sessionsSinceActivation: 0,
    payments: [{ id: 'pay1', amountCents: 99_900, paymentIntentId: 'pi_1', refundedCents: 0 }],
    ...over,
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  h.stripe.length = 0;
  h.stripeFails.length = 0;
  h.refundStatus = 'succeeded';
  h.recorded.length = 0;
  h.cancelFails = false;
  h.reverseFails = false;
  h.cancelResult = { canceled: true, creditRestoredCents: 15_000 };
  h.facts = facts();
  h.audit.length = 0;
  h.reports.length = 0;
});

const run = () => issueRefundForSupport({ subscriptionId: SUB, reason: REASON });

describe('lo que se le manda a Stripe', () => {
  it('reembolsa lo COBRADO menos lo ya devuelto, sobre el PaymentIntent, marcado como emitido por soporte', async () => {
    h.facts = facts({ payments: [{ id: 'pay1', amountCents: 99_900, paymentIntentId: 'pi_1', refundedCents: 10_000 }] });
    expect(await run()).toMatchObject({ ok: true, data: { refundedCents: 89_900 } });
    expect(h.stripe).toHaveLength(1);
    expect(h.stripe[0].params).toMatchObject({
      payment_intent: 'pi_1',
      amount: 89_900,
      reason: 'requested_by_customer',
      metadata: { origin: 'support', subscriptionId: SUB, actor: 'cku0000000000000000000001' },
    });
  });

  it('la clave de idempotencia depende del pago y de lo ya devuelto: el reintento NO devuelve dos veces', async () => {
    await run();
    await run();
    expect(h.stripe[0].opts.idempotencyKey).toBe('support-refund:pay1:0');
    expect(h.stripe[1].opts.idempotencyKey).toBe(h.stripe[0].opts.idempotencyKey);
  });

  it('el monto NUNCA sale del input: el esquema es estricto y un campo de más es VALIDATION, sin llegar a Stripe', async () => {
    const res = await issueRefundForSupport({ subscriptionId: SUB, reason: REASON, amount: 1 } as never);
    expect(res).toMatchObject({ ok: false, code: 'VALIDATION' });
    expect(h.stripe).toEqual([]);
    expect(h.audit[0]).toMatchObject({ outcome: 'rejected' });
  });

  it('registra el reembolso con fuente SUPPORT', async () => {
    await run();
    expect(h.recorded[0]).toMatchObject({ pi: 'pi_1', source: 'SUPPORT' });
    expect(h.recorded[0].refunds[0]).toMatchObject({ id: 're_1', amount: 99_900, origin: 'support', status: 'succeeded' });
  });
});

describe('lo que NO se reembolsa', () => {
  it.each([
    ['un plan inexistente', null, 'NOT_FOUND'],
    ['una cortesía', facts({ isComp: true }), 'INVALID_STATE'],
    ['un plan sin cobros', facts({ payments: [] }), 'INVALID_STATE'],
    ['un plan ya reembolsado por completo', facts({ payments: [{ id: 'p', amountCents: 99_900, paymentIntentId: 'pi_1', refundedCents: 99_900 }] }), 'INVALID_STATE'],
    ['un cobro sin pago de Stripe asociado', facts({ payments: [{ id: 'p', amountCents: 99_900, paymentIntentId: null, refundedCents: 0 }] }), 'INVALID_STATE'],
  ])('%s → %s y Stripe no se llama', async (_n, f, code) => {
    h.facts = f;
    expect(await run()).toMatchObject({ ok: false, code });
    expect(h.stripe).toEqual([]);
    expect(h.audit[0]).toMatchObject({ outcome: 'rejected' });
  });
});

describe('DESPUÉS de mover el dinero: nada se revierte, nada queda en silencio', () => {
  it('éxito completo: baja del plan, crédito devuelto, venta de referido revertida, sin avisos', async () => {
    const res = await run();
    expect(res).toEqual({ ok: true, data: { refundedCents: 99_900, canceled: true, creditRestoredCents: 15_000, warnings: [] } });
    expect(h.reports).toEqual([]);
  });

  it('Stripe falla en el primer cobro: UPSTREAM, no se cambia NADA, queda reportado y en la bitácora como rechazo', async () => {
    h.stripeFails.push(true);
    const res = await run();
    expect(res).toMatchObject({ ok: false, code: 'UPSTREAM' });
    expect(h.recorded).toEqual([]);
    expect(h.audit[0]).toMatchObject({ outcome: 'rejected', metadata: { denied: 'STRIPE' } });
    expect(h.reports[0][0]).toBe('refund_reconciliation');
    expect(h.reports[0][1]).toBe('fail-closed');
  });

  it('el dinero salió pero NO se pudo dar de baja el plan: el reembolso se conserva, se avisa y se reporta', async () => {
    h.cancelFails = true;
    const res = await run();
    expect(res).toMatchObject({ ok: true, data: { refundedCents: 99_900, canceled: false } });
    expect((res as any).data.warnings.join(' ')).toMatch(/dar de baja el plan/);
    expect(h.reports.some((r) => r[0] === 'refund_reconciliation' && r[1] === 'degraded')).toBe(true);
    expect(h.audit[0]).toMatchObject({ metadata: { refundedCents: 99_900, canceled: false, warnings: 1 } });
  });

  it('no se pudo revertir la venta de referido: aviso y reporte, el reembolso sigue en pie', async () => {
    h.reverseFails = true;
    const res = await run();
    expect(res).toMatchObject({ ok: true, data: { refundedCents: 99_900, canceled: true } });
    expect((res as any).data.warnings.join(' ')).toMatch(/referido/);
    expect(h.reports).toHaveLength(1);
  });

  it('un reembolso PENDIENTE en Stripe (OXXO/SPEI) se avisa; el plan se da de baja igual (el dinero va en camino)', async () => {
    h.refundStatus = 'pending';
    const res = await run();
    expect(res).toMatchObject({ ok: true, data: { canceled: true } });
    expect((res as any).data.warnings.join(' ')).toMatch(/pendiente/);
  });

  it('con DOS cobros y el segundo falla: se conserva lo devuelto del primero y el plan NO se da de baja a medias', async () => {
    h.facts = facts({
      payments: [
        { id: 'pay1', amountCents: 60_000, paymentIntentId: 'pi_1', refundedCents: 0 },
        { id: 'pay2', amountCents: 39_900, paymentIntentId: 'pi_2', refundedCents: 0 },
      ],
    });
    h.stripeFails.push(false, true);
    const res = await run();
    expect(res).toMatchObject({ ok: true, data: { refundedCents: 60_000, canceled: false } });
    expect((res as any).data.warnings.join(' ')).toMatch(/solo una parte/);
    expect(h.recorded).toHaveLength(1);
  });

  it('la bitácora lleva el motivo y NO lleva datos personales', async () => {
    await run();
    const row = h.audit[0];
    expect(row).toMatchObject({ action: 'refund.issued', reason: REASON, targetKind: 'payment' });
    expect(JSON.stringify(row)).not.toMatch(/@|correo|pi_1/);
  });
});
