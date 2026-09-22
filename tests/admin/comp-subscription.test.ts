import { describe, expect, it, vi } from 'vitest';

/**
 * G99 — UNA CORTESÍA TIENE QUE SER INDISTINGUIBLE DE UNA COMPRA.
 *
 * El riesgo concreto que cubren estas pruebas: si el alta manual usara un
 * `create` suelto en vez del MISMO camino que el webhook de Stripe, una
 * Premium regalada quedaría sin `expiresAt` y sin insignia, y el paywall la
 * trataría distinto que a una comprada. El alumno al que se le regaló el plan
 * descubriría la diferencia el día del examen.
 *
 * Por eso aquí no se comprueba «¿devuelve ok?», sino **¿qué campos quedan
 * escritos?** — y se comparan celda por celda contra los de una activación de
 * webhook.
 */

const prismaMock = {
  subscription: { count: vi.fn() },
};
vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }));

const { activateSubscriptionTx, countActiveEarlyBirdSubscriptions } = await import(
  '@/lib/db/billing'
);

const EXAM_DATE = new Date('2027-01-06T14:00:00.000Z');
const NOW = new Date('2026-09-21T10:00:00.000Z');

/**
 * Cliente de transacción falso, con estado real: registra lo que se escribe
 * para poder compararlo. No simula Postgres; simula lo justo para que la
 * función bajo prueba produzca el mismo objeto de datos que produciría contra
 * la base.
 */
function makeTx(sub: {
  id: string;
  plan: 'PREMIUM' | 'SEASON_PASS' | 'MONTHLY';
  season: 'EARLY_BIRD' | 'HIGH_SEASON' | 'LAST_MINUTE';
  status: string;
  isComp: boolean;
}) {
  const written: Record<string, unknown> = {};
  const badges: string[] = [];
  const payments: unknown[] = [];

  return {
    written,
    badges,
    payments,
    tx: {
      subscription: {
        findUnique: async () => ({
          ...sub,
          userProfileId: 'cku0000000000000000000002',
          expiresAt: null,
          userProfile: { id: 'cku0000000000000000000002', targetExam: { examDate: EXAM_DATE } },
        }),
        updateMany: async ({ data }: { data: Record<string, unknown> }) => {
          Object.assign(written, data);
          return { count: 1 };
        },
      },
      userProfile: {
        findUnique: async () => ({ badges: [] }),
        update: async ({ data }: { data: { badges: { push: string } } }) => {
          badges.push(data.badges.push);
          return {};
        },
      },
      payment: {
        create: async ({ data }: { data: unknown }) => {
          payments.push(data);
          return {};
        },
        upsert: async ({ create }: { create: unknown }) => {
          payments.push(create);
          return {};
        },
      },
    } as never,
  };
}

describe('activateSubscriptionTx — el camino único de activación', () => {
  it('una CORTESÍA Premium queda con status, startedAt, expiresAt e insignia', async () => {
    const harness = makeTx({
      id: 'cku0000000000000000000009',
      plan: 'PREMIUM',
      season: 'EARLY_BIRD',
      status: 'PENDING',
      isComp: true,
    });

    const outcome = await activateSubscriptionTx(harness.tx, {
      subscriptionId: 'cku0000000000000000000009',
      now: NOW,
    });

    expect(outcome?.activated).toBe(true);
    expect(harness.written.status).toBe('ACTIVE');
    expect(harness.written.startedAt).toEqual(NOW);
    // `expiresAt` derivado de la fecha del examen, no nulo.
    expect(harness.written.expiresAt).toBeInstanceOf(Date);
    expect(harness.badges).toEqual(['EARLY_BIRD']);
    // Y SIN pago: no hubo cobro, fabricar uno ensuciaría la contabilidad.
    expect(harness.payments).toEqual([]);
  });

  it('una COMPRA por webhook queda con los MISMOS campos, más el Payment', async () => {
    const harness = makeTx({
      id: 'cku0000000000000000000009',
      plan: 'PREMIUM',
      season: 'EARLY_BIRD',
      status: 'PENDING',
      isComp: false,
    });

    const outcome = await activateSubscriptionTx(harness.tx, {
      subscriptionId: 'cku0000000000000000000009',
      now: NOW,
      // Lo que hace el webhook en este punto: escribir el Payment. Se empuja
      // al mismo registro que usa el doble, en vez de alcanzar `tx` (que está
      // tipado como `never` a propósito, para que nadie lo confunda con un
      // cliente de Prisma de verdad).
      afterActivate: async (sub) => {
        harness.payments.push({
          subscriptionId: sub.id,
          amountMxn: 49900,
          method: 'CARD',
          status: 'SUCCEEDED',
        });
      },
    });

    expect(outcome?.activated).toBe(true);
    expect(harness.written.status).toBe('ACTIVE');
    expect(harness.written.startedAt).toEqual(NOW);
    expect(harness.written.expiresAt).toBeInstanceOf(Date);
    expect(harness.badges).toEqual(['EARLY_BIRD']);
    expect(harness.payments).toHaveLength(1);
  });

  it('cortesía y compra producen EXACTAMENTE los mismos campos de la suscripción', async () => {
    const comp = makeTx({
      id: 'cku0000000000000000000009',
      plan: 'PREMIUM',
      season: 'EARLY_BIRD',
      status: 'PENDING',
      isComp: true,
    });
    const sale = makeTx({
      id: 'cku0000000000000000000009',
      plan: 'PREMIUM',
      season: 'EARLY_BIRD',
      status: 'PENDING',
      isComp: false,
    });

    await activateSubscriptionTx(comp.tx, { subscriptionId: 'x', now: NOW });
    await activateSubscriptionTx(sale.tx, {
      subscriptionId: 'x',
      now: NOW,
      afterActivate: async () => {
        sale.payments.push({ any: true });
      },
    });

    // La ÚNICA diferencia permitida está fuera de este objeto: `isComp` y la
    // existencia del Payment.
    expect(comp.written).toEqual(sale.written);
    expect(comp.badges).toEqual(sale.badges);
    expect(comp.payments).toEqual([]);
    expect(sale.payments).toHaveLength(1);
  });

  it('idempotencia: una suscripción ya ACTIVE no se re-activa ni re-otorga insignia', async () => {
    const harness = makeTx({
      id: 'cku0000000000000000000009',
      plan: 'PREMIUM',
      season: 'EARLY_BIRD',
      status: 'ACTIVE',
      isComp: true,
    });

    const outcome = await activateSubscriptionTx(harness.tx, { subscriptionId: 'x', now: NOW });

    expect(outcome?.activated).toBe(false);
    expect(harness.written).toEqual({});
    expect(harness.badges).toEqual([]);
  });
});

describe('contador de licencias Early Bird — una cortesía no descuenta', () => {
  it('cuenta SOLO ventas: el filtro lleva isComp:false', async () => {
    prismaMock.subscription.count.mockResolvedValue(3);

    const total = await countActiveEarlyBirdSubscriptions();

    expect(total).toBe(3);
    // El aserto que importa: la consulta EXCLUYE cortesías. Sin `isComp:false`
    // regalar diez planes subiría el precio de temporada para todo el mundo
    // (`degradeIfEarlyBirdExhausted`) sin que hubiera entrado un peso.
    expect(prismaMock.subscription.count).toHaveBeenCalledWith({
      where: { season: 'EARLY_BIRD', status: 'ACTIVE', isComp: false },
    });
  });
});
