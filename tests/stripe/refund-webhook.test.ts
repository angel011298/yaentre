/* eslint-disable @typescript-eslint/no-explicit-any -- dobles de prueba: eventos y objetos de Stripe */
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `charge.refunded` y la reconciliación diaria de reembolsos.
 *
 * Lo que importa: (1) un evento duplicado no cuenta dos veces, (2) un pago que no
 * es de un plan se ignora sin ruido, (3) un reembolso TOTAL emitido fuera de la
 * app sobre un plan ACTIVO se REPORTA (no se revoca acceso en silencio ni se deja
 * pasar), (4) el reembolso emitido por soporte NO dispara esa alerta, (5) la venta
 * de referido de una compra reembolsada se revierte.
 */

const h = vi.hoisted(() => ({
  duplicate: false,
  recorded: null as any,
  recordCalls: [] as any[],
  subStatus: 'ACTIVE' as string | null,
  reverseCalls: [] as any[],
  reverseFails: false,
  reports: [] as any[],
  txMarker: 0,
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: { subscription: { findUnique: vi.fn(async () => (h.subStatus ? { status: h.subStatus } : null)) } },
}));
vi.mock('@/lib/db/billing', () => ({
  runIdempotent: vi.fn(async (_id: string, _type: string, work: (tx: unknown) => Promise<void>) => {
    if (h.duplicate) return 'duplicate';
    h.txMarker++;
    await work({ tx: true });
    return 'applied';
  }),
}));
vi.mock('@/lib/db/refunds', () => ({
  recordRefundsForPaymentIntent: vi.fn(async (tx: unknown, pi: string, refunds: any[], source: string) => {
    h.recordCalls.push({ tx, pi, refunds, source });
    return h.recorded;
  }),
}));
vi.mock('@/lib/db/referrals', () => ({
  reverseSaleForSubscription: vi.fn(async (id: string, reason: string) => {
    if (h.reverseFails) throw new Error('db down');
    h.reverseCalls.push([id, reason]);
    return { reversed: true, wasAccrued: false, consumedBeforeReversalCents: 0 };
  }),
}));
vi.mock('@/lib/observability/report', () => ({
  reportControlFailure: vi.fn((...args: unknown[]) => void h.reports.push(args)),
  reportSilentDegradation: vi.fn(),
}));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), withScope: vi.fn() }));

const { handleChargeRefunded, applyRefundConsequences, reconcileRecentRefunds, stripeListRefunds, toLite } = await import(
  '@/lib/stripe/refund-webhook'
);

const event = (pi: unknown = 'pi_1'): any => ({ id: 'evt_1', type: 'charge.refunded', data: { object: { id: 'ch_1', payment_intent: pi } } });
const lite = (over: Record<string, unknown> = {}) => ({ id: 're_1', amount: 99_900, created: 1_790_000_000, status: 'succeeded', reason: null, origin: null, ...over });
const recorded = (over: Record<string, unknown> = {}) => ({
  paymentId: 'pay1',
  subscriptionId: 'sub1',
  inserted: 1,
  refundedCents: 99_900,
  paymentAmountCents: 99_900,
  anyFromSupport: false,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  h.duplicate = false;
  h.recorded = recorded();
  h.recordCalls.length = 0;
  h.subStatus = 'ACTIVE';
  h.reverseCalls.length = 0;
  h.reverseFails = false;
  h.reports.length = 0;
  h.txMarker = 0;
});

describe('handleChargeRefunded', () => {
  it('pide los reembolsos a Stripe ANTES de abrir la transacción, y los escribe con fuente WEBHOOK', async () => {
    const order: string[] = [];
    const listRefunds = vi.fn(async () => {
      order.push(`list:${h.txMarker}`);
      return [lite()];
    });
    const res = await handleChargeRefunded(event(), { listRefunds });
    expect(order).toEqual(['list:0']); // la lista se pidió con la transacción aún sin abrir
    expect(h.recordCalls[0]).toMatchObject({ pi: 'pi_1', source: 'WEBHOOK' });
    expect(res).toEqual({ status: 'handled', type: 'charge.refunded', inserted: 1, refundedCents: 99_900 });
  });

  it('un evento DUPLICADO no escribe ni revierte nada', async () => {
    h.duplicate = true;
    const res = await handleChargeRefunded(event(), { listRefunds: async () => [lite()] });
    expect(res).toEqual({ status: 'duplicate', type: 'charge.refunded' });
    expect(h.recordCalls).toEqual([]);
    expect(h.reverseCalls).toEqual([]);
  });

  it('un cargo sin PaymentIntent se ignora sin llamar a Stripe', async () => {
    const listRefunds = vi.fn(async () => []);
    expect(await handleChargeRefunded(event(null), { listRefunds })).toEqual({ status: 'ignored', type: 'charge.refunded', reason: 'no_payment_intent' });
    expect(listRefunds).not.toHaveBeenCalled();
  });

  it('un PaymentIntent expandido (objeto) también se entiende', async () => {
    const listRefunds = vi.fn(async () => [lite()]);
    await handleChargeRefunded(event({ id: 'pi_obj' }), { listRefunds });
    expect(listRefunds).toHaveBeenCalledWith('pi_obj');
  });

  it('el pago de una CLASE u otro cobro que no es de un plan se ignora sin consecuencias', async () => {
    h.recorded = recorded({ paymentId: null, subscriptionId: null });
    const res = await handleChargeRefunded(event(), { listRefunds: async () => [lite()] });
    expect(res).toMatchObject({ status: 'ignored', reason: 'not_a_plan_payment' });
    expect(h.reverseCalls).toEqual([]);
    expect(h.reports).toEqual([]);
  });

  it('si Stripe falla al listar, el error SUBE (500 → Stripe reintenta) y no se marca el evento', async () => {
    await expect(handleChargeRefunded(event(), { listRefunds: async () => { throw new Error('Stripe caído'); } })).rejects.toThrow('Stripe caído');
    expect(h.txMarker).toBe(0);
  });
});

