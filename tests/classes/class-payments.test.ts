import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Pago de una CLASE por webhook — el dinero de este flujo. Doble en memoria de
 * la transacción: cada `updateMany` respeta la condición de estado del `where`
 * (así se prueba la atomicidad real de «solo uno gana»), y `runIdempotent`
 * reproduce el contrato de F8 — el evento se marca dentro de la transacción y su
 * marcador se revierte si el trabajo falla.
 */

interface FakeClass {
  id: string;
  status: string;
  finalTariffCents: number;
  paidAt: Date | null;
  stripePaymentId: string | null;
  refundDueCents: number;
  cancelledBy?: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  commissionCents: number;
  teacherPayCents: number;
}

const h = vi.hoisted(() => ({
  classes: new Map<string, FakeClass>(),
  seen: new Set<string>(),
  updateCalls: [] as string[],
}));

const fakeTx = {
  classSession: {
    findUnique: async ({ where }: { where: { id: string } }) => h.classes.get(where.id) ?? null,
    update: async ({ where, data }: { where: { id: string }; data: Partial<FakeClass> }) => {
      h.updateCalls.push(`update:${where.id}`);
      Object.assign(h.classes.get(where.id)!, data);
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: { id: string; status?: string };
      data: Partial<FakeClass>;
    }) => {
      const c = h.classes.get(where.id);
      if (!c || (where.status !== undefined && c.status !== where.status)) return { count: 0 };
      h.updateCalls.push(`updateMany:${where.id}`);
      Object.assign(c, data);
      return { count: 1 };
    },
  },
};

vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/db/billing', () => ({
  runIdempotent: async (eventId: string, _type: string, work: (tx: typeof fakeTx) => Promise<void>) => {
    if (h.seen.has(eventId)) return 'duplicate';
    h.seen.add(eventId);
    try {
      await work(fakeTx);
    } catch (err) {
      h.seen.delete(eventId); // el marcador se revierte con la transacción
      throw err;
    }
    return 'applied';
  },
}));

const { classPaymentStore } = await import('@/lib/db/classes');
const { classBookingRef, handleClassPaymentEvent } = await import('@/lib/stripe/class-payments');

const NOW = new Date('2026-11-01T12:00:00Z');

function seed(over: Partial<FakeClass> = {}): FakeClass {
  const c: FakeClass = {
    id: 'ckclass1',
    status: 'PENDING_PAYMENT',
    finalTariffCents: 30000,
    paidAt: null,
    stripePaymentId: null,
    refundDueCents: 0,
    commissionCents: 7500,
    teacherPayCents: 22500,
    ...over,
  };
  h.classes.set(c.id, c);
  return c;
}

const pay = (over: Partial<Parameters<typeof classPaymentStore.confirmPayment>[2]> = {}) => ({
  classSessionId: 'ckclass1',
  paymentIntentId: 'pi_1',
  amountReceivedCents: 30000,
  currency: 'mxn',
  now: NOW,
  ...over,
});

beforeEach(() => {
  h.classes.clear();
  h.seen.clear();
  h.updateCalls.length = 0;
});

