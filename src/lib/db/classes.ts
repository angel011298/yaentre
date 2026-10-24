import { Prisma, type ClassSession, type ClassTrack } from '@prisma/client';
import { prisma } from './prisma';
import { lockKeyInTx, withKeyedAdvisoryLock } from './locks';
import { dateKeyOfDbDate } from './teachers';
import { mexicoDayKey } from '@/lib/subscriptions/access-check';
import { addDaysToKey } from '@/lib/teachers/slot-calculator';
import {
  blockedUntil,
  SLOT_OCCUPYING_STATUSES,
  type ExistingBooking,
} from '@/lib/teachers/conflict-prevention';
import { evaluateTeacherLevel } from '@/lib/teachers/level-engine';
import type { AvailabilityBlock } from '@/lib/teachers/availability';
import { calculateTariff, DEFAULT_DEMAND_CATEGORY, type ClassDuration } from '@/lib/teachers/tariff';

/**
 * G103 — capa de datos de las clases en vivo: directorio, horarios, apartado
 * del horario, confirmación por webhook, cancelación y cierre.
 *
 * Dos candados contra la doble reserva, en este orden:
 *  1. candado consultivo por profesor (`class-teacher:<id>`) dentro de la
 *     transacción del apartado y de la del webhook: serializa y permite un
 *     mensaje limpio («ese horario se acaba de ocupar»);
 *  2. la restricción de exclusión `class_sessions_no_overlap` (migración
 *     0020): la última palabra, aunque un camino futuro olvide el candado.
 */

export const HOLD_MINUTES = 31;

const lockKey = (teacherId: string) => `class-teacher:${teacherId}`;

function isExclusionViolation(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('23P01') || msg.includes('class_sessions_no_overlap') || msg.includes('exclusion constraint');
}

// ─────────────────────────── Directorio ───────────────────────────

export interface DirectoryTeacher {
  id: string;
  displayName: string;
  bio: string | null;
  level: 'INICIAL' | 'VERIFICADO' | 'DESTACADO';
  averageRating: number;
  totalRatings: number;
  subjects: string[];
  /** Precio más bajo posible en la pista (50 min, con anticipación, diurno). */
  fromPriceCents: number | null;
}

export async function listDirectory(track: ClassTrack, subjectKey?: string): Promise<DirectoryTeacher[]> {
  const teachers = await prisma.teacher.findMany({
    where: {
      status: 'ACTIVE',
      subjects: { some: { track, ...(subjectKey ? { subjectKey } : {}) } },
    },
    select: {
      id: true,
      displayName: true,
      bio: true,
      level: true,
      averageRating: true,
      totalRatings: true,
      subjects: { where: { track }, select: { subjectKey: true } },
    },
    orderBy: [{ averageRating: 'desc' }, { totalClassesGiven: 'desc' }],
    take: 100,
  });
  return teachers.map((t) => {
    const prices = t.subjects
      .map((s) => {
        try {
          return calculateTariff({
            track,
            subjectKey: s.subjectKey,
            teacherLevel: t.level,
            durationMinutes: 50,
            advanceCategory: 'EARLY',
            scheduleCategory: 'DAYTIME',
            demandCategory: DEFAULT_DEMAND_CATEGORY,
          }).finalCents;
        } catch {
          return null;
        }
      })
      .filter((p): p is number => p !== null);
    return {
      id: t.id,
      displayName: t.displayName,
      bio: t.bio,
      level: t.level,
      averageRating: t.averageRating,
      totalRatings: t.totalRatings,
      subjects: t.subjects.map((s) => s.subjectKey),
      fromPriceCents: prices.length ? Math.min(...prices) : null,
    };
  });
}

/** Perfil reservable: ACTIVO y que da al menos una materia en la pista. */
export async function getBookableTeacher(teacherId: string, track: ClassTrack) {
  const t = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: {
      id: true,
      userProfileId: true,
      status: true,
      displayName: true,
      bio: true,
      level: true,
      averageRating: true,
      totalRatings: true,
      subjects: { where: { track }, select: { subjectKey: true } },
    },
  });
  if (!t || t.status !== 'ACTIVE' || t.subjects.length === 0) return null;
  return t;
}

// ─────────────────────────── Horarios ───────────────────────────

export interface SlotInputs {
  availability: AvailabilityBlock[];
  blockedDates: string[];
  bookings: ExistingBooking[];
}

