import { beforeEach, describe, expect, it, vi } from 'vitest';

interface Row {
  id: string;
  stripePaymentId: string | null;
  refundDueCents: number;
  refundedCents: number;
  stripeRefundId?: string;
}

const h = vi.hoisted(() => ({
  row: null as null | Row,
  reports: [] as Array<{ control: string; outcome: string }>,
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    classSession: {
      findUnique: async () => (h.row ? { ...h.row } : null),
      updateMany: async ({ where, data }: { where: { refundedCents: number }; data: Partial<Row> }) => {
        if (!h.row || h.row.refundedCents !== where.refundedCents) return { count: 0 };
        Object.assign(h.row, data);
        return { count: 1 };
      },
    },
  },
}));
vi.mock('@/lib/observability/report', () => ({
  reportControlFailure: (control: string, outcome: string) => h.reports.push({ control, outcome }),
}));

const { refundClassIfDue } = await import('@/lib/classes/refunds');

interface StripeCall {
  params: { payment_intent: string; amount: number; metadata: Record<string, string> };
  options: { idempotencyKey: string };
}

function fakeStripe(behavior: () => Promise<{ id: string }> = async () => ({ id: 're_1' })) {
  const calls: StripeCall[] = [];
  const stripe = {
    refunds: {
      create: async (params: StripeCall['params'], options: StripeCall['options']) => {
        calls.push({ params, options });
        return behavior();
      },
    },
  };
  return { stripe: stripe as never, calls };
}

beforeEach(() => {
  h.row = { id: 'ckc1', stripePaymentId: 'pi_1', refundDueCents: 30000, refundedCents: 0 };
  h.reports.length = 0;
});

describe('refundClassIfDue', () => {
  it('reembolsa exactamente lo PENDIENTE (deuda − ya devuelto) y lo anota', async () => {
    const { stripe, calls } = fakeStripe();
    const r = await refundClassIfDue('ckc1', stripe);
    expect(r).toEqual({ status: 'refunded', amountCents: 30000 });
    expect(calls[0]!.params).toMatchObject({ payment_intent: 'pi_1', amount: 30000 });
    expect(h.row).toMatchObject({ refundedCents: 30000, stripeRefundId: 're_1' });
  });

  it('un reembolso PARCIAL previo se completa solo por la diferencia', async () => {
    h.row!.refundedCents = 12000;
    const { stripe, calls } = fakeStripe();
    await refundClassIfDue('ckc1', stripe);
    expect(calls[0]!.params.amount).toBe(18000);
    expect(h.row!.refundedCents).toBe(30000);
  });

  it('sin deuda no llama a Stripe', async () => {
    h.row!.refundDueCents = 0;
    const { stripe, calls } = fakeStripe();
    expect(await refundClassIfDue('ckc1', stripe)).toEqual({ status: 'nothing_due' });
    expect(calls).toEqual([]);
  });

  it('una deuda ya saldada no se vuelve a devolver (idempotencia por estado)', async () => {
    h.row!.refundedCents = 30000;
    const { stripe, calls } = fakeStripe();
    expect(await refundClassIfDue('ckc1', stripe)).toEqual({ status: 'nothing_due' });
    expect(calls).toEqual([]);
  });

  it('una clase inexistente no falla ni llama a Stripe', async () => {
    h.row = null;
    const { stripe, calls } = fakeStripe();
    expect(await refundClassIfDue('nope', stripe)).toEqual({ status: 'nothing_due' });
    expect(calls).toEqual([]);
  });

  it('la clave de idempotencia depende del estado: el mismo intento repite clave, uno distinto no', async () => {
    const a = fakeStripe();
    await refundClassIfDue('ckc1', a.stripe);
    // Se reproduce el MISMO estado de partida (como un reintento tras un timeout).
    h.row = { id: 'ckc1', stripePaymentId: 'pi_1', refundDueCents: 30000, refundedCents: 0 };
    const b = fakeStripe();
    await refundClassIfDue('ckc1', b.stripe);
    expect(a.calls[0]!.options.idempotencyKey).toBe(b.calls[0]!.options.idempotencyKey);
    expect(a.calls[0]!.options.idempotencyKey).toBe('class-refund:ckc1:0:30000');

    // Un segundo tramo (ya devuelto 10 000, faltan 20 000) usa OTRA clave.
    h.row = { id: 'ckc1', stripePaymentId: 'pi_1', refundDueCents: 30000, refundedCents: 10000 };
    const c = fakeStripe();
    await refundClassIfDue('ckc1', c.stripe);
    expect(c.calls[0]!.options.idempotencyKey).toBe('class-refund:ckc1:10000:20000');
  });

  it('deuda sin PaymentIntent: no llama a Stripe y REPORTA (datos incoherentes)', async () => {
    h.row!.stripePaymentId = null;
    const { stripe, calls } = fakeStripe();
    expect(await refundClassIfDue('ckc1', stripe)).toEqual({ status: 'no_payment' });
    expect(calls).toEqual([]);
    expect(h.reports).toEqual([{ control: 'payment_consistency', outcome: 'degraded' }]);
  });

  it('si Stripe FALLA, la deuda queda intacta para el reintento y se REPORTA (no es silencioso)', async () => {
    const { stripe } = fakeStripe(async () => {
      throw new Error('Stripe caído');
    });
    expect(await refundClassIfDue('ckc1', stripe)).toEqual({ status: 'failed' });
    expect(h.row!.refundedCents).toBe(0);
    expect(h.row!.refundDueCents).toBe(30000);
    expect(h.reports).toEqual([{ control: 'payment_consistency', outcome: 'degraded' }]);
  });

  it('un cargo ya reembolsado a mano en Stripe salda la deuda sin reintentar para siempre', async () => {
    const { stripe } = fakeStripe(async () => {
      throw Object.assign(new Error('ya reembolsado'), { code: 'charge_already_refunded' });
    });
    expect(await refundClassIfDue('ckc1', stripe)).toEqual({ status: 'refunded', amountCents: 0 });
    expect(h.row!.refundedCents).toBe(30000);
    expect(h.reports).toEqual([]);
  });

  it('si otro proceso ya movió refundedCents, NO se suma dos veces', async () => {
    const { stripe } = fakeStripe(async () => {
      // Mientras Stripe responde, otro proceso salda la misma deuda.
      h.row!.refundedCents = 30000;
      return { id: 're_1' };
    });
    await refundClassIfDue('ckc1', stripe);
    expect(h.row!.refundedCents).toBe(30000); // no 60 000
  });
});
