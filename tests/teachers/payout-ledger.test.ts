import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

/**
 * G103 Fase 6 — liquidaciones y libro de ajustes contra una base EN MEMORIA
 * con la semántica de las consultas que importan (filtros, `updateMany`
 * condicional, transacción que se revierte entera si algo lanza). Mide lo que
 * cuesta dinero: cuánto termina recibiendo el profesor en TOTAL después de
 * reembolsos, recompras y cancelaciones.
 */

type Row = Record<string, unknown> & { id: string };
type Tables = Record<'classSession' | 'courseEnrollment' | 'course' | 'teacherPayout' | 'teacherPayoutAdjustment' | 'processedStripeEvent', Row[]>;

let db: Tables;
let seq = 0;
/** Reloj de la base: el `createdAt` que pondría Postgres al insertar. */
let clock = new Date(0);
const newId = (p: string) => `ck${p}${String(++seq).padStart(20, '0')}`;

function matchValue(v: unknown, cond: unknown): boolean {
  if (cond === null) return v === null || v === undefined;
  if (typeof cond !== 'object' || cond instanceof Date) {
    return cond instanceof Date ? v instanceof Date && v.getTime() === cond.getTime() : v === cond;
  }
  const c = cond as Record<string, unknown>;
  const cmp = (x: unknown) => (x instanceof Date ? x.getTime() : (x as number));
  if ('in' in c && !(c.in as unknown[]).includes(v)) return false;
  if ('not' in c && (c.not === null ? v === null || v === undefined : v === c.not)) return false;
  if ('lt' in c && !(v !== null && v !== undefined && cmp(v) < cmp(c.lt))) return false;
  if ('lte' in c && !(v !== null && v !== undefined && cmp(v) <= cmp(c.lte))) return false;
  if ('gt' in c && !(v !== null && v !== undefined && cmp(v) > cmp(c.gt))) return false;
  if ('gte' in c && !(v !== null && v !== undefined && cmp(v) >= cmp(c.gte))) return false;
  return true;
}

function matches(t: Tables, table: keyof Tables, row: Row, where: Record<string, unknown> = {}): boolean {
  return Object.entries(where).every(([k, cond]) => {
    if (table === 'courseEnrollment' && k === 'course') {
      const course = t.course.find((c) => c.id === row.courseId)!;
      return matches(t, 'course', course, cond as Record<string, unknown>);
    }
    return matchValue(row[k], cond);
  });
}

function withRelations(t: Tables, table: keyof Tables, row: Row): Row {
  const out: Row = { ...row };
  if (table === 'courseEnrollment') out.course = { ...t.course.find((c) => c.id === row.courseId)!, teacher: { paymentRail: 'ASIMILADOS' } };
  if (table === 'teacherPayout') out.teacher = { userProfileId: `up_${row.teacherId}` };
  return out;
}

// Los `@default` del esquema que Prisma pondría al crear.
const DEFAULTS: Partial<Record<keyof Tables, Record<string, unknown>>> = {
  teacherPayout: {
    status: 'PENDING',
    adjustmentCents: 0,
    releasedRetentionCents: 0,
    approvedAt: null,
    transferredAt: null,
    speiReference: null,
    failReason: null,
    retentionStatus: 'HELD',
    retentionReleasedAt: null,
    retentionPaidInPayoutId: null,
  },
  teacherPayoutAdjustment: { appliedInPayoutId: null, voidedAt: null, note: null },
};