export async function loadSlotInputs(teacherId: string, now: Date): Promise<SlotInputs> {
  const today = mexicoDayKey(now);
  const windowStart = new Date(now.getTime() - 24 * 3600 * 1000);
  const windowEnd = new Date(now.getTime() + 33 * 24 * 3600 * 1000);
  const [availability, blocks, bookings] = await Promise.all([
    prisma.teacherAvailability.findMany({
      where: { teacherId, isActive: true },
      select: { dayOfWeek: true, startTime: true, endTime: true },
    }),
    prisma.teacherDateBlock.findMany({
      where: {
        teacherId,
        blockedDate: {
          gte: new Date(`${addDaysToKey(today, -1)}T00:00:00Z`),
          lte: new Date(`${addDaysToKey(today, 32)}T00:00:00Z`),
        },
      },
      select: { blockedDate: true },
    }),
    prisma.classSession.findMany({
      where: {
        teacherId,
        status: { in: [...SLOT_OCCUPYING_STATUSES] },
        scheduledAt: { gte: windowStart, lte: windowEnd },
      },
      select: { scheduledAt: true, durationMinutes: true, status: true, holdExpiresAt: true },
    }),
  ]);
  return { availability, blockedDates: blocks.map((b) => dateKeyOfDbDate(b.blockedDate)), bookings };
}

// ─────────────────────────── Apartado del horario ───────────────────────────

export interface HoldInput {
  teacherId: string;
  studentProfileId: string;
  track: ClassTrack;
  subjectKey: string;
  scheduledAt: Date;
  durationMinutes: ClassDuration;
  idempotencyKey: string;
  tariff: {
    baseCents: number;
    finalCents: number;
    capped: boolean;
    multipliers: { level: number; duration: number; advance: number; schedule: number; demand: number };
  };
  split: { teacherCents: number; yaentreCents: number };
  adultDeclarationVersion: string;
  now: Date;
}

export type HoldResult =
  | { ok: true; classSession: ClassSession; replay: false }
  | { ok: true; classSession: ClassSession; replay: true }
  | { ok: false; reason: 'SLOT_TAKEN' | 'IDEMPOTENCY_CONFLICT' };

export async function findClassByIdempotencyKey(idempotencyKey: string) {
  return prisma.classSession.findUnique({ where: { idempotencyKey } });
}

export async function createClassHold(input: HoldInput): Promise<HoldResult> {
  const existing = await findClassByIdempotencyKey(input.idempotencyKey);
  if (existing) {
    return existing.studentProfileId === input.studentProfileId
      ? { ok: true, classSession: existing, replay: true }
      : { ok: false, reason: 'IDEMPOTENCY_CONFLICT' };
  }

  const until = blockedUntil(input.scheduledAt, input.durationMinutes);
  try {
    return await withKeyedAdvisoryLock(lockKey(input.teacherId), async (tx) => {
      // Apartados vencidos de ESTE profesor: liberan su horario antes de
      // revisar (la restricción de exclusión todavía los cuenta).
      await tx.classSession.updateMany({
        where: { teacherId: input.teacherId, status: 'PENDING_PAYMENT', holdExpiresAt: { lte: input.now } },
        data: { status: 'CANCELLED', cancelledAt: input.now, cancelledBy: 'SYSTEM', cancellationReason: 'hold_expired' },
      });

      const overlapping = await tx.classSession.findFirst({
        where: {
          teacherId: input.teacherId,
          status: { in: [...SLOT_OCCUPYING_STATUSES] },
          scheduledAt: { lt: until },
          blockedUntil: { gt: input.scheduledAt },
        },
        select: { id: true },
      });
      if (overlapping) return { ok: false as const, reason: 'SLOT_TAKEN' as const };

      const created = await tx.classSession.create({
        data: {
          teacherId: input.teacherId,
          studentProfileId: input.studentProfileId,
          track: input.track,
          subjectKey: input.subjectKey,
          scheduledAt: input.scheduledAt,
          durationMinutes: input.durationMinutes,
          blockedUntil: until,
          baseTariffCents: input.tariff.baseCents,
          levelMultiplier: input.tariff.multipliers.level,
          durationMultiplier: input.tariff.multipliers.duration,
          advanceMultiplier: input.tariff.multipliers.advance,
          scheduleMultiplier: input.tariff.multipliers.schedule,
          demandMultiplier: input.tariff.multipliers.demand,
          finalTariffCents: input.tariff.finalCents,
          capped: input.tariff.capped,
          commissionCents: input.split.yaentreCents,
          teacherPayCents: input.split.teacherCents,
          idempotencyKey: input.idempotencyKey,
          holdExpiresAt: new Date(input.now.getTime() + HOLD_MINUTES * 60_000),
          studentAdultDeclaredAt: input.now,
          adultDeclarationVersion: input.adultDeclarationVersion,
          status: 'PENDING_PAYMENT',
        },
      });
      return { ok: true as const, classSession: created, replay: false as const };
    });
  } catch (err) {
    if (isExclusionViolation(err)) return { ok: false, reason: 'SLOT_TAKEN' };
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const again = await findClassByIdempotencyKey(input.idempotencyKey);
      if (again && again.studentProfileId === input.studentProfileId) {
        return { ok: true, classSession: again, replay: true };
      }
      return { ok: false, reason: 'IDEMPOTENCY_CONFLICT' };
    }
    throw err;
  }
}

