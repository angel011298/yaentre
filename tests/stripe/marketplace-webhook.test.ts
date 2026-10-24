import { describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import {
  handleMarketplaceEvent,
  marketplaceKindOf,
  type MarketplaceStore,
  type PaidCheckout,
} from '@/lib/stripe/marketplace-webhook';

/**
 * G103 — el pre-enrutador del webhook. La garantía que más importa: un evento
 * de PLAN (sin `metadata.kind`) devuelve `null` y sigue a `handleStripeEvent`
 * exactamente como antes; uno del marketplace nunca llega a ese camino (que
 * buscaría una Subscription por id de sesión y respondería 500 para siempre).
 */

function sessionEvent(
  type: string,
  session: Partial<Stripe.Checkout.Session>,
  id = 'evt_1'
): Stripe.Event {
  return {
    id,
    type,
    created: 1_790_000_000,
    livemode: false,
    data: {
      object: {
        id: 'cs_test_1',
        object: 'checkout.session',
        payment_status: 'paid',
        payment_method_types: ['card', 'oxxo', 'customer_balance'],
        amount_total: 49_900,
        currency: 'mxn',
        payment_intent: 'pi_1',
        customer: 'cus_1',
        metadata: {},
        ...session,
      },
    },
  } as unknown as Stripe.Event;
}

function storeSpy(opts: { confirmOutcome?: 'booked' | 'conflict' | 'already'; knownRefunds?: string[] } = {}) {
  const calls: PaidCheckout[] = [];
  const processed = new Set<string>();
  const once = (eventId: string) => {
    if (processed.has(eventId)) return 'duplicate' as const;
    processed.add(eventId);
    return 'applied' as const;
  };
  const store: MarketplaceStore = {
    applyAccessExtension: vi.fn(async (eventId: string, _t: string, paid: PaidCheckout) => {
      const r = once(eventId);
      if (r === 'applied') calls.push(paid);
      return r;
    }),
    confirmClassBooking: vi.fn(async (eventId: string) => {
      const r = once(eventId);
      return { result: r, outcome: r === 'applied' ? (opts.confirmOutcome ?? 'booked') : null };
    }),
    releaseClassBooking: vi.fn(async (eventId: string) => once(eventId)),
    recordRefund: vi.fn(async (eventId: string, _t: string, pi: string) =>
      (opts.knownRefunds ?? []).includes(pi) ? once(eventId) : ('unknown' as const)
    ),
    refundClassPayment: vi.fn(async () => undefined),
  };
  return { store, calls };
}

const EXT_MD = {
  kind: 'access_extension',
  userProfileId: 'cku1',
  subscriptionId: 'cks1',
  expectedAmountCents: '49900',
};

describe('marketplaceKindOf', () => {
  it('reconoce solo las tres marcas del servidor', () => {
    expect(marketplaceKindOf({ kind: 'access_extension' })).toBe('access_extension');
    expect(marketplaceKindOf({ kind: 'class_booking' })).toBe('class_booking');
    expect(marketplaceKindOf({ kind: 'course_purchase' })).toBe('course_purchase');
    expect(marketplaceKindOf({ kind: 'plan' })).toBeNull();
    expect(marketplaceKindOf({})).toBeNull();
    expect(marketplaceKindOf(null)).toBeNull();
  });
});

describe('handleMarketplaceEvent — planes intactos', () => {
  it('un checkout de PLAN (sin kind) no se toca: devuelve null', async () => {
    const { store } = storeSpy();
    const ev = sessionEvent('checkout.session.completed', {
      metadata: { userProfileId: 'cku1', plan: 'SEASON_PASS', season: 'EARLY_BIRD' },
    });
    expect(await handleMarketplaceEvent(ev, store)).toBeNull();
    expect(store.applyAccessExtension).not.toHaveBeenCalled();
  });

  it('eventos de suscripción recurrente (Mensual) tampoco', async () => {
    const { store } = storeSpy();
    const ev = { id: 'evt_s', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1' } } } as unknown as Stripe.Event;
    expect(await handleMarketplaceEvent(ev, store)).toBeNull();
  });
});

describe('handleMarketplaceEvent — extensión de vigencia', () => {
  it('pagada con tarjeta → se aplica una vez, con el monto y el método de la sesión', async () => {
    const { store, calls } = storeSpy();
    const r = await handleMarketplaceEvent(sessionEvent('checkout.session.completed', { metadata: EXT_MD }), store);
    expect(r).toEqual({ status: 'handled', type: 'checkout.session.completed', kind: 'access_extension', action: 'extended' });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ amountMxn: 49_900, currency: 'mxn', method: 'CARD', paymentIntentId: 'pi_1' });
    expect(calls[0].metadata.subscriptionId).toBe('cks1');
  });

  it('el MISMO evento reenviado por Stripe es duplicado: no extiende dos veces', async () => {
    const { store, calls } = storeSpy();
    const ev = sessionEvent('checkout.session.completed', { metadata: EXT_MD }, 'evt_dup');
    await handleMarketplaceEvent(ev, store);
    const second = await handleMarketplaceEvent(ev, store);
    expect(second?.status).toBe('duplicate');
    expect(calls).toHaveLength(1);
  });

  it('OXXO/SPEI generado (unpaid) → pendiente, la vigencia NO cambia', async () => {
    const { store } = storeSpy();
    const r = await handleMarketplaceEvent(
      sessionEvent('checkout.session.completed', { metadata: EXT_MD, payment_status: 'unpaid' }),
      store
    );
    expect(r).toMatchObject({ status: 'handled', action: 'pending' });
    expect(store.applyAccessExtension).not.toHaveBeenCalled();
  });

  it('confirmación asíncrona → se aplica, etiquetada como pago asíncrono', async () => {
    const { store, calls } = storeSpy();
    await handleMarketplaceEvent(
      sessionEvent('checkout.session.async_payment_succeeded', {
        metadata: EXT_MD,
        payment_method_types: ['oxxo'],
      }),
      store
    );
    expect(calls[0].method).toBe('OXXO');
  });

  it('pago asíncrono fallido o sesión caducada → nada que aplicar', async () => {
    const { store } = storeSpy();
    expect(
      await handleMarketplaceEvent(sessionEvent('checkout.session.async_payment_failed', { metadata: EXT_MD }), store)
    ).toMatchObject({ action: 'failed' });
    expect(
      await handleMarketplaceEvent(sessionEvent('checkout.session.expired', { metadata: EXT_MD, payment_status: 'unpaid' }), store)
    ).toMatchObject({ action: 'ignored' });
    expect(store.applyAccessExtension).not.toHaveBeenCalled();
  });
});

