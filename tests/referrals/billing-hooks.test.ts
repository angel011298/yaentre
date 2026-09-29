import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

/**
 * Los tres ganchos del programa de referidos en el camino del PAGO.
 *
 *  1. Al activar el plan, el crédito apartado se CONSUME en la MISMA transacción.
 *  2. La venta atribuida se registra DESPUÉS del commit — jamás dentro.
 *  3. Un checkout fallido/expirado libera el crédito en su transacción.
 *
 * El orden de las llamadas se registra en un solo arreglo para poder afirmar
 * «antes» y «después», que es justo lo que importa aquí.
 */

const h = vi.hoisted(() => ({
  log: [] as string[],
  duplicate: false,
  consumeResult: 'consumed' as 'consumed' | 'none' | 'was_released',
  sub: { id: 'sub1', plan: 'SEASON_PASS', season: 'EARLY_BIRD', status: 'PENDING' } as Record<string, unknown>,
}));

vi.mock('@/lib/db/referrals', () => ({
  consumeRedemptionTx: vi.fn(async () => {
    h.log.push('consume');
    return h.consumeResult;
  }),
  releaseRedemptionForSubscriptionTx: vi.fn(async (_tx: unknown, id: string, reason: string) => {
    h.log.push(`release:${id}:${reason}`);
    return true;
  }),
  recordReferralSaleSafely: vi.fn(async (id: string) => {
    h.log.push(`record:${id}`);
  }),
  attachRedemptionToSubscriptionTx: vi.fn(async (_tx: unknown, redemptionId: string, subId: string) => {
    h.log.push(`attach:${redemptionId}:${subId}`);
  }),
}));
vi.mock('@/lib/observability/report', () => ({ reportControlFailure: vi.fn(), reportSilentDegradation: vi.fn() }));
vi.mock('@/lib/analytics/server', () => ({ trackServerEvent: vi.fn(async () => {}) }));

vi.mock('@/lib/db/prisma', () => {
  const tx = {
    processedStripeEvent: {
      create: async () => {
        h.log.push('event-marked');
        if (h.duplicate) {
          throw new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' });
        }
      },
    },
    subscription: {
      findUnique: async (args: { select?: unknown }) =>
        args.select
          ? { id: 'sub1', status: h.sub.status }
          : { ...h.sub, userProfileId: 'prof1', expiresAt: null, userProfile: { id: 'prof1', targetExam: null } },
      updateMany: async () => {
        h.log.push('sub-updated');
        return { count: 1 };
      },
      create: async () => ({ id: 'sub-new' }),
    },
    userProfile: { findUnique: async () => ({ badges: ['EARLY_BIRD'] }), update: async () => ({}) },
    payment: {
      upsert: async () => ({}),
      create: async () => ({}),
      updateMany: async () => {
        h.log.push('payments-failed');
        return { count: 1 };
      },
    },
  };
  return {
    prisma: {
      subscription: { create: async () => ({}) },
      $transaction: async (cb: (t: unknown) => Promise<void>) => {
        await cb(tx);
        h.log.push('COMMIT');
      },
    },
  };
});

const { billingStore, createPendingSubscription } = await import('@/lib/db/billing');
const { handleStripeEvent } = await import('@/lib/stripe/webhook');
const { reportControlFailure } = await import('@/lib/observability/report');

const ACTIVATION = {
  checkoutSessionId: 'cs1',
  paymentIntentId: 'pi1',
  stripeCustomerId: 'cus1',
  stripeSubscriptionId: null,
  method: 'CARD' as const,
  amountMxn: 84_900,
};

beforeEach(() => {
  vi.clearAllMocks();
  h.log.length = 0;
  h.duplicate = false;
  h.consumeResult = 'consumed';
  h.sub = { id: 'sub1', plan: 'SEASON_PASS', season: 'EARLY_BIRD', status: 'PENDING' };
});