function delegate(t: Tables, table: keyof Tables) {
  const rows = () => t[table];
  return {
    findMany: async ({ where, distinct }: { where?: Record<string, unknown>; distinct?: string[] } = {}) => {
      let found = rows().filter((r) => matches(t, table, r, where)).map((r) => withRelations(t, table, r));
      if (distinct) {
        const seen = new Set<string>();
        found = found.filter((r) => {
          const key = distinct.map((d) => String(r[d])).join('|');
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
      return found;
    },
    findFirst: async ({ where }: { where?: Record<string, unknown> }) => {
      const r = rows().find((x) => matches(t, table, x, where));
      return r ? withRelations(t, table, r) : null;
    },
    findUnique: async ({ where }: { where: Record<string, unknown> }) => {
      const r = rows().find((x) => matches(t, table, x, where));
      return r ? withRelations(t, table, r) : null;
    },
    findUniqueOrThrow: async ({ where }: { where: Record<string, unknown> }) => {
      const r = rows().find((x) => matches(t, table, x, where));
      if (!r) throw new Error('not found');
      return withRelations(t, table, r);
    },
    create: async ({ data }: { data: Record<string, unknown> }) => {
      if (table === 'processedStripeEvent' && rows().some((r) => r.eventId === data.eventId)) {
        throw new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 't' });
      }
      const row: Row = { id: newId(table.slice(0, 3)), createdAt: clock, ...DEFAULTS[table], ...data } as Row;
      rows().push(row);
      return { ...row };
    },
    update: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      const r = rows().find((x) => matches(t, table, x, where));
      if (!r) throw new Error('not found');
      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === 'object' && !(v instanceof Date) && ('increment' in v || 'decrement' in v)) {
          const o = v as { increment?: number; decrement?: number };
          r[k] = (r[k] as number) + (o.increment ?? 0) - (o.decrement ?? 0);
        } else r[k] = v;
      }
      return { ...r };
    },
    updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      const hit = rows().filter((x) => matches(t, table, x, where));
      hit.forEach((r) => Object.assign(r, data));
      return { count: hit.length };
    },
    aggregate: async ({ where }: { where: Record<string, unknown> }) => {
      const sum = rows().filter((r) => matches(t, table, r, where)).reduce((s, r) => s + (r.amountCents as number), 0);
      return { _sum: { amountCents: sum === 0 ? null : sum } };
    },
  };
}

function client(t: Tables) {
  return {
    classSession: delegate(t, 'classSession'),
    courseEnrollment: delegate(t, 'courseEnrollment'),
    course: delegate(t, 'course'),
    teacherPayout: delegate(t, 'teacherPayout'),
    teacherPayoutAdjustment: delegate(t, 'teacherPayoutAdjustment'),
    processedStripeEvent: delegate(t, 'processedStripeEvent'),
    $executeRaw: async () => 0,
  };
}

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === '$transaction') {
          return async (work: (tx: unknown) => Promise<unknown>) => {
            const snapshot = structuredClone(db);
            try {
              return await work(client(db));
            } catch (err) {
              db = snapshot;
              throw err;
            }
          };
        }
        return (client(db) as Record<string, unknown>)[prop];
      },
    }
  ),
}));
vi.mock('@/lib/observability/report', () => ({ reportControlFailure: () => undefined, reportSilentDegradation: () => undefined }));

const { applyPayoutDecision, computeWeekPayouts, getTeacherPayoutOverview } = await import('@/lib/db/payouts');
const { recordClassRefundTx } = await import('@/lib/db/classes');
const { enrollCoursePurchase, recordCourseRefundTx } = await import('@/lib/db/courses');
const { classPayableCents, enrollmentPayableCents, payoutWeek } = await import('@/lib/teachers/payout-calculator');
const { prisma } = await import('@/lib/db/prisma');

const T = 'ckteacher00000000000000001';
const COURSE = 'ckcourse0000000000000000a';
const W1 = payoutWeek('2026-10-05')!;
const W2 = payoutWeek('2026-10-12')!;
const W3 = payoutWeek('2026-10-19')!;
const inWeek = (w: typeof W1, day = 1) => new Date(w.periodStart.getTime() + day * 86_400_000 + 3_600_000);
const NOW = new Date('2026-12-31T18:00:00Z');

function addClass(over: Partial<Row> = {}): string {
  const id = newId('cls');
  db.classSession.push({
    id,
    teacherId: T,
    status: 'COMPLETED',
    paidAt: inWeek(W1, 0),
    completedAt: inWeek(W1, 1),
    finalTariffCents: 40_000,
    teacherPayCents: 30_000,
    commissionCents: 10_000,
    refundedCents: 0,
    refundedAt: null,
    stripePaymentId: `pi_${id}`,
    payoutId: null,
    payoutTeacherCents: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    ...over,
  });
  return id;
}

function addEnrollment(paidAt: Date, over: Partial<Row> = {}): string {
  const id = newId('enr');
  db.courseEnrollment.push({
    id,
    courseId: COURSE,
    userProfileId: newId('usr'),
    status: 'ACTIVE',
    paidAt,
    pricePaidCents: 49_900,
    teacherPayCents: 37_425,
    commissionCents: 12_475,
    stripePaymentId: `pi_${id}`,
    stripeCheckoutSessionId: `cs_${id}`,
    payoutId: null,
    payoutTeacherCents: null,
    refundedAt: null,
    ...over,
  });
  return id;
}