export async function attachPaymentRefs(
  classSessionId: string,
  refs: { stripePaymentId?: string; stripeCheckoutSessionId?: string; stripeCustomerId?: string }
): Promise<void> {
  await prisma.classSession.update({ where: { id: classSessionId }, data: refs });
}

/** Cobro rechazado o 3DS abandonado: libera el horario de inmediato. */
export async function releaseHold(classSessionId: string, reason: string, now: Date): Promise<void> {
  await prisma.classSession.updateMany({
    where: { id: classSessionId, status: 'PENDING_PAYMENT' },
    data: { status: 'CANCELLED', cancelledAt: now, cancelledBy: 'SYSTEM', cancellationReason: reason },
  });
}

// ─────────────────────────── Webhook ───────────────────────────

export type ConfirmOutcome = 'booked' | 'already' | 'conflict' | 'mismatch' | 'not_found';

/**
 * Confirmación del cobro (llamada desde el webhook, dentro de su transacción
 * idempotente). Verifica MONTO, MONEDA y ALUMNO contra la fila; si el apartado
 * ya había caducado y el horario lo tomó otra persona, devuelve `conflict`
 * para que el llamador reembolse.
 */
export async function confirmClassBookingTx(
  tx: Prisma.TransactionClient,
  input: {
    classSessionId: string;
    studentProfileId: string | undefined;
    paymentIntentId: string | null;
    stripeCustomerId: string | null;
    amountMxn: number | null;
    currency: string | null;
    now: Date;
  }
): Promise<ConfirmOutcome> {
  const row = await tx.classSession.findUnique({ where: { id: input.classSessionId } });
  if (!row) return 'not_found';
  if (
    row.studentProfileId !== input.studentProfileId ||
    input.amountMxn !== row.finalTariffCents ||
    input.currency !== 'mxn'
  ) {
    return 'mismatch';
  }
  if (row.paidAt) return 'already';

  await lockKeyInTx(tx, lockKey(row.teacherId));

  if (row.status === 'CANCELLED') {
    const overlapping = await tx.classSession.findFirst({
      where: {
        id: { not: row.id },
        teacherId: row.teacherId,
        status: { in: [...SLOT_OCCUPYING_STATUSES] },
        scheduledAt: { lt: row.blockedUntil },
        blockedUntil: { gt: row.scheduledAt },
      },
      select: { id: true },
    });
    if (overlapping || row.cancellationReason === 'refunded') {
      await tx.classSession.update({
        where: { id: row.id },
        data: {
          paidAt: input.now,
          stripePaymentId: input.paymentIntentId ?? row.stripePaymentId,
          cancellationReason: 'slot_taken_after_payment',
        },
      });
      return 'conflict';
    }
  } else if (row.status !== 'PENDING_PAYMENT') {
    return 'already';
  }

  await tx.classSession.update({
    where: { id: row.id },
    data: {
      status: 'BOOKED',
      paidAt: input.now,
      holdExpiresAt: null,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      stripePaymentId: input.paymentIntentId ?? row.stripePaymentId,
      stripeCustomerId: input.stripeCustomerId ?? row.stripeCustomerId,
    },
  });
  return 'booked';
}

export async function releaseClassBookingTx(
  tx: Prisma.TransactionClient,
  classSessionId: string,
  reason: string,
  now: Date
): Promise<void> {
  await tx.classSession.updateMany({
    where: { id: classSessionId, status: 'PENDING_PAYMENT', paidAt: null },
    data: { status: 'CANCELLED', cancelledAt: now, cancelledBy: 'SYSTEM', cancellationReason: reason },
  });
}

/** Reembolso registrado (por la app o desde el panel de Stripe). */
export async function recordClassRefundTx(
  tx: Prisma.TransactionClient,
  paymentIntentId: string,
  refundedCents: number,
  now: Date
): Promise<boolean> {
  const row = await tx.classSession.findUnique({ where: { stripePaymentId: paymentIntentId } });
  if (!row) return false;
  const total = Math.min(row.finalTariffCents, Math.max(row.refundedCents, refundedCents));
  const fullyRefunded = total >= row.finalTariffCents;
  await tx.classSession.update({
    where: { id: row.id },
    data: {
      refundedCents: total,
      refundedAt: row.refundedAt ?? now,
      ...(fullyRefunded && (row.status === 'BOOKED' || row.status === 'CONFIRMED' || row.status === 'PENDING_PAYMENT')
        ? { status: 'CANCELLED', cancelledAt: row.cancelledAt ?? now, cancelledBy: row.cancelledBy ?? 'SYSTEM', cancellationReason: row.cancellationReason ?? 'refunded' }
        : {}),
    },
  });
  return true;
}