describe('activateFromCheckout', () => {
  it('consume el crédito DENTRO de la transacción y registra la venta DESPUÉS del commit', async () => {
    const r = await billingStore.activateFromCheckout('evt1', 'checkout.session.completed', ACTIVATION);
    expect(r).toBe('applied');
    expect(h.log).toEqual(['event-marked', 'sub-updated', 'consume', 'COMMIT', 'record:sub1']);
    expect(h.log.indexOf('consume')).toBeLessThan(h.log.indexOf('COMMIT'));
    expect(h.log.indexOf('record:sub1')).toBeGreaterThan(h.log.indexOf('COMMIT'));
  });

  it('un evento DUPLICADO no consume ni registra nada (idempotencia por event.id)', async () => {
    h.duplicate = true;
    const r = await billingStore.activateFromCheckout('evt1', 'checkout.session.completed', ACTIVATION);
    expect(r).toBe('duplicate');
    expect(h.log).toEqual(['event-marked']);
  });

  it('un plan que YA estaba activo (reintento) no vuelve a registrar la venta, pero sí libera un apartado colgado', async () => {
    h.sub = { ...h.sub, status: 'ACTIVE' };
    await billingStore.activateFromCheckout('evt2', 'checkout.session.completed', ACTIVATION);
    expect(h.log).toContain('consume');
    expect(h.log.some((l) => l.startsWith('record:'))).toBe(false);
  });

  it('un pago que llega sobre crédito YA devuelto se reporta (no se puede reclamar, pero no queda en silencio)', async () => {
    h.consumeResult = 'was_released';
    await billingStore.activateFromCheckout('evt3', 'checkout.session.completed', ACTIVATION);
    expect(reportControlFailure).toHaveBeenCalledWith('referral_credit', 'degraded', expect.any(Error), { subscriptionId: 'sub1' });
    // …y la activación y la venta siguen su curso: el alumno pagó.
    expect(h.log).toContain('record:sub1');
  });

  it('el rojo es alcanzable: con consumo normal NO hay reporte', async () => {
    await billingStore.activateFromCheckout('evt4', 'checkout.session.completed', ACTIVATION);
    expect(reportControlFailure).not.toHaveBeenCalled();
  });
});

describe('failCheckout / checkout.session.expired', () => {
  it('libera el crédito en la MISMA transacción que marca el pago como fallido', async () => {
    await billingStore.failCheckout('evt5', 'checkout.session.async_payment_failed', 'cs1');
    expect(h.log).toEqual(['event-marked', 'sub-updated', 'payments-failed', 'release:sub1:checkout_failed', 'COMMIT']);
  });

  it('una suscripción que ya estaba ACTIVE no libera nada (el pago sí ocurrió)', async () => {
    h.sub = { ...h.sub, status: 'ACTIVE' };
    await billingStore.failCheckout('evt6', 'checkout.session.async_payment_failed', 'cs1');
    expect(h.log.some((l) => l.startsWith('release'))).toBe(false);
  });

  it('el evento checkout.session.expired cierra el checkout igual que un pago asíncrono fallido', async () => {
    const store = { failCheckout: vi.fn(async () => 'applied' as const) } as never;
    const result = await handleStripeEvent(
      { id: 'evt7', type: 'checkout.session.expired', data: { object: { id: 'cs9' } } } as never,
      store
    );
    expect(result).toEqual({ status: 'handled', type: 'checkout.session.expired', action: 'failed' });
    expect((store as { failCheckout: ReturnType<typeof vi.fn> }).failCheckout).toHaveBeenCalledWith('evt7', 'checkout.session.expired', 'cs9');
  });

  it('un expired duplicado se reporta como duplicado', async () => {
    const store = { failCheckout: vi.fn(async () => 'duplicate' as const) } as never;
    const result = await handleStripeEvent(
      { id: 'evt7', type: 'checkout.session.expired', data: { object: { id: 'cs9' } } } as never,
      store
    );
    expect(result).toEqual({ status: 'duplicate', type: 'checkout.session.expired' });
  });
});

describe('createPendingSubscription con crédito', () => {
  const base = { userProfileId: 'prof1', plan: 'SEASON_PASS' as const, season: 'EARLY_BIRD' as const, checkoutSessionId: 'cs1' };

  it('con apartado: la fila PENDING y su unión con el apartado nacen en UNA transacción', async () => {
    await createPendingSubscription({ ...base, creditRedemptionId: 'red1' });
    expect(h.log).toEqual(['attach:red1:sub-new', 'COMMIT']);
  });

  it('sin apartado: un create simple, sin transacción ni unión', async () => {
    await createPendingSubscription(base);
    expect(h.log).toEqual([]);
  });
});