async function compute(w: typeof W1) {
  return computeWeekPayouts(w, NOW);
}

async function transfer(payoutId: string) {
  await applyPayoutDecision(payoutId, 'APPROVE', { actorProfileId: 'admin', reason: 'Revisada', now: NOW });
  await applyPayoutDecision(payoutId, 'MARK_TRANSFERRED', { actorProfileId: 'admin', reason: 'SPEI enviado', speiReference: 'MBAN0100261026', now: NOW });
}

/**
 * Balance de toda la vida del profesor: lo transferido + las reservas que
 * siguen retenidas + los ajustes pendientes + lo vendido que aún no entra a una
 * liquidación. Tiene que dar EXACTAMENTE su parte de lo vendido y no
 * reembolsado, pase lo que pase en medio (reembolsos, recompras, cancelaciones).
 */
function lifetimeOwed(): number {
  const transferred = db.teacherPayout.filter((p) => p.status === 'TRANSFERRED');
  const nets = transferred.reduce((s, p) => s + (p.netCents as number), 0);
  const held = transferred.filter((p) => p.retentionStatus === 'HELD').reduce((s, p) => s + (p.retentionCents as number), 0);
  const pendingAdj = db.teacherPayoutAdjustment.filter((a) => !a.appliedInPayoutId && !a.voidedAt).reduce((s, a) => s + (a.amountCents as number), 0);
  const unassigned =
    db.classSession.filter((c) => !c.payoutId).reduce((s, c) => s + classPayableCents(c as never), 0) +
    db.courseEnrollment.filter((e) => !e.payoutId).reduce((s, e) => s + enrollmentPayableCents(e as never), 0);
  return nets + held + pendingAdj + unassigned;
}
const payoutOf = (id: string) => db.teacherPayout.find((p) => p.id === id)!;

// Por defecto el reembolso llega el lunes en que se liquidó W1 (ya dentro de W2):
// su ajuste entra a la liquidación de W2. Lo que nace después del cierre de una
// semana espera a la siguiente (recalcular una semana pasada da lo mismo).
async function refundCourse(enrollmentId: string, at = inWeek(W2, 0)) {
  clock = at;
  const e = db.courseEnrollment.find((x) => x.id === enrollmentId)!;
  await prisma.$transaction((tx) => recordCourseRefundTx(tx as never, e.stripePaymentId as string, at));
}
async function refundClass(classId: string, cents: number, at = inWeek(W2, 0)) {
  clock = at;
  const c = db.classSession.find((x) => x.id === classId)!;
  await prisma.$transaction((tx) => recordClassRefundTx(tx as never, c.stripePaymentId as string, cents, at));
}

beforeEach(() => {
  seq = 0;
  clock = inWeek(W1, 0);
  db = { classSession: [], courseEnrollment: [], course: [], teacherPayout: [], teacherPayoutAdjustment: [], processedStripeEvent: [] };
  db.course.push({ id: COURSE, teacherId: T, totalLessons: 4, isFree: false, totalEnrollments: 0, totalRevenueCents: 0 });
});