// ─────────────────────────── Cancelar y cerrar ───────────────────────────

export function getClassForStudent(classSessionId: string, studentProfileId: string) {
  return prisma.classSession.findFirst({
    where: { id: classSessionId, studentProfileId },
    include: { teacher: { select: { displayName: true, level: true } } },
  });
}

export function getClassForTeacher(classSessionId: string, teacherId: string) {
  return prisma.classSession.findFirst({ where: { id: classSessionId, teacherId } });
}

export async function markClassCancelled(
  classSessionId: string,
  input: { by: 'STUDENT' | 'TEACHER'; reason: string | null; refundId: string | null; refundedCents: number; now: Date }
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const row = await tx.classSession.update({
      where: { id: classSessionId },
      data: {
        status: 'CANCELLED',
        cancelledAt: input.now,
        cancelledBy: input.by,
        cancellationReason: input.reason,
        stripeRefundId: input.refundId,
        refundedCents: input.refundedCents,
        refundedAt: input.refundedCents > 0 ? input.now : null,
      },
    });
    if (input.by === 'TEACHER') await recomputeTeacherMetricsTx(tx, row.teacherId, input.now);
  });
}

/** El profesor (o el admin) cierra una clase ya ocurrida → entra a la liquidación. */
export async function markClassCompleted(classSessionId: string, now: Date): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const r = await tx.classSession.updateMany({
      where: { id: classSessionId, status: { in: ['BOOKED', 'CONFIRMED', 'IN_PROGRESS'] }, paidAt: { not: null } },
      data: { status: 'COMPLETED', completedAt: now },
    });
    if (r.count === 0) return false;
    const row = await tx.classSession.findUniqueOrThrow({ where: { id: classSessionId }, select: { teacherId: true } });
    await recomputeTeacherMetricsTx(tx, row.teacherId, now);
    return true;
  });
}

/** Métricas del nivel por mérito: clases impartidas y tasa de cancelación. */
async function recomputeTeacherMetricsTx(tx: Prisma.TransactionClient, teacherId: string, now: Date) {
  const [completed, teacherCancelled, teacher] = await Promise.all([
    tx.classSession.count({ where: { teacherId, status: 'COMPLETED' } }),
    tx.classSession.count({ where: { teacherId, status: 'CANCELLED', cancelledBy: 'TEACHER', paidAt: { not: null } } }),
    tx.teacher.findUniqueOrThrow({ where: { id: teacherId } }),
  ]);
  const denominator = completed + teacherCancelled;
  const cancellationRate = denominator === 0 ? 0 : Math.round((teacherCancelled / denominator) * 1000) / 10;
  const monthsActive = teacher.onboardedAt
    ? Math.max(0, Math.floor((now.getTime() - teacher.onboardedAt.getTime()) / (30.44 * 86_400_000)))
    : 0;
  const next = evaluateTeacherLevel({
    totalClassesGiven: completed,
    averageRating: teacher.averageRating,
    cancellationRate,
    monthsActive,
    level: teacher.level,
  });
  await tx.teacher.update({
    where: { id: teacherId },
    data: {
      totalClassesGiven: completed,
      cancellationRate,
      monthsActive,
      ...(next ? { level: next, levelPromotedAt: now } : {}),
    },
  });
}

// ─────────────────────────── Listados ───────────────────────────

export function listStudentClasses(studentProfileId: string) {
  return prisma.classSession.findMany({
    where: { studentProfileId, OR: [{ paidAt: { not: null } }, { status: 'PENDING_PAYMENT' }] },
    include: { teacher: { select: { displayName: true, level: true } } },
    orderBy: { scheduledAt: 'desc' },
    take: 100,
  });
}

export function listTeacherClasses(teacherId: string) {
  return prisma.classSession.findMany({
    where: { teacherId, paidAt: { not: null } },
    orderBy: { scheduledAt: 'desc' },
    take: 200,
  });
}

/** Un customer de Stripe ya conocido para el alumno (suscripción o clase anterior). */
export async function findStudentStripeCustomerId(studentProfileId: string): Promise<string | null> {
  const [cls, sub] = await Promise.all([
    prisma.classSession.findFirst({
      where: { studentProfileId, stripeCustomerId: { not: null }, paidAt: { not: null } },
      orderBy: { paidAt: 'desc' },
      select: { stripeCustomerId: true },
    }),
    prisma.subscription.findFirst({
      where: { userProfileId: studentProfileId, stripeCustomerId: { not: null } },
      orderBy: { updatedAt: 'desc' },
      select: { stripeCustomerId: true },
    }),
  ]);
  return cls?.stripeCustomerId ?? sub?.stripeCustomerId ?? null;
}