describe('confirmPayment — el cobro llega por el WEBHOOK', () => {
  it('una clase PENDING_PAYMENT con el monto exacto pasa a BOOKED y sella el cobro', async () => {
    const c = seed();
    const r = await classPaymentStore.confirmPayment('evt_1', 'payment_intent.succeeded', pay());
    expect(r).toEqual({ kind: 'booked', classId: 'ckclass1' });
    expect(c.status).toBe('BOOKED');
    expect(c.paidAt).toEqual(NOW);
    expect(c.stripePaymentId).toBe('pi_1');
    expect(c.refundDueCents).toBe(0);
  });

  it('el MISMO evento repetido es idempotente: no vuelve a tocar nada', async () => {
    seed();
    await classPaymentStore.confirmPayment('evt_1', 'payment_intent.succeeded', pay());
    const before = h.updateCalls.length;
    const again = await classPaymentStore.confirmPayment('evt_1', 'payment_intent.succeeded', pay());
    expect(again).toEqual({ kind: 'duplicate' });
    expect(h.updateCalls.length).toBe(before);
  });

  it('un evento DISTINTO para una clase ya BOOKED no la modifica ni pide reembolso', async () => {
    const c = seed();
    await classPaymentStore.confirmPayment('evt_1', 'payment_intent.succeeded', pay());
    const r = await classPaymentStore.confirmPayment('evt_2', 'payment_intent.succeeded', pay({ paymentIntentId: 'pi_otro' }));
    expect(r).toEqual({ kind: 'noop' });
    expect(c.status).toBe('BOOKED');
    expect(c.stripePaymentId).toBe('pi_1'); // no se sobrescribió con el segundo cobro
    expect(c.refundDueCents).toBe(0);
  });

  it('un monto DISTINTO al de la clase NO la reserva: se cancela y todo lo cobrado queda como reembolso', async () => {
    const c = seed();
    const r = await classPaymentStore.confirmPayment('evt_1', 'payment_intent.succeeded', pay({ amountReceivedCents: 10000 }));
    expect(r).toEqual({ kind: 'mismatch', classId: 'ckclass1' });
    expect(c.status).toBe('CANCELLED');
    expect(c.cancellationReason).toBe('PAYMENT_MISMATCH');
    expect(c.refundDueCents).toBe(10000);
    expect(c.teacherPayCents).toBe(0);
    expect(c.commissionCents).toBe(0);
  });

  it('un cobro de MÁS también es discrepancia (no se le cobra de más a nadie sin devolverlo)', async () => {
    const c = seed();
    await classPaymentStore.confirmPayment('evt_1', 'payment_intent.succeeded', pay({ amountReceivedCents: 45000 }));
    expect(c.status).toBe('CANCELLED');
    expect(c.refundDueCents).toBe(45000);
  });

  it('una moneda distinta de MXN es discrepancia aunque el número coincida', async () => {
    const c = seed();
    const r = await classPaymentStore.confirmPayment('evt_1', 'payment_intent.succeeded', pay({ currency: 'usd' }));
    expect(r.kind).toBe('mismatch');
    expect(c.status).toBe('CANCELLED');
  });

  it('un pago TARDÍO (la clase ya se soltó) no la revive: queda como reembolso completo', async () => {
    const c = seed({ status: 'CANCELLED', cancellationReason: 'PAYMENT_TIMEOUT' });
    const r = await classPaymentStore.confirmPayment('evt_1', 'payment_intent.succeeded', pay());
    expect(r).toEqual({ kind: 'refund_due', classId: 'ckclass1' });
    expect(c.status).toBe('CANCELLED'); // NO vuelve a BOOKED
    expect(c.refundDueCents).toBe(30000);
    expect(c.paidAt).toEqual(NOW);
    expect(c.stripePaymentId).toBe('pi_1');
  });

  it('una clase cancelada DESPUÉS de pagarse no genera una segunda deuda por un evento repetido', async () => {
    const c = seed({ status: 'CANCELLED', paidAt: new Date('2026-10-30T00:00:00Z'), refundDueCents: 30000, stripePaymentId: 'pi_1' });
    const r = await classPaymentStore.confirmPayment('evt_9', 'payment_intent.succeeded', pay());
    expect(r).toEqual({ kind: 'noop' });
    expect(c.refundDueCents).toBe(30000); // no se duplicó
  });

  it('una clase inexistente devuelve not_found (el marcador queda: no se reintenta para siempre)', async () => {
    const r = await classPaymentStore.confirmPayment('evt_1', 'payment_intent.succeeded', pay({ classSessionId: 'no-existe' }));
    expect(r).toEqual({ kind: 'not_found' });
  });

  it('si el trabajo FALLA, el marcador del evento se revierte y el reintento de Stripe sí procesa', async () => {
    const c = seed();
    const original = fakeTx.classSession.updateMany;
    fakeTx.classSession.updateMany = async () => {
      throw new Error('base caída');
    };
    await expect(classPaymentStore.confirmPayment('evt_1', 'payment_intent.succeeded', pay())).rejects.toThrow('base caída');
    expect(h.seen.has('evt_1')).toBe(false);

    fakeTx.classSession.updateMany = original;
    const retry = await classPaymentStore.confirmPayment('evt_1', 'payment_intent.succeeded', pay());
    expect(retry).toEqual({ kind: 'booked', classId: 'ckclass1' });
    expect(c.status).toBe('BOOKED');
  });
});

describe('expireCheckout — una sesión sin pagar suelta el horario', () => {
  it('cancela una clase PENDING_PAYMENT con causa PAYMENT_TIMEOUT, sin deuda', async () => {
    const c = seed();
    const r = await classPaymentStore.expireCheckout('evt_1', 'checkout.session.expired', { classSessionId: 'ckclass1', now: NOW });
    expect(r).toEqual({ kind: 'cancelled', classId: 'ckclass1' });
    expect(c.status).toBe('CANCELLED');
    expect(c.cancelledBy).toBe('SYSTEM');
    expect(c.cancellationReason).toBe('PAYMENT_TIMEOUT');
    expect(c.refundDueCents).toBe(0);
  });

  it('JAMÁS cancela una clase que ya está pagada (una sesión vieja que expira tarde)', async () => {
    const c = seed({ status: 'BOOKED', paidAt: NOW, stripePaymentId: 'pi_1' });
    const r = await classPaymentStore.expireCheckout('evt_1', 'checkout.session.expired', { classSessionId: 'ckclass1', now: NOW });
    expect(r).toEqual({ kind: 'noop' });
    expect(c.status).toBe('BOOKED');
  });

  it('es idempotente por evento', async () => {
    seed();
    await classPaymentStore.expireCheckout('evt_1', 'checkout.session.expired', { classSessionId: 'ckclass1', now: NOW });
    const again = await classPaymentStore.expireCheckout('evt_1', 'checkout.session.expired', { classSessionId: 'ckclass1', now: NOW });
    expect(again).toEqual({ kind: 'duplicate' });
  });
});