describe('cálculo semanal', () => {
  it('junta clases impartidas y cursos vendidos, retiene 15 % y congela lo acreditado por partida', async () => {
    const c1 = addClass();
    addClass();
    const e1 = addEnrollment(inWeek(W1, 2));
    const [r] = await compute(W1);
    expect(r).toMatchObject({ outcome: 'created' });
    const p = db.teacherPayout[0];
    expect(p).toMatchObject({ classRevenueCents: 60_000, courseRevenueCents: 37_425, grossCents: 97_425, retentionCents: 14_614, netCents: 82_811, status: 'PENDING' });
    expect(db.classSession.find((c) => c.id === c1)).toMatchObject({ payoutId: p.id, payoutTeacherCents: 30_000 });
    expect(db.courseEnrollment.find((e) => e.id === e1)).toMatchObject({ payoutId: p.id, payoutTeacherCents: 37_425 });
  });

  it('recalcular la misma semana no duplica nada', async () => {
    addClass();
    addClass();
    await compute(W1);
    const again = await compute(W1);
    expect(again).toEqual([]);
    expect(db.teacherPayout).toHaveLength(1);
  });

  it('solo lo anterior al cierre de la semana; lo de la semana siguiente espera', async () => {
    addClass();
    addClass();
    addClass({ completedAt: inWeek(W2, 1) });
    await compute(W1);
    expect(db.teacherPayout[0].classCount).toBe(2);
  });

  it('una sola clase de $400 (parte de $300, neto $255) no llega al mínimo: se acumula', async () => {
    addClass();
    expect(await compute(W1)).toEqual([expect.objectContaining({ outcome: 'below_minimum', netCents: 25_500 })]);
  });

  it('una clase no impartida o no cobrada nunca entra', async () => {
    addClass({ status: 'NO_SHOW_STUDENT' });
    addClass({ status: 'CANCELLED' });
    addClass({ paidAt: null });
    expect(await compute(W1)).toEqual([]);
    expect(db.teacherPayout).toHaveLength(0);
  });

  it('bajo $300 se acumula: no hay liquidación y la siguiente semana entra todo junto', async () => {
    const cheap = { pricePaidCents: 29_900, teacherPayCents: 22_425, commissionCents: 7_475 };
    addEnrollment(inWeek(W1, 2), cheap);
    expect(await compute(W1)).toEqual([expect.objectContaining({ outcome: 'below_minimum', netCents: 19_061 })]);
    expect(db.teacherPayout).toHaveLength(0);
    expect(db.courseEnrollment[0].payoutId).toBeNull();
    addEnrollment(inWeek(W2, 2), cheap);
    await compute(W2);
    expect(db.teacherPayout[0]).toMatchObject({ enrollmentCount: 2, grossCents: 44_850, netCents: 44_850 - 6_728 });
  });
});

describe('reembolso DESPUÉS de liquidar → ajuste negativo en la siguiente', () => {
  it('curso: el profesor termina cobrando cero por la venta reembolsada', async () => {
    const e1 = addEnrollment(inWeek(W1, 2));
    addClass();
    await compute(W1);
    const p1 = db.teacherPayout[0].id;
    await transfer(p1);
    await refundCourse(e1);
    expect(db.teacherPayoutAdjustment).toEqual([expect.objectContaining({ kind: 'REFUND', amountCents: -37_425, sourcePayoutId: p1, appliedInPayoutId: null })]);

    // Semana siguiente: cuatro clases nuevas, menos la deuda.
    for (let d = 1; d <= 4; d++) addClass({ completedAt: inWeek(W2, d) });
    await compute(W2);
    const p2 = db.teacherPayout.find((p) => p.id !== p1)!;
    expect(p2).toMatchObject({ grossCents: 120_000, retentionCents: 18_000, adjustmentCents: -37_425, netCents: 120_000 - 18_000 - 37_425 });
    expect(db.teacherPayoutAdjustment[0].appliedInPayoutId).toBe(p2.id);
    await transfer(p2.id as string);
    // Cinco clases; el curso reembolsado aporta 0.
    expect(lifetimeOwed()).toBe(5 * 30_000);
  });

  it('un reembolso que llega DESPUÉS del cierre de la semana entra a la siguiente, no a esa', async () => {
    const e1 = addEnrollment(inWeek(W1, 2));
    await compute(W1);
    await transfer(db.teacherPayout[0].id);
    await refundCourse(e1, inWeek(W3, 1));
    for (let d = 1; d <= 4; d++) addClass({ completedAt: inWeek(W2, d) });
    await compute(W2);
    expect(db.teacherPayout[1].adjustmentCents).toBe(0);
    for (let d = 1; d <= 4; d++) addClass({ completedAt: inWeek(W3, d) });
    await compute(W3);
    expect(db.teacherPayout[2].adjustmentCents).toBe(-37_425);
  });

  it('el mismo reembolso visto dos veces (dos eventos) no descuenta dos veces', async () => {
    const e1 = addEnrollment(inWeek(W1, 2));
    await compute(W1);
    await transfer(db.teacherPayout[0].id);
    await refundCourse(e1);
    await refundCourse(e1);
    expect(db.teacherPayoutAdjustment).toHaveLength(1);
  });

  it('clase con dos reembolsos parciales: cada uno descuenta solo su parte', async () => {
    const c1 = addClass();
    addClass();
    await compute(W1);
    await transfer(db.teacherPayout[0].id);
    await refundClass(c1, 20_000);
    await refundClass(c1, 40_000);
    expect(db.teacherPayoutAdjustment.map((a) => a.amountCents)).toEqual([-15_000, -15_000]);
  });

  it('reembolso ANTES de liquidar: no hay ajuste, la partida simplemente no entra', async () => {
    const e1 = addEnrollment(inWeek(W1, 2));
    addClass();
    addClass();
    await refundCourse(e1);
    await compute(W1);
    expect(db.teacherPayoutAdjustment).toHaveLength(0);
    expect(db.teacherPayout[0]).toMatchObject({ enrollmentCount: 0, classCount: 2 });
  });

  it('recompra tras un reembolso (misma fila de inscripción): la deuda vieja sobrevive y un 2º reembolso vuelve a descontar', async () => {
    const md = (n: number) => ({ kind: 'course_purchase', courseId: COURSE, userProfileId: 'ckbuyer0000000000000001', expectedAmountCents: '49900', n: String(n) });
    const buy = (evt: string, n: number, at: Date) =>
      enrollCoursePurchase(evt, 'checkout.session.completed', {
        eventCreatedAt: at,
        checkoutSessionId: `cs_${n}`,
        paymentIntentId: `pi_buy_${n}`,
        stripeCustomerId: 'cus_1',
        amountMxn: 49_900,
        currency: 'mxn',
        method: 'CARD',
        metadata: md(n),
      });
    await buy('evt_1', 1, inWeek(W1, 2));
    const enrollment = db.courseEnrollment[0];
    await compute(W1);
    await transfer(db.teacherPayout[0].id);
    await refundCourse(enrollment.id);
    // Recompra: la fila se REUTILIZA (único curso+alumno) y vuelve a quedar libre.
    await buy('evt_2', 2, inWeek(W2, 2));
    expect(db.courseEnrollment).toHaveLength(1);
    expect(db.courseEnrollment[0]).toMatchObject({ status: 'ACTIVE', payoutId: null, payoutTeacherCents: null });
    for (let d = 3; d <= 5; d++) addClass({ completedAt: inWeek(W2, d) });
    await compute(W2);
    const p2 = db.teacherPayout[1];
    expect(p2).toMatchObject({ courseRevenueCents: 37_425, adjustmentCents: -37_425 });
    await transfer(p2.id);
    // Segundo reembolso: es OTRA inclusión (sourcePayoutId distinto) → otro descuento.
    await refundCourse(db.courseEnrollment[0].id);
    expect(db.teacherPayoutAdjustment.map((a) => [a.amountCents, a.sourcePayoutId])).toEqual([
      [-37_425, db.teacherPayout[0].id],
      [-37_425, p2.id],
    ]);
    // Dos compras, las dos reembolsadas → el profesor se queda solo con las 3 clases.
    expect(lifetimeOwed()).toBe(3 * 30_000);
  });
});

