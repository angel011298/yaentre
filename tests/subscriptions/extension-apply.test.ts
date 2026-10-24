import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import type { PaidCheckout } from '@/lib/stripe/marketplace-webhook';

/**
 * G103 — aplicación de la extensión desde el webhook, contra una base en
 * memoria con la MISMA semántica que importa de Postgres: el `event.id` se
 * registra como primera sentencia de la transacción (único), el `Payment` es
 * único por PaymentIntent, y todo se revierte si la transacción lanza.
 */

interface Sub {
  id: string;
  userProfileId: string;
  status: string;
  plan: string;
  expiresAt: Date | null;
  graceEndsAt: Date | null;
  extendedAt: Date | null;
  originalExpiresAt: Date | null;
  extensionConsentAt: Date | null;
  extensionConsentVersion: string | null;
}
interface Pay {
  subscriptionId: string;
  amountMxn: number;
  method: string;
  status: string;
  stripePaymentIntentId?: string | null;
}

const db = {
  events: new Set<string>(),
  subs: new Map<string, Sub>(),
  payments: [] as Pay[],
};
const failures: Array<{ control: string; ctx: unknown }> = [];

function uniqueViolation(): Error {
  return new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' });
}

function makeTx(state: typeof db) {
  return {
    processedStripeEvent: {
      create: async ({ data }: { data: { eventId: string } }) => {
        if (state.events.has(data.eventId)) throw uniqueViolation();
        state.events.add(data.eventId);
      },
    },
    subscription: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const s = state.subs.get(where.id);
        return s ? { ...s } : null;
      },
      updateMany: async ({ where, data }: { where: { id: string; expiresAt: Date | null }; data: Partial<Sub> }) => {
        const s = state.subs.get(where.id);
        if (!s || s.expiresAt?.getTime() !== where.expiresAt?.getTime()) return { count: 0 };
        Object.assign(s, data);
        return { count: 1 };
      },
    },
    payment: {
      findUnique: async ({ where }: { where: { stripePaymentIntentId: string } }) =>
        state.payments.find((p) => p.stripePaymentIntentId === where.stripePaymentIntentId) ?? null,
      upsert: async ({ where, create, update }: { where: { stripePaymentIntentId: string }; create: Pay; update: Partial<Pay> }) => {
        const found = state.payments.find((p) => p.stripePaymentIntentId === where.stripePaymentIntentId);
        if (found) Object.assign(found, update);
        else state.payments.push({ ...create });
      },
      create: async ({ data }: { data: Pay }) => {
        state.payments.push({ ...data });
      },
    },
  };
}

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: async (work: (tx: unknown) => Promise<void>) => {
      // Copia de trabajo: si `work` lanza, nada de lo escrito sobrevive.
      const snapshot = {
        events: new Set(db.events),
        subs: new Map([...db.subs].map(([k, v]) => [k, { ...v }])),
        payments: db.payments.map((p) => ({ ...p })),
      };
      await work(makeTx(snapshot));
      db.events = snapshot.events;
      db.subs = snapshot.subs;
      db.payments = snapshot.payments;
    },
  },
}));

vi.mock('@/lib/observability/report', () => ({
  reportControlFailure: (control: string, _o: string, _e: unknown, ctx: unknown) => failures.push({ control, ctx }),
  reportSilentDegradation: () => undefined,
}));

const { applyAccessExtension } = await import('@/lib/db/access-extension');

const EXPIRES = new Date('2027-10-15T18:00:00Z');

function paid(overrides: Partial<PaidCheckout> = {}, md: Record<string, string> = {}): PaidCheckout {
  return {
    eventCreatedAt: new Date('2027-09-20T00:00:00Z'),
    checkoutSessionId: 'cs_test_x',
    paymentIntentId: 'pi_ext_1',
    stripeCustomerId: 'cus_1',
    amountMxn: 49_900,
    currency: 'mxn',
    method: 'CARD',
    metadata: {
      kind: 'access_extension',
      userProfileId: 'cku_owner',
      subscriptionId: 'cks_1',
      expectedAmountCents: '49900',
      consentAt: '2027-09-20T00:00:00.000Z',
      consentVersion: 'art56-planes-v1',
      ...md,
    },
    ...overrides,
  };
}

