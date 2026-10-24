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

function storeSpy() {
  const calls: PaidCheckout[] = [];
  const processed = new Set<string>();
  const store: MarketplaceStore = {
    applyAccessExtension: vi.fn(async (eventId: string, _t: string, paid: PaidCheckout) => {
      if (processed.has(eventId)) return 'duplicate' as const;
      processed.add(eventId);
      calls.push(paid);
      return 'applied' as const;
    }),
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