// ─────────────────────────── Clases en vivo ───────────────────────────

const CLASS_MD = { kind: 'class_booking', classSessionId: 'ckcls1', studentProfileId: 'cku1', teacherId: 'ckt1' };

function piEvent(type: string, pi: Partial<Stripe.PaymentIntent>, id = 'evt_pi'): Stripe.Event {
  return {
    id,
    type,
    created: 1_790_000_000,
    livemode: false,
    data: { object: { id: 'pi_cls', object: 'payment_intent', amount: 30_000, amount_received: 30_000, currency: 'mxn', customer: 'cus_1', metadata: {}, ...pi } },
  } as unknown as Stripe.Event;
}

describe('handleMarketplaceEvent — reserva de clases', () => {
  it('Checkout pagado → confirma la reserva con el monto y el PaymentIntent de la sesión', async () => {
    const { store } = storeSpy();
    const r = await handleMarketplaceEvent(
      sessionEvent('checkout.session.completed', { metadata: CLASS_MD, amount_total: 30_000 }),
      store
    );
    expect(r).toMatchObject({ status: 'handled', kind: 'class_booking', action: 'booked' });
    expect(store.confirmClassBooking).toHaveBeenCalledWith('evt_1', 'checkout.session.completed', {
      classSessionId: 'ckcls1',
      studentProfileId: 'cku1',
      paymentIntentId: 'pi_1',
      stripeCustomerId: 'cus_1',
      amountMxn: 30_000,
      currency: 'mxn',
    });
    expect(store.applyAccessExtension).not.toHaveBeenCalled();
  });

  it('el horario ya no estaba (apartado vencido y ocupado) → reembolso automático', async () => {
    const { store } = storeSpy({ confirmOutcome: 'conflict' });
    const r = await handleMarketplaceEvent(sessionEvent('checkout.session.completed', { metadata: CLASS_MD }), store);
    expect(r).toMatchObject({ action: 'refunded_conflict' });
    expect(store.refundClassPayment).toHaveBeenCalledWith('ckcls1', 'pi_1');
  });

  it('un evento duplicado NO reembolsa dos veces', async () => {
    const { store } = storeSpy({ confirmOutcome: 'conflict' });
    const ev = sessionEvent('checkout.session.completed', { metadata: CLASS_MD }, 'evt_dup_cls');
    await handleMarketplaceEvent(ev, store);
    const again = await handleMarketplaceEvent(ev, store);
    expect(again?.status).toBe('duplicate');
    expect(store.refundClassPayment).toHaveBeenCalledTimes(1);
  });

  it('Checkout caducado → libera el horario', async () => {
    const { store } = storeSpy();
    await handleMarketplaceEvent(sessionEvent('checkout.session.expired', { metadata: CLASS_MD, payment_status: 'unpaid' }), store);
    expect(store.releaseClassBooking).toHaveBeenCalledWith('evt_1', 'checkout.session.expired', 'ckcls1', 'checkout_expired');
  });

  it('cobro en un clic exitoso (payment_intent.succeeded) → confirma con lo RECIBIDO', async () => {
    const { store } = storeSpy();
    await handleMarketplaceEvent(piEvent('payment_intent.succeeded', { metadata: { ...CLASS_MD, flow: 'one_click' } }), store);
    expect(store.confirmClassBooking).toHaveBeenCalledWith(
      'evt_pi',
      'payment_intent.succeeded',
      expect.objectContaining({ classSessionId: 'ckcls1', paymentIntentId: 'pi_cls', amountMxn: 30_000, currency: 'mxn' })
    );
  });

  it('un PaymentIntent sin marca (de un plan) no es del marketplace', async () => {
    const { store } = storeSpy();
    expect(await handleMarketplaceEvent(piEvent('payment_intent.succeeded', { metadata: {} }), store)).toBeNull();
  });

  it('tarjeta rechazada en un clic → libera; dentro de Checkout NO (el alumno puede reintentar)', async () => {
    const one = storeSpy();
    await handleMarketplaceEvent(piEvent('payment_intent.payment_failed', { metadata: { ...CLASS_MD, flow: 'one_click' } }), one.store);
    expect(one.store.releaseClassBooking).toHaveBeenCalledWith('evt_pi', 'payment_intent.payment_failed', 'ckcls1', 'payment_failed');

    const co = storeSpy();
    const r = await handleMarketplaceEvent(piEvent('payment_intent.payment_failed', { metadata: { ...CLASS_MD, flow: 'checkout' } }), co.store);
    expect(r).toMatchObject({ action: 'ignored' });
    expect(co.store.releaseClassBooking).not.toHaveBeenCalled();
  });
});

describe('handleMarketplaceEvent — reembolsos', () => {
  const refund = (pi: string) =>
    ({ id: 'evt_rf', type: 'charge.refunded', created: 1, livemode: false, data: { object: { id: 'ch_1', payment_intent: pi, amount_refunded: 30_000 } } }) as unknown as Stripe.Event;

  it('un reembolso de un cobro que no es del marketplace sigue a los planes', async () => {
    const { store } = storeSpy();
    expect(await handleMarketplaceEvent(refund('pi_plan'), store)).toBeNull();
  });

  it('un reembolso de una clase se registra', async () => {
    const { store } = storeSpy({ knownRefunds: ['pi_cls'] });
    expect(await handleMarketplaceEvent(refund('pi_cls'), store)).toMatchObject({ action: 'refund_recorded' });
    expect(store.recordRefund).toHaveBeenCalledWith('evt_rf', 'charge.refunded', 'pi_cls', 30_000);
  });
});