// ───────────────────────── Desvío del camino de suscripciones ─────────────────────────

const ev = (type: string, object: Record<string, unknown>, id = 'evt_x') =>
  ({ id, type, data: { object } }) as unknown as Stripe.Event;

describe('classBookingRef — desvía las clases ANTES del camino de suscripciones', () => {
  it('reconoce el metadata de una clase en un PaymentIntent y en una sesión de Checkout', () => {
    const meta = { type: 'class_booking', classSessionId: 'ckclass1' };
    expect(classBookingRef(ev('payment_intent.succeeded', { metadata: meta }))).toEqual({ classSessionId: 'ckclass1' });
    expect(classBookingRef(ev('checkout.session.completed', { metadata: meta }))).toEqual({ classSessionId: 'ckclass1' });
  });

  it('un evento de una SUSCRIPCIÓN (metadata de plan) NO se desvía', () => {
    expect(classBookingRef(ev('checkout.session.completed', { metadata: { plan: 'PREMIUM', season: 'EARLY_BIRD' } }))).toBeNull();
    expect(classBookingRef(ev('checkout.session.completed', { metadata: null }))).toBeNull();
    expect(classBookingRef(ev('checkout.session.completed', {}))).toBeNull();
  });

  it('metadata de clase SIN id sigue siendo de clase (no debe caer en el camino que reintenta para siempre)', () => {
    expect(classBookingRef(ev('checkout.session.completed', { metadata: { type: 'class_booking' } }))).toEqual({ classSessionId: null });
  });

  it('un «type» distinto no se confunde con una clase', () => {
    expect(classBookingRef(ev('payment_intent.succeeded', { metadata: { type: 'otra_cosa', classSessionId: 'x' } }))).toBeNull();
  });
});

describe('handleClassPaymentEvent', () => {
  beforeEach(() => seed());
  const meta = { type: 'class_booking', classSessionId: 'ckclass1' };

  it('payment_intent.succeeded confirma con el monto RECIBIDO (no el pedido)', async () => {
    const r = await handleClassPaymentEvent(
      ev('payment_intent.succeeded', { id: 'pi_7', amount: 30000, amount_received: 30000, currency: 'mxn', metadata: meta }, 'evt_7'),
      classPaymentStore,
      NOW
    );
    expect(r).toEqual({ status: 'handled', type: 'payment_intent.succeeded', outcome: { kind: 'booked', classId: 'ckclass1' } });
    expect(h.classes.get('ckclass1')!.stripePaymentId).toBe('pi_7');
  });

  it('usa amount_received: un PaymentIntent que pidió 30 000 pero recibió menos NO reserva', async () => {
    const r = await handleClassPaymentEvent(
      ev('payment_intent.succeeded', { id: 'pi_8', amount: 30000, amount_received: 12000, currency: 'mxn', metadata: meta }, 'evt_8'),
      classPaymentStore,
      NOW
    );
    expect(r.status === 'handled' && r.outcome.kind).toBe('mismatch');
  });

  it('checkout.session.completed de una clase se IGNORA (el cobro lo confirma el PaymentIntent)', async () => {
    const r = await handleClassPaymentEvent(ev('checkout.session.completed', { id: 'cs_1', metadata: meta }), classPaymentStore, NOW);
    expect(r).toEqual({ status: 'ignored', type: 'checkout.session.completed', reason: 'not_a_payment_event' });
    expect(h.classes.get('ckclass1')!.status).toBe('PENDING_PAYMENT');
  });

  it('payment_intent.payment_failed NO cancela: en Checkout un rechazo no termina la sesión', async () => {
    const r = await handleClassPaymentEvent(ev('payment_intent.payment_failed', { id: 'pi_9', metadata: meta }), classPaymentStore, NOW);
    expect(r.status).toBe('ignored');
    expect(h.classes.get('ckclass1')!.status).toBe('PENDING_PAYMENT');
  });

  it('un evento de clase sin id de clase se ignora sin tocar nada', async () => {
    const r = await handleClassPaymentEvent(
      ev('payment_intent.succeeded', { id: 'pi_1', amount_received: 30000, currency: 'mxn', metadata: { type: 'class_booking' } }),
      classPaymentStore,
      NOW
    );
    expect(r).toEqual({ status: 'ignored', type: 'payment_intent.succeeded', reason: 'missing_class_id' });
    expect(h.updateCalls).toEqual([]);
  });
});