describe('cancelar una liquidación', () => {
  it('devuelve las partidas a la bolsa y se puede recalcular la misma semana', async () => {
    addClass();
    addClass();
    await compute(W1);
    const p1 = db.teacherPayout[0].id;
    const r = await applyPayoutDecision(p1, 'CANCEL', { actorProfileId: 'admin', reason: 'Monto en revisión', now: NOW });
    expect(r).toMatchObject({ ok: true, to: 'CANCELLED' });
    expect(db.classSession.every((c) => c.payoutId === null && c.payoutTeacherCents === null)).toBe(true);
    const again = await compute(W1);
    expect(again[0]).toMatchObject({ outcome: 'created' });
    expect(db.teacherPayout.filter((p) => p.status !== 'CANCELLED')).toHaveLength(1);
  });

  it('una transferida no se cancela', async () => {
    addClass();
    addClass();
    await compute(W1);
    await transfer(db.teacherPayout[0].id);
    expect(await applyPayoutDecision(db.teacherPayout[0].id, 'CANCEL', { actorProfileId: 'a', reason: 'Intento', now: NOW })).toEqual({ ok: false, reason: 'INVALID' });
  });

  it('el ajuste de una partida cuya liquidación se cancela: anulado si no se aplicó, compensado si ya se descontó', async () => {
    const e1 = addEnrollment(inWeek(W1, 2));
    addClass();
    await compute(W1);
    const p1 = db.teacherPayout[0].id;
    await applyPayoutDecision(p1, 'APPROVE', { actorProfileId: 'a', reason: 'Revisada', now: NOW });
    await refundCourse(e1); // P1 aún no sale del banco
    for (let d = 1; d <= 4; d++) addClass({ completedAt: inWeek(W2, d) });
    await compute(W2); // P2 ya descuenta el ajuste
    const p2 = db.teacherPayout.find((p) => p.id !== p1)!;
    expect(p2.adjustmentCents).toBe(-37_425);
    // Se cancela P1: el profesor nunca recibió esa venta → se le devuelve el descuento.
    await applyPayoutDecision(p1, 'CANCEL', { actorProfileId: 'a', reason: 'Se pagará en otra', now: NOW });
    expect(db.teacherPayoutAdjustment.map((a) => [a.kind, a.amountCents])).toEqual([
      ['REFUND', -37_425],
      ['CANCEL_REVERSAL', 37_425],
    ]);
    // La clase de P1 volvió a la bolsa; el curso reembolsado no aporta nada.
    expect(db.classSession.filter((c) => !c.payoutId)).toHaveLength(1);
    await transfer(p2.id as string);
    expect(lifetimeOwed()).toBe(5 * 30_000);
    // Y la vista previa del profesor cuenta la devolución del descuento.
    expect((await getTeacherPayoutOverview(T, NOW)).preview.adjustmentCents).toBe(37_425);
  });

  it('un ajuste sin aplicar de una liquidación cancelada se anula (no se cobra ni se devuelve)', async () => {
    const e1 = addEnrollment(inWeek(W1, 2));
    addClass();
    await compute(W1);
    const p1 = db.teacherPayout[0].id;
    await refundCourse(e1);
    await applyPayoutDecision(p1, 'CANCEL', { actorProfileId: 'a', reason: 'Se recalcula', now: NOW });
    expect(db.teacherPayoutAdjustment).toEqual([expect.objectContaining({ kind: 'REFUND', voidedAt: NOW })]);
    expect(db.classSession[0].payoutId).toBeNull();
    expect(lifetimeOwed()).toBe(30_000);
  });
});

