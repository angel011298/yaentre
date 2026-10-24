import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import type { PaidCheckout } from '@/lib/stripe/marketplace-webhook';

/**
 * G103 — inscripción por compra (SOLO desde el webhook) contra una base en
 * memoria con la semántica que importa: `event.id` único como primera
 * sentencia, único `(courseId, userProfileId)`, y reversión de la transacción
 * si algo lanza.
 */

interface Enr {
  id: string;
  courseId: string;
  userProfileId: string;
  status: string;
  pricePaidCents: number;
  teacherPayCents: number;
  commissionCents: number;
  stripeCheckoutSessionId: string | null;
  stripePaymentId: string | null;
}

let db = { events: new Set<string>(), enrollments: [] as Enr[], course: { totalEnrollments: 0, totalRevenueCents: 0 } };
const failures: string[] = [];

function makeTx(state: typeof db) {
  const findEnrollment = async ({ where }: { where: { courseId_userProfileId?: { courseId: string; userProfileId: string }; stripePaymentId?: string } }) => {
    const e = where.stripePaymentId
      ? state.enrollments.find((x) => x.stripePaymentId === where.stripePaymentId)
      : state.enrollments.find((x) => x.courseId === where.courseId_userProfileId!.courseId && x.userProfileId === where.courseId_userProfileId!.userProfileId);
    return e ? { ...e, course: { teacherId: 'ckteacher1' } } : null;
  };
  return {
    // Candado de liquidaciones del profesor (`pg_advisory_xact_lock`).
    $executeRaw: async () => 0,
    processedStripeEvent: {
      create: async ({ data }: { data: { eventId: string } }) => {
        if (state.events.has(data.eventId)) throw new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 't' });
        state.events.add(data.eventId);
      },
    },
    course: {
      findUnique: async ({ where }: { where: { id: string } }) => (where.id === 'ckcourse1' ? { id: 'ckcourse1', totalLessons: 4, isFree: false } : null),
      update: async ({ data }: { data: { totalEnrollments: { increment?: number; decrement?: number }; totalRevenueCents: { increment?: number; decrement?: number } } }) => {
        state.course.totalEnrollments += (data.totalEnrollments.increment ?? 0) - (data.totalEnrollments.decrement ?? 0);
        state.course.totalRevenueCents += (data.totalRevenueCents.increment ?? 0) - (data.totalRevenueCents.decrement ?? 0);
      },
    },
    courseEnrollment: {
      findUnique: findEnrollment,
      findUniqueOrThrow: async (args: Parameters<typeof findEnrollment>[0]) => {
        const e = await findEnrollment(args);
        if (!e) throw new Error('not found');
        return e;
      },
      create: async ({ data }: { data: Omit<Enr, 'id'> }) => {
        if (state.enrollments.some((e) => e.courseId === data.courseId && e.userProfileId === data.userProfileId)) {
          throw new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 't' });
        }
        state.enrollments.push({ ...data, id: `e${state.enrollments.length + 1}` });
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<Enr> }) => {
        Object.assign(state.enrollments.find((e) => e.id === where.id)!, data);
      },
    },
  };
}

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: async (work: (tx: unknown) => Promise<void>) => {
      const snap = { events: new Set(db.events), enrollments: db.enrollments.map((e) => ({ ...e })), course: { ...db.course } };
      await work(makeTx(snap));
      db = snap;
    },
  },
}));
vi.mock('@/lib/observability/report', () => ({
  reportControlFailure: (c: string) => failures.push(c),
  reportSilentDegradation: () => undefined,
}));

const { enrollCoursePurchase, recordCourseRefundTx } = await import('@/lib/db/courses');

function paid(over: Partial<PaidCheckout> = {}, md: Record<string, string> = {}): PaidCheckout {
  return {
    eventCreatedAt: new Date('2026-12-01T18:00:00Z'),
    checkoutSessionId: 'cs_1',
    paymentIntentId: 'pi_1',
    stripeCustomerId: 'cus_1',
    amountMxn: 49_900,
    currency: 'mxn',
    method: 'CARD',
    metadata: { kind: 'course_purchase', courseId: 'ckcourse1', userProfileId: 'cku1', expectedAmountCents: '49900', ...md },
    ...over,
  };
}

beforeEach(() => {
  db = { events: new Set(), enrollments: [], course: { totalEnrollments: 0, totalRevenueCents: 0 } };
  failures.length = 0;
});

describe('enrollCoursePurchase', () => {
  it('inscribe con el precio COBRADO y el reparto 75/25 congelado', async () => {
    const r = await enrollCoursePurchase('evt_1', 'checkout.session.completed', paid());
    expect(r).toEqual({ result: 'applied', outcome: 'enrolled' });
    expect(db.enrollments[0]).toMatchObject({ status: 'ACTIVE', pricePaidCents: 49_900, teacherPayCents: 37_425, commissionCents: 12_475, stripePaymentId: 'pi_1' });
    expect(db.course).toEqual({ totalEnrollments: 1, totalRevenueCents: 49_900 });
  });

  it('el mismo evento otra vez → duplicado; otro evento de la MISMA sesión → «already», sin duplicar', async () => {
    await enrollCoursePurchase('evt_1', 'checkout.session.completed', paid());
    expect((await enrollCoursePurchase('evt_1', 'checkout.session.completed', paid())).result).toBe('duplicate');
    expect((await enrollCoursePurchase('evt_2', 'checkout.session.async_payment_succeeded', paid())).outcome).toBe('already');
    expect(db.enrollments).toHaveLength(1);
    expect(db.course.totalEnrollments).toBe(1);
  });

  it('otra sesión pagada del mismo curso por el mismo alumno → duplicate_purchase (el llamador reembolsa)', async () => {
    await enrollCoursePurchase('evt_1', 'checkout.session.completed', paid());
    const r = await enrollCoursePurchase('evt_3', 'checkout.session.completed', paid({ checkoutSessionId: 'cs_2', paymentIntentId: 'pi_2' }));
    expect(r.outcome).toBe('duplicate_purchase');
    expect(db.enrollments).toHaveLength(1);
  });

  it('monto distinto, moneda distinta o curso inexistente → NO inscribe y alerta', async () => {
    expect((await enrollCoursePurchase('evt_a', 't', paid({ amountMxn: 100 }))).outcome).toBe('mismatch');
    expect((await enrollCoursePurchase('evt_b', 't', paid({ currency: 'usd' }))).outcome).toBe('mismatch');
    expect((await enrollCoursePurchase('evt_c', 't', paid({}, { courseId: 'ckotro' }))).outcome).toBe('mismatch');
    expect(db.enrollments).toHaveLength(0);
    expect(failures).toEqual(['payment_consistency', 'payment_consistency', 'payment_consistency']);
  });

  it('reembolso → REFUNDED (pierde el acceso) y una compra nueva después lo reactiva', async () => {
    await enrollCoursePurchase('evt_1', 'checkout.session.completed', paid());
    await (await import('@/lib/db/prisma')).prisma.$transaction(async (tx) => {
      expect(await recordCourseRefundTx(tx as never, 'pi_1', new Date())).toBe(true);
    });
    expect(db.enrollments[0].status).toBe('REFUNDED');
    expect(db.course.totalEnrollments).toBe(0);
    const again = await enrollCoursePurchase('evt_9', 'checkout.session.completed', paid({ checkoutSessionId: 'cs_9', paymentIntentId: 'pi_9' }));
    expect(again.outcome).toBe('enrolled');
    expect(db.enrollments[0]).toMatchObject({ status: 'ACTIVE', stripePaymentId: 'pi_9' });
  });
});