beforeEach(() => {
  db.events = new Set();
  db.payments = [];
  db.subs = new Map([
    [
      'cks_1',
      {
        id: 'cks_1',
        userProfileId: 'cku_owner',
        status: 'ACTIVE',
        plan: 'SEASON_PASS',
        expiresAt: EXPIRES,
        graceEndsAt: new Date('2027-10-22T18:00:00Z'),
        extendedAt: null,
        originalExpiresAt: null,
        extensionConsentAt: null,
        extensionConsentVersion: null,
      },
    ],
  ]);
  failures.length = 0;
});

describe('applyAccessExtension', () => {
  it('suma 6 meses, mueve la gracia, guarda la fecha original, el consentimiento y el pago', async () => {
    expect(await applyAccessExtension('evt_1', 'checkout.session.completed', paid())).toBe('applied');
    const s = db.subs.get('cks_1')!;
    expect(s.expiresAt).toEqual(new Date('2028-04-15T18:00:00Z'));
    expect(s.graceEndsAt).toEqual(new Date('2028-04-22T18:00:00Z'));
    expect(s.originalExpiresAt).toEqual(EXPIRES);
    expect(s.extendedAt).toBeInstanceOf(Date);
    expect(s.extensionConsentVersion).toBe('art56-planes-v1');
    expect(db.payments).toEqual([
      expect.objectContaining({ status: 'SUCCEEDED', amountMxn: 49_900, stripePaymentIntentId: 'pi_ext_1' }),
    ]);
  });

  it('idempotente por event.id: el reintento de Stripe no vuelve a sumar', async () => {
    await applyAccessExtension('evt_1', 'checkout.session.completed', paid());
    expect(await applyAccessExtension('evt_1', 'checkout.session.completed', paid())).toBe('duplicate');
    expect(db.subs.get('cks_1')!.expiresAt).toEqual(new Date('2028-04-15T18:00:00Z'));
  });

  it('idempotente por PaymentIntent: dos eventos DISTINTOS de la misma sesión pagada suman una vez', async () => {
    await applyAccessExtension('evt_1', 'checkout.session.completed', paid());
    await applyAccessExtension('evt_2', 'checkout.session.async_payment_succeeded', paid());
    expect(db.subs.get('cks_1')!.expiresAt).toEqual(new Date('2028-04-15T18:00:00Z'));
    expect(db.payments).toHaveLength(1);
  });

  it('una segunda extensión pagada aparte se suma sobre la primera y conserva la fecha ORIGINAL', async () => {
    await applyAccessExtension('evt_1', 'checkout.session.completed', paid());
    await applyAccessExtension('evt_9', 'checkout.session.completed', paid({ paymentIntentId: 'pi_ext_2' }));
    const s = db.subs.get('cks_1')!;
    expect(s.expiresAt).toEqual(new Date('2028-10-15T18:00:00Z'));
    expect(s.originalExpiresAt).toEqual(EXPIRES);
  });

  it('monto distinto del emitido → NO extiende y alerta (dinero a revisar a mano)', async () => {
    await applyAccessExtension('evt_1', 'checkout.session.completed', paid({ amountMxn: 100 }));
    expect(db.subs.get('cks_1')!.expiresAt).toEqual(EXPIRES);
    expect(db.payments).toHaveLength(0);
    expect(failures.map((f) => f.control)).toEqual(['payment_consistency']);
  });

  it('moneda distinta de MXN → NO extiende', async () => {
    await applyAccessExtension('evt_1', 'checkout.session.completed', paid({ currency: 'usd' }));
    expect(db.subs.get('cks_1')!.expiresAt).toEqual(EXPIRES);
  });

  it('la suscripción no es del alumno de la sesión → NO extiende (metadatos contra la base)', async () => {
    await applyAccessExtension('evt_1', 'checkout.session.completed', paid({}, { userProfileId: 'cku_otro' }));
    expect(db.subs.get('cks_1')!.expiresAt).toEqual(EXPIRES);
    expect(failures).toHaveLength(1);
  });

  it('el plan se canceló entre el checkout y el pago → NO extiende y alerta', async () => {
    db.subs.get('cks_1')!.status = 'CANCELED';
    await applyAccessExtension('evt_1', 'checkout.session.completed', paid());
    expect(db.subs.get('cks_1')!.expiresAt).toEqual(EXPIRES);
    expect(failures).toHaveLength(1);
  });

  it('el Mensual nunca se extiende', async () => {
    db.subs.get('cks_1')!.plan = 'MONTHLY';
    await applyAccessExtension('evt_1', 'checkout.session.completed', paid());
    expect(db.subs.get('cks_1')!.expiresAt).toEqual(EXPIRES);
  });
});