describe('reserva de desempeño', () => {
  it('se libera 30 días después del cierre y se paga en una liquidación posterior (una sola vez)', async () => {
    addClass();
    addClass();
    await compute(W1);
    const p1 = db.teacherPayout[0];
    await transfer(p1.id);
    // A la semana siguiente todavía no se libera.
    addClass({ completedAt: inWeek(W2, 1) });
    addClass({ completedAt: inWeek(W2, 2) });
    await compute(W2);
    expect(db.teacherPayout[1].releasedRetentionCents).toBe(0);
    await transfer(db.teacherPayout[1].id);
    // W1 cierra el 12-oct → su reserva se libera el 11-nov; la de W2, el 18-nov.
    const W6 = payoutWeek('2026-11-09')!; // cierra el 16-nov: solo la de W1
    addClass({ completedAt: inWeek(W6, 1) });
    addClass({ completedAt: inWeek(W6, 2) });
    await compute(W6);
    const p3 = db.teacherPayout[2];
    expect(p3.releasedRetentionCents).toBe(9_000);
    expect(payoutOf(p1.id)).toMatchObject({ retentionStatus: 'RELEASED', retentionPaidInPayoutId: p3.id });
    await transfer(p3.id);
    // La semana siguiente libera la de W2, y la de W1 no se vuelve a pagar.
    const W7 = payoutWeek('2026-11-16')!;
    addClass({ completedAt: inWeek(W7, 1) });
    addClass({ completedAt: inWeek(W7, 2) });
    await compute(W7);
    expect(db.teacherPayout[3].releasedRetentionCents).toBe(9_000);
    expect(payoutOf(db.teacherPayout[1].id).retentionPaidInPayoutId).toBe(db.teacherPayout[3].id);
    await transfer(db.teacherPayout[3].id);
    expect(lifetimeOwed()).toBe(8 * 30_000);
  });

  it('retenida por incidencia (FORFEITED) ya no se libera', async () => {
    addClass();
    addClass();
    await compute(W1);
    await transfer(db.teacherPayout[0].id);
    expect(await applyPayoutDecision(db.teacherPayout[0].id, 'FORFEIT_RETENTION', { actorProfileId: 'a', reason: 'Incidencia grave', now: NOW })).toMatchObject({ ok: true });
    const W7 = payoutWeek('2026-11-16')!;
    addClass({ completedAt: inWeek(W7, 1) });
    addClass({ completedAt: inWeek(W7, 2) });
    await compute(W7);
    expect(db.teacherPayout[1].releasedRetentionCents).toBe(0);
  });
});

describe('W3 sin nada que liquidar', () => {
  it('no crea filas vacías', async () => {
    expect(await compute(W3)).toEqual([]);
  });
});