describe('applyRefundConsequences', () => {
  it('un reembolso (cualquier monto) revierte la venta de referido de esa compra', async () => {
    await applyRefundConsequences(recorded({ refundedCents: 5_000 }));
    expect(h.reverseCalls).toEqual([['sub1', 'refund']]);
  });

  it('sin dinero devuelto no revierte nada', async () => {
    await applyRefundConsequences(recorded({ refundedCents: 0 }));
    expect(h.reverseCalls).toEqual([]);
  });

  it('un fallo al revertir NO lanza (el reembolso ya es un hecho) y se reporta', async () => {
    h.reverseFails = true;
    await expect(applyRefundConsequences(recorded())).resolves.toBeUndefined();
    expect(h.reports.some((r) => r[0] === 'refund_reconciliation')).toBe(true);
  });

  it('TOTAL, plan ACTIVO y NO emitido por soporte → ALERTA (no se revoca el acceso en silencio)', async () => {
    await applyRefundConsequences(recorded());
    expect(h.reports).toHaveLength(1);
    expect(h.reports[0][0]).toBe('refund_reconciliation');
    expect(h.reports[0][1]).toBe('degraded');
    expect(String(h.reports[0][2])).toMatch(/plan ACTIVO/);
  });

  it('el mismo reembolso emitido por SOPORTE no alerta (esa acción ya está dando de baja el plan)', async () => {
    await applyRefundConsequences(recorded({ anyFromSupport: true }));
    expect(h.reports).toEqual([]);
  });

  it('un reembolso PARCIAL no alerta', async () => {
    await applyRefundConsequences(recorded({ refundedCents: 50_000 }));
    expect(h.reports).toEqual([]);
  });

  it('un plan que ya no está ACTIVO no alerta', async () => {
    h.subStatus = 'CANCELED';
    await applyRefundConsequences(recorded());
    expect(h.reports).toEqual([]);
  });
});

describe('toLite y stripeListRefunds', () => {
  it('toLite conserva el origen que soporte puso en la metadata', () => {
    expect(toLite({ id: 're_9', amount: 100, created: 5, status: 'succeeded', reason: 'requested_by_customer', metadata: { origin: 'support' } } as any)).toEqual({
      id: 're_9', amount: 100, created: 5, status: 'succeeded', reason: 'requested_by_customer', origin: 'support',
    });
    expect(toLite({ id: 're_9', amount: 1, created: 5, status: 'pending', reason: null, metadata: {} } as any).origin).toBeNull();
  });

  it('stripeListRefunds recorre TODAS las páginas del PaymentIntent', async () => {
    async function* pages() {
      yield { id: 'a', amount: 1, created: 1, status: 'succeeded', reason: null, metadata: {} };
      yield { id: 'b', amount: 2, created: 2, status: 'succeeded', reason: null, metadata: {} };
    }
    const list = vi.fn(() => pages());
    const out = await stripeListRefunds({ refunds: { list } } as any)('pi_1');
    expect(out.map((r) => r.id)).toEqual(['a', 'b']);
    expect(list).toHaveBeenCalledWith({ payment_intent: 'pi_1', limit: 100 });
  });
});

describe('reconcileRecentRefunds', () => {
  const NOW = new Date('2026-11-10T12:00:00.000Z');
  const stripeWith = (refunds: any[]) => ({
    refunds: {
      list: vi.fn(async function* () {
        for (const r of refunds) yield r;
      }),
    },
  });
  const r = (id: string, pi: string | null, extra: Record<string, unknown> = {}) => ({ id, amount: 1000, created: 1_790_000_000, status: 'succeeded', reason: null, payment_intent: pi, metadata: {}, ...extra });

  it('pide solo los últimos 3 días', async () => {
    const stripe = stripeWith([]);
    await reconcileRecentRefunds(stripe as any, NOW);
    expect(stripe.refunds.list).toHaveBeenCalledWith({ created: { gte: Math.floor(NOW.getTime() / 1000) - 3 * 86_400 }, limit: 100 });
  });

  it('agrupa por PaymentIntent y escribe con fuente RECONCILIATION', async () => {
    const out = await reconcileRecentRefunds(stripeWith([r('a', 'pi_1'), r('b', 'pi_1'), r('c', 'pi_2'), r('sin', null)]) as any, NOW);
    expect(out.examined).toBe(4);
    expect(h.recordCalls.map((c) => [c.pi, c.refunds.length, c.source])).toEqual([
      ['pi_1', 2, 'RECONCILIATION'],
      ['pi_2', 1, 'RECONCILIATION'],
    ]);
  });

  it('SOLO aplica consecuencias donde escribió algo nuevo (lo que el webhook no alcanzó)', async () => {
    h.recorded = recorded({ inserted: 0 });
    await reconcileRecentRefunds(stripeWith([r('a', 'pi_1')]) as any, NOW);
    expect(h.reverseCalls).toEqual([]);

    h.recorded = recorded({ inserted: 1 });
    await reconcileRecentRefunds(stripeWith([r('a', 'pi_1')]) as any, NOW);
    expect(h.reverseCalls).toEqual([['sub1', 'refund']]);
  });

  it('devuelve cuántas filas nuevas escribió', async () => {
    h.recorded = recorded({ inserted: 2 });
    const out = await reconcileRecentRefunds(stripeWith([r('a', 'pi_1'), r('b', 'pi_2')]) as any, NOW);
    expect(out.inserted).toBe(4);
  });
});
