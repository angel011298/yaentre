import { Prisma, type CancelledBy, type ClassStatus, type TeacherLevel } from '@prisma/client';
import { prisma } from './prisma';
import { runIdempotent } from './billing';
import { withAdvisoryLocks } from './locks';
import { MarketplaceError } from '@/lib/classes/errors';
import { firstNameOf } from '@/lib/classes/format';
import {
  CANCELLABLE_STATUSES,
  PAYMENT_SLOT_RELEASE_MINUTES,
  SLOT_HOLDING_STATUSES,
  canTransition,
  checkCanRate,
  classCompletable,
  computeCancellation,
  disputeWindowOpen,
  meetingLinkDueAt,
  noShowDeclarable,
  paymentHoldExpired,
  studentCanCancel,
  type CancellationCause,
  type CancellationOutcome,
} from '@/lib/classes/policy';
import type { ClassPaymentOutcome, ClassPaymentStore } from '@/lib/stripe/class-payments';
import {
  computeCancellationRate,
  evaluateTeacherLevel,
  wholeMonthsBetween,
} from '@/lib/teachers/level-engine';
import { classEndsAt, intervalsOverlap } from '@/lib/teachers/schedule';
import {
  SUBJECT_LABELS,
  isSubjectKey,
  type DurationMinutes,
  type SubjectKey,
  type TariffBreakdown,
  type TariffSplit,
} from '@/lib/teachers/tariff';

/**
 * Capa de datos de las CLASES — Bloque 2 (spec §6). Solo base de datos: nada de
 * Stripe ni de correo (eso vive en `src/lib/classes/*`, que orquesta). Aquí
 * están las transiciones de estado, y cada una:
 *
 *  · va CONDICIONADA al estado (`updateMany` con el estado esperado en el
 *    `where`): ante dos peticiones concurrentes solo una gana, y una transición
 *    ilegal (revivir una clase cancelada) no puede ocurrir ni con una carrera;
 *  · verifica la PERTENENCIA en la misma consulta (`studentProfileId` o
 *    `teacherId` en el `where`): pedir la clase de otra persona devuelve
 *    NOT_FOUND —no FORBIDDEN—, para no confirmar que el id existe.
 *
 * Los identificadores de persona llegan SIEMPRE del guard del llamador.
 */

// ─────────────────────────────── Vistas ───────────────────────────────

/**
 * Lo que un ALUMNO ve de una clase suya. No incluye la tarifa base, los
 * multiplicadores, la comisión ni la parte del profesor (spec §5.0: el alumno
 * solo ve el precio final); una prueba fija estos campos.
 */
export const STUDENT_CLASS_SELECT = {
  id: true,
  subjectKey: true,
  scheduledAt: true,
  durationMinutes: true,
  finalTariffCents: true,
  status: true,
  paidAt: true,
  refundedCents: true,
  cancelledAt: true,
  cancelledBy: true,
  completedAt: true,
  studentRating: true,
  ratedAt: true,
  meetingUrl: true,
  recordingConsent: true,
  createdAt: true,
  teacher: { select: { id: true, publicName: true, level: true } },
} satisfies Prisma.ClassSessionSelect;

/**
 * Lo que un PROFESOR ve de una clase suya: su parte, no el precio que pagó el
 * alumno ni la comisión, y del alumno solo su primer nombre.
 */
export const TEACHER_CLASS_SELECT = {
  id: true,
  subjectKey: true,
  scheduledAt: true,
  durationMinutes: true,
  teacherPayCents: true,
  status: true,
  confirmedAt: true,
  completedAt: true,
  cancelledAt: true,
  cancelledBy: true,
  meetingUrl: true,
  recordingConsent: true,
  studentRating: true,
  studentProfile: { select: { displayName: true } },
} satisfies Prisma.ClassSessionSelect;

type StudentClassRow = Prisma.ClassSessionGetPayload<{ select: typeof STUDENT_CLASS_SELECT }>;
type TeacherClassRow = Prisma.ClassSessionGetPayload<{ select: typeof TEACHER_CLASS_SELECT }>;

/** El enlace solo se muestra desde 15 min antes y hasta media hora después del fin, y solo en una clase confirmada. */
function joinUrlFor(
  row: { status: ClassStatus; meetingUrl: string | null; scheduledAt: Date; durationMinutes: number },
  now: Date
): string | null {
  if (!row.meetingUrl) return null;
  if (row.status !== 'CONFIRMED' && row.status !== 'IN_PROGRESS') return null;
  if (now.getTime() < meetingLinkDueAt(row.scheduledAt).getTime()) return null;
  if (now.getTime() > classEndsAt(row.scheduledAt, row.durationMinutes).getTime() + 30 * 60_000) return null;
  return row.meetingUrl;
}

function subjectLabel(key: string): string {
  return isSubjectKey(key) ? SUBJECT_LABELS[key] : key;
}

export interface StudentClassView {
  id: string;
  subjectKey: string;
  subjectLabel: string;
  scheduledAt: Date;
  durationMinutes: number;
  priceCents: number;
  status: ClassStatus;
  teacher: { id: string; publicName: string; level: TeacherLevel };
  canCancel: boolean;
  canRate: boolean;
  joinUrl: string | null;
  rating: number | null;
  refundedCents: number;
  /** ¿Se grabará? El alumno tiene que saberlo antes de entrar. */
  willBeRecorded: boolean;
}

export function toStudentClassView(row: StudentClassRow, now: Date): StudentClassView {
  return {
    id: row.id,
    subjectKey: row.subjectKey,
    subjectLabel: subjectLabel(row.subjectKey),
    scheduledAt: row.scheduledAt,
    durationMinutes: row.durationMinutes,
    priceCents: row.finalTariffCents,
    status: row.status,
    teacher: row.teacher,
    canCancel: studentCanCancel(row.status, row.scheduledAt, now),
    canRate: checkCanRate({
      status: row.status,
      completedAt: row.completedAt,
      ratedAt: row.ratedAt,
      rating: 5,
      now,
    }).ok,
    joinUrl: joinUrlFor(row, now),
    rating: row.studentRating,
    refundedCents: row.refundedCents,
    willBeRecorded: row.recordingConsent,
  };
}

export interface TeacherClassView {
  id: string;
  subjectLabel: string;
  scheduledAt: Date;
  durationMinutes: number;
  /** Lo que le corresponde al profesor por esta clase. */
  payCents: number;
  status: ClassStatus;
  /** Solo el primer nombre del alumno (minimización de datos). */
  studentLabel: string;
  canConfirm: boolean;
  canComplete: boolean;
  canDeclareStudentNoShow: boolean;
  joinUrl: string | null;
  willBeRecorded: boolean;
  rating: number | null;
}

export function toTeacherClassView(row: TeacherClassRow, now: Date): TeacherClassView {
  return {
    id: row.id,
    subjectLabel: subjectLabel(row.subjectKey),
    scheduledAt: row.scheduledAt,
    durationMinutes: row.durationMinutes,
    payCents: row.teacherPayCents,
    status: row.status,
    studentLabel: firstNameOf(row.studentProfile.displayName),
    canConfirm: row.status === 'BOOKED' && now.getTime() < row.scheduledAt.getTime(),
    canComplete: row.status === 'CONFIRMED' && classCompletable(row.scheduledAt, row.durationMinutes, now),
    canDeclareStudentNoShow: row.status === 'CONFIRMED' && noShowDeclarable(row.scheduledAt, now),
    joinUrl: joinUrlFor(row, now),
    willBeRecorded: row.recordingConsent,
    rating: row.studentRating,
  };
}

/** Clases del alumno: las recientes y futuras primero. Tope de 100 filas. */
export async function listStudentClasses(studentProfileId: string, now: Date): Promise<StudentClassView[]> {
  const rows = await prisma.classSession.findMany({
    where: { studentProfileId },
    orderBy: { scheduledAt: 'desc' },
    take: 100,
    select: STUDENT_CLASS_SELECT,
  });
  return rows
    // Una reserva sin pagar que ya venció no es «una clase»: es un horario que se soltó.
    .filter((r) => !(r.status === 'PENDING_PAYMENT' && paymentHoldExpired(r.createdAt, now)))
    .map((r) => toStudentClassView(r, now));
}

export async function getStudentClass(
  classId: string,
  studentProfileId: string,
  now: Date
): Promise<StudentClassView | null> {
  const row = await prisma.classSession.findFirst({
    where: { id: classId, studentProfileId },
    select: STUDENT_CLASS_SELECT,
  });
  return row ? toStudentClassView(row, now) : null;
}

export async function listTeacherClasses(teacherId: string, now: Date): Promise<TeacherClassView[]> {
  const rows = await prisma.classSession.findMany({
    // Una reserva sin pagar todavía no es del profesor: no se la mostramos.
    where: { teacherId, status: { not: 'PENDING_PAYMENT' } },
    orderBy: { scheduledAt: 'desc' },
    take: 100,
    select: TEACHER_CLASS_SELECT,
  });
  return rows.map((r) => toTeacherClassView(r, now));
}

// ─────────────────────────────── Reserva ───────────────────────────────

/** ¿Alguna clase viva de `owner` se traslapa con [start, end)? Las reservas sin pagar vencidas no ocupan horario. */
async function hasOverlap(
  tx: Prisma.TransactionClient,
  owner: { teacherId: string } | { studentProfileId: string },
  start: Date,
  end: Date,
  now: Date
): Promise<boolean> {
  // La clase más larga dura 80 min: cualquiera que EMPIECE antes de start − 80
  // min ya terminó antes de `start`, así que no hace falta traerla.
  const from = new Date(start.getTime() - 80 * 60_000);
  const candidates = await tx.classSession.findMany({
    where: {
      ...owner,
      status: { in: [...SLOT_HOLDING_STATUSES] },
      scheduledAt: { gte: from, lt: end },
    },
    select: { scheduledAt: true, durationMinutes: true, status: true, createdAt: true },
  });
  return candidates.some(
    (c) =>
      !(c.status === 'PENDING_PAYMENT' && paymentHoldExpired(c.createdAt, now)) &&
      intervalsOverlap(start, end, c.scheduledAt, classEndsAt(c.scheduledAt, c.durationMinutes))
  );
}

export interface PendingClassInput {
  studentProfileId: string;
  teacherId: string;
  subjectKey: SubjectKey;
  scheduledAt: Date;
  durationMinutes: DurationMinutes;
  tariff: TariffBreakdown;
  split: TariffSplit;
  recordingConsent: boolean;
  now: Date;
}

/**
 * Crea la clase en PENDING_PAYMENT, RETENIENDO el horario mientras se cobra.
 *
 * Todo ocurre bajo el lock del profesor Y el del alumno (en orden fijo, sin
 * interbloqueo): dos alumnos que piden la misma hora al mismo profesor, o un
 * alumno que pide a dos profesores a la vez, no pueden pasar ambos la
 * comprobación de traslape — mismo patrón que G60 para el simulacro gratuito.
 */
export async function createPendingClass(
  input: PendingClassInput
): Promise<{ id: string; finalTariffCents: number }> {
  const end = classEndsAt(input.scheduledAt, input.durationMinutes);

  return withAdvisoryLocks(
    [`class-teacher:${input.teacherId}`, `class-student:${input.studentProfileId}`],
    async (tx) => {
      const teacher = await tx.teacher.findFirst({
        where: { id: input.teacherId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!teacher) throw new MarketplaceError('NOT_FOUND', 'Ese profesor ya no está disponible.');

      if (await hasOverlap(tx, { teacherId: input.teacherId }, input.scheduledAt, end, input.now)) {
        throw new MarketplaceError('SLOT_TAKEN', 'Ese horario ya se ocupó. Elige otro.');
      }
      if (await hasOverlap(tx, { studentProfileId: input.studentProfileId }, input.scheduledAt, end, input.now)) {
        throw new MarketplaceError('SLOT_TAKEN', 'Ya tienes otra clase en ese horario.');
      }

      const m = input.tariff.multipliers;
      return tx.classSession.create({
        data: {
          teacherId: input.teacherId,
          studentProfileId: input.studentProfileId,
          subjectKey: input.subjectKey,
          scheduledAt: input.scheduledAt,
          durationMinutes: input.durationMinutes,
          baseTariffCents: input.tariff.baseCents,
          levelMultiplier: m.level,
          durationMultiplier: m.duration,
          advanceMultiplier: m.advance,
          scheduleMultiplier: m.schedule,
          demandMultiplier: m.demand,
          finalTariffCents: input.tariff.finalCents,
          commissionCents: input.split.commissionCents,
          teacherPayCents: input.split.teacherPayCents,
          recordingConsent: input.recordingConsent,
          status: 'PENDING_PAYMENT',
        },
        select: { id: true, finalTariffCents: true },
      });
    }
  );
}

export async function attachCheckoutSession(classId: string, checkoutSessionId: string): Promise<void> {
  await prisma.classSession.update({ where: { id: classId }, data: { stripeCheckoutSessionId: checkoutSessionId } });
}

/** Suelta una reserva que no llegó a cobrarse (rechazo de la tarjeta, sesión abandonada). */
export async function abandonUnpaidClass(classId: string, reason: string, now: Date): Promise<boolean> {
  const res = await prisma.classSession.updateMany({
    where: { id: classId, status: 'PENDING_PAYMENT' },
    data: { status: 'CANCELLED', cancelledAt: now, cancelledBy: 'SYSTEM', cancellationReason: reason },
  });
  return res.count > 0;
}

// ─────────────────────────────── Pago (webhook) ───────────────────────────────

/**
 * Aplica un cobro confirmado por el WEBHOOK de Stripe (nunca por el redirect ni
 * por la respuesta de la API: guardrail de CLAUDE.md). Idempotente por
 * `event.id`, en la misma transacción que aplica el cambio (`runIdempotent`).
 *
 * Los tres desenlaces posibles de un cobro:
 *  · la clase sigue PENDING_PAYMENT y el monto coincide → BOOKED;
 *  · la clase sigue PENDING_PAYMENT y el monto NO coincide → se cancela y se
 *    marca todo lo cobrado como reembolso pendiente (nunca se reserva una clase
 *    con un cobro que no es el suyo);
 *  · la clase YA se soltó (CANCELLED sin cobro previo) → el pago llegó tarde: se
 *    reembolsa completo. El dinero de una clase que no existe no se queda.
 */
export const classPaymentStore: ClassPaymentStore = {
  async confirmPayment(eventId, eventType, input) {
    const outcome: { value: ClassPaymentOutcome } = { value: { kind: 'noop' } };

    const applied = await runIdempotent(eventId, eventType, async (tx) => {
      const cls = await tx.classSession.findUnique({
        where: { id: input.classSessionId },
        select: { id: true, status: true, finalTariffCents: true, paidAt: true, stripePaymentId: true },
      });
      if (!cls) {
        outcome.value = { kind: 'not_found' };
        return;
      }

      if (cls.status === 'PENDING_PAYMENT') {
        if (input.currency !== 'mxn' || input.amountReceivedCents !== cls.finalTariffCents) {
          await tx.classSession.update({
            where: { id: cls.id },
            data: {
              status: 'CANCELLED',
              cancelledAt: input.now,
              cancelledBy: 'SYSTEM',
              cancellationReason: 'PAYMENT_MISMATCH',
              stripePaymentId: input.paymentIntentId,
              paidAt: input.now,
              refundDueCents: input.amountReceivedCents,
              commissionCents: 0,
              teacherPayCents: 0,
            },
          });
          outcome.value = { kind: 'mismatch', classId: cls.id };
          return;
        }
        const res = await tx.classSession.updateMany({
          where: { id: cls.id, status: 'PENDING_PAYMENT' },
          data: { status: 'BOOKED', paidAt: input.now, stripePaymentId: input.paymentIntentId },
        });
        outcome.value = res.count > 0 ? { kind: 'booked', classId: cls.id } : { kind: 'noop' };
        return;
      }

      if (cls.status === 'CANCELLED' && cls.paidAt === null) {
        await tx.classSession.update({
          where: { id: cls.id },
          data: {
            stripePaymentId: input.paymentIntentId,
            paidAt: input.now,
            refundDueCents: input.amountReceivedCents,
            commissionCents: 0,
            teacherPayCents: 0,
          },
        });
        outcome.value = { kind: 'refund_due', classId: cls.id };
        return;
      }

      // BOOKED/CONFIRMED/… u otro estado con cobro ya registrado: repetido.
      outcome.value = { kind: 'noop' };
    });

    return applied === 'duplicate' ? { kind: 'duplicate' } : outcome.value;
  },

  async expireCheckout(eventId, eventType, input) {
    const outcome: { value: ClassPaymentOutcome } = { value: { kind: 'noop' } };
    const applied = await runIdempotent(eventId, eventType, async (tx) => {
      const res = await tx.classSession.updateMany({
        where: { id: input.classSessionId, status: 'PENDING_PAYMENT' },
        data: {
          status: 'CANCELLED',
          cancelledAt: input.now,
          cancelledBy: 'SYSTEM',
          cancellationReason: 'PAYMENT_TIMEOUT',
        },
      });
      outcome.value = res.count > 0 ? { kind: 'cancelled', classId: input.classSessionId } : { kind: 'noop' };
    });
    return applied === 'duplicate' ? { kind: 'duplicate' } : outcome.value;
  },
};

// ─────────────────────────────── Cancelación ───────────────────────────────

export type CancelActor =
  | { kind: 'STUDENT'; studentProfileId: string }
  | { kind: 'TEACHER'; teacherId: string }
  | { kind: 'SYSTEM' };

/** «CAUSA» o «CAUSA: texto libre» — la causa es un código estable que se puede consultar por prefijo. */
export function encodeCancellationReason(cause: CancellationCause | string, text?: string | null): string {
  const clean = text?.trim().replace(/\s+/g, ' ').slice(0, 300);
  return clean ? `${cause}: ${clean}` : cause;
}

export interface CancelResult {
  classId: string;
  teacherId: string;
  studentProfileId: string;
  subjectKey: string;
  scheduledAt: Date;
  cancelledBy: CancelledBy;
  outcome: CancellationOutcome;
  paid: boolean;
  stripeCheckoutSessionId: string | null;
  meetingEventId: string | null;
}

/**
 * Cancela una clase y decide, con `computeCancellation`, cuánto se devuelve. NO
 * llama a Stripe: deja `refundDueCents` en la fila y el orquestador (o el job de
 * reintento) emite el reembolso. Separarlo así hace que un fallo de Stripe no
 * revierta la cancelación ni pierda la deuda con el alumno.
 */
export async function cancelClass(input: {
  classId: string;
  actor: CancelActor;
  cause: CancellationCause;
  reasonText?: string | null;
  now: Date;
}): Promise<CancelResult> {
  const { classId, actor, cause, now } = input;

  return prisma.$transaction(async (tx) => {
    const owner =
      actor.kind === 'STUDENT'
        ? { studentProfileId: actor.studentProfileId }
        : actor.kind === 'TEACHER'
          ? { teacherId: actor.teacherId }
          : {};
    const cls = await tx.classSession.findFirst({
      where: { id: classId, ...owner },
      select: {
        id: true, status: true, teacherId: true, studentProfileId: true, subjectKey: true, scheduledAt: true,
        finalTariffCents: true, paidAt: true, stripeCheckoutSessionId: true, meetingEventId: true,
      },
    });
    if (!cls) throw new MarketplaceError('NOT_FOUND', 'No encontramos esa clase.');

    if (!(CANCELLABLE_STATUSES as readonly string[]).includes(cls.status)) {
      throw new MarketplaceError('INVALID_STATE', 'Esa clase ya no se puede cancelar.');
    }
    if (actor.kind === 'STUDENT' && !studentCanCancel(cls.status, cls.scheduledAt, now)) {
      throw new MarketplaceError('INVALID_STATE', 'La clase ya empezó: ya no se puede cancelar.');
    }
    if (actor.kind === 'TEACHER') {
      if (cls.status === 'PENDING_PAYMENT') {
        throw new MarketplaceError('INVALID_STATE', 'Esa clase todavía no está reservada.');
      }
      if (now.getTime() >= cls.scheduledAt.getTime()) {
        throw new MarketplaceError('INVALID_STATE', 'La clase ya empezó: si el alumno no llegó, decláralo desde tu panel.');
      }
    }

    // «Pagada» es que el cobro se CONFIRMÓ (`paidAt` lo escribe el webhook).
    const paid = cls.paidAt !== null;
    const outcome = computeCancellation({
      cause,
      paid,
      finalTariffCents: cls.finalTariffCents,
      scheduledAt: cls.scheduledAt,
      now,
    });
    const cancelledBy: CancelledBy = actor.kind;

    const res = await tx.classSession.updateMany({
      where: { id: cls.id, status: { in: [...CANCELLABLE_STATUSES] as ClassStatus[] } },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        cancelledBy,
        cancellationReason: encodeCancellationReason(cause, input.reasonText),
        refundDueCents: outcome.refundCents,
        commissionCents: outcome.commissionCents,
        teacherPayCents: outcome.teacherPayCents,
      },
    });
    if (res.count === 0) throw new MarketplaceError('INVALID_STATE', 'Esa clase ya no se puede cancelar.');

    if (outcome.countsAgainstTeacher) await recomputeTeacherMetrics(tx, cls.teacherId, now);

    return {
      classId: cls.id,
      teacherId: cls.teacherId,
      studentProfileId: cls.studentProfileId,
      subjectKey: cls.subjectKey,
      scheduledAt: cls.scheduledAt,
      cancelledBy,
      outcome,
      paid,
      stripeCheckoutSessionId: cls.stripeCheckoutSessionId,
      meetingEventId: cls.meetingEventId,
    };
  });
}

// ─────────────────────────────── Ciclo de vida de una clase ───────────────────────────────

/** BOOKED → CONFIRMED (el profesor confirma su asistencia, spec §6.4). */
export async function confirmClass(teacherId: string, classId: string, now: Date): Promise<void> {
  const cls = await prisma.classSession.findFirst({
    where: { id: classId, teacherId },
    select: { status: true, scheduledAt: true },
  });
  if (!cls) throw new MarketplaceError('NOT_FOUND', 'No encontramos esa clase.');
  if (now.getTime() >= cls.scheduledAt.getTime()) {
    throw new MarketplaceError('INVALID_STATE', 'La clase ya empezó.');
  }
  const res = await prisma.classSession.updateMany({
    where: { id: classId, teacherId, status: 'BOOKED' },
    data: { status: 'CONFIRMED', confirmedAt: now },
  });
  if (res.count === 0) {
    throw new MarketplaceError('INVALID_STATE', 'Esa clase no está pendiente de confirmar.');
  }
}

export interface LevelUp {
  promotedTo: 'VERIFICADO' | 'DESTACADO' | null;
}

/**
 * CONFIRMED → COMPLETED. La marca el PROFESOR y solo cuando la clase está por
 * terminar (`classCompletable`). Es la evidencia con la que después se le
 * liquida — por eso no se acepta al minuto 1 — y por eso el alumno conserva una
 * ventana de disputa.
 */
export async function completeClass(teacherId: string, classId: string, now: Date): Promise<LevelUp> {
  return prisma.$transaction(async (tx) => {
    const cls = await tx.classSession.findFirst({
      where: { id: classId, teacherId },
      select: { status: true, scheduledAt: true, durationMinutes: true },
    });
    if (!cls) throw new MarketplaceError('NOT_FOUND', 'No encontramos esa clase.');
    if (!classCompletable(cls.scheduledAt, cls.durationMinutes, now)) {
      throw new MarketplaceError('INVALID_STATE', 'Todavía no puedes marcar la clase como impartida: espera a que termine.');
    }
    const res = await tx.classSession.updateMany({
      where: { id: classId, teacherId, status: 'CONFIRMED' },
      data: { status: 'COMPLETED', completedAt: now },
    });
    if (res.count === 0) throw new MarketplaceError('INVALID_STATE', 'Esa clase no está confirmada.');
    return recomputeTeacherMetrics(tx, teacherId, now);
  });
}

/** El PROFESOR declara que el alumno no se presentó (pasada la gracia). Sin reembolso; el profesor sí cumplió. */
export async function declareStudentNoShow(teacherId: string, classId: string, now: Date): Promise<CancelResult> {
  return declareNoShow({ classId, now, by: { kind: 'TEACHER', teacherId }, toStatus: 'NO_SHOW_STUDENT', cause: 'STUDENT_NO_SHOW' });
}

/** El ALUMNO declara que el profesor no se presentó (pasada la gracia). Reembolso completo. */
export async function declareTeacherNoShow(
  studentProfileId: string,
  classId: string,
  now: Date
): Promise<CancelResult> {
  return declareNoShow({ classId, now, by: { kind: 'STUDENT', studentProfileId }, toStatus: 'NO_SHOW_TEACHER', cause: 'TEACHER_NO_SHOW' });
}

async function declareNoShow(input: {
  classId: string;
  now: Date;
  by: { kind: 'TEACHER'; teacherId: string } | { kind: 'STUDENT'; studentProfileId: string };
  toStatus: 'NO_SHOW_STUDENT' | 'NO_SHOW_TEACHER';
  cause: 'STUDENT_NO_SHOW' | 'TEACHER_NO_SHOW';
}): Promise<CancelResult> {
  const { classId, now, by, toStatus, cause } = input;
  return prisma.$transaction(async (tx) => {
    const owner = by.kind === 'TEACHER' ? { teacherId: by.teacherId } : { studentProfileId: by.studentProfileId };
    const cls = await tx.classSession.findFirst({
      where: { id: classId, ...owner },
      select: {
        id: true, status: true, teacherId: true, studentProfileId: true, subjectKey: true, scheduledAt: true,
        finalTariffCents: true, paidAt: true, stripeCheckoutSessionId: true, meetingEventId: true,
      },
    });
    if (!cls) throw new MarketplaceError('NOT_FOUND', 'No encontramos esa clase.');
    // El mapa de transiciones decide qué estados de partida son legales: solo
    // CONFIRMED → NO_SHOW_STUDENT, y CONFIRMED/BOOKED → NO_SHOW_TEACHER.
    if (!canTransition(cls.status, toStatus)) {
      throw new MarketplaceError('INVALID_STATE', 'No se puede reportar una ausencia en el estado actual de la clase.');
    }
    if (!noShowDeclarable(cls.scheduledAt, now)) {
      throw new MarketplaceError('INVALID_STATE', 'Espera unos minutos después del inicio antes de reportar una ausencia.');
    }

    const outcome = computeCancellation({
      cause,
      paid: cls.paidAt !== null,
      finalTariffCents: cls.finalTariffCents,
      scheduledAt: cls.scheduledAt,
      now,
    });

    const res = await tx.classSession.updateMany({
      // Condicionado al estado que se LEYÓ: si cambió entre la lectura y aquí,
      // no se aplica (y se reporta como estado inválido).
      where: { id: cls.id, status: cls.status },
      data: {
        status: toStatus,
        cancelledAt: now,
        cancelledBy: by.kind === 'TEACHER' ? 'TEACHER' : 'STUDENT',
        cancellationReason: cause,
        refundDueCents: outcome.refundCents,
        commissionCents: outcome.commissionCents,
        teacherPayCents: outcome.teacherPayCents,
      },
    });
    if (res.count === 0) throw new MarketplaceError('INVALID_STATE', 'Esa clase ya cambió de estado.');

    await recomputeTeacherMetrics(tx, cls.teacherId, now);

    return {
      classId: cls.id,
      teacherId: cls.teacherId,
      studentProfileId: cls.studentProfileId,
      subjectKey: cls.subjectKey,
      scheduledAt: cls.scheduledAt,
      cancelledBy: by.kind === 'TEACHER' ? 'TEACHER' : 'STUDENT',
      outcome,
      paid: cls.paidAt !== null,
      stripeCheckoutSessionId: cls.stripeCheckoutSessionId,
      meetingEventId: cls.meetingEventId,
    };
  });
}

/** El alumno califica una clase COMPLETADA, dentro de las 48 h (spec §6.6). */
export async function rateClass(input: {
  studentProfileId: string;
  classId: string;
  rating: number;
  feedback: string | null;
  now: Date;
}): Promise<LevelUp> {
  return prisma.$transaction(async (tx) => {
    const cls = await tx.classSession.findFirst({
      where: { id: input.classId, studentProfileId: input.studentProfileId },
      select: { status: true, completedAt: true, ratedAt: true, teacherId: true },
    });
    if (!cls) throw new MarketplaceError('NOT_FOUND', 'No encontramos esa clase.');

    const verdict = checkCanRate({
      status: cls.status,
      completedAt: cls.completedAt,
      ratedAt: cls.ratedAt,
      rating: input.rating,
      now: input.now,
    });
    if (!verdict.ok) {
      const messages = {
        INVALID_RATING: 'Elige una calificación de 1 a 5.',
        NOT_COMPLETED: 'Solo puedes calificar una clase que ya se impartió.',
        ALREADY_RATED: 'Ya calificaste esta clase.',
        WINDOW_CLOSED: 'Ya pasó el plazo de 48 horas para calificar esta clase.',
      } as const;
      throw new MarketplaceError(verdict.reason === 'INVALID_RATING' ? 'VALIDATION' : 'INVALID_STATE', messages[verdict.reason]);
    }

    const res = await tx.classSession.updateMany({
      where: { id: input.classId, studentProfileId: input.studentProfileId, ratedAt: null, status: 'COMPLETED' },
      data: {
        studentRating: input.rating,
        studentFeedback: input.feedback?.trim().slice(0, 500) || null,
        ratedAt: input.now,
      },
    });
    if (res.count === 0) throw new MarketplaceError('INVALID_STATE', 'Ya calificaste esta clase.');
    return recomputeTeacherMetrics(tx, cls.teacherId, input.now);
  });
}

/** El alumno reporta un problema de una clase «impartida» o discute una ausencia. Congela el pago del profesor. */
export async function disputeClass(input: {
  studentProfileId: string;
  classId: string;
  reason: string;
  now: Date;
}): Promise<{ teacherId: string; subjectKey: string; scheduledAt: Date }> {
  return prisma.$transaction(async (tx) => {
    const cls = await tx.classSession.findFirst({
      where: { id: input.classId, studentProfileId: input.studentProfileId },
      select: { status: true, completedAt: true, teacherId: true, subjectKey: true, scheduledAt: true },
    });
    if (!cls) throw new MarketplaceError('NOT_FOUND', 'No encontramos esa clase.');
    if (!canTransition(cls.status, 'DISPUTED')) {
      throw new MarketplaceError('INVALID_STATE', 'No se puede reportar un problema de esta clase.');
    }
    if (cls.status === 'COMPLETED' && cls.completedAt && !disputeWindowOpen(cls.completedAt, input.now)) {
      throw new MarketplaceError('INVALID_STATE', 'Ya pasó el plazo de 48 horas para reportar un problema.');
    }
    const res = await tx.classSession.updateMany({
      where: { id: input.classId, studentProfileId: input.studentProfileId, status: cls.status },
      data: { status: 'DISPUTED', disputeReason: input.reason.trim().slice(0, 1000), disputedAt: input.now },
    });
    if (res.count === 0) throw new MarketplaceError('INVALID_STATE', 'Esa clase ya cambió de estado.');
    await recomputeTeacherMetrics(tx, cls.teacherId, input.now);
    return { teacherId: cls.teacherId, subjectKey: cls.subjectKey, scheduledAt: cls.scheduledAt };
  });
}

// ─────────────────────────────── Métricas y nivel ───────────────────────────────

/**
 * Recalcula las métricas del profesor DESDE LAS CLASES y aplica la promoción de
 * nivel por mérito (spec §4.2). Se recalcula desde las filas y no con
 * contadores incrementales: un contador que se desvía (un reintento, una carrera)
 * nunca se corrige solo, y este cálculo es barato para el volumen esperado.
 *
 * Los niveles SOLO suben (`evaluateTeacherLevel` nunca devuelve uno inferior) y
 * las clases ya reservadas no cambian de tarifa (el multiplicador se selló al
 * reservar).
 */
export async function recomputeTeacherMetrics(
  tx: Prisma.TransactionClient,
  teacherId: string,
  now: Date
): Promise<LevelUp> {
  const [completed, studentNoShow, teacherNoShow, teacherCancelled, ratings, teacher] = await Promise.all([
    tx.classSession.count({ where: { teacherId, status: 'COMPLETED' } }),
    tx.classSession.count({ where: { teacherId, status: 'NO_SHOW_STUDENT' } }),
    tx.classSession.count({ where: { teacherId, status: 'NO_SHOW_TEACHER' } }),
    tx.classSession.count({
      where: {
        teacherId,
        status: 'CANCELLED',
        paidAt: { not: null },
        OR: [{ cancelledBy: 'TEACHER' }, { cancellationReason: { startsWith: 'TEACHER_NO_CONFIRMATION' } }],
      },
    }),
    tx.classSession.aggregate({
      where: { teacherId, studentRating: { not: null }, status: 'COMPLETED' },
      _avg: { studentRating: true },
      _count: { studentRating: true },
    }),
    tx.teacher.findUnique({ where: { id: teacherId }, select: { level: true, onboardedAt: true } }),
  ]);
  if (!teacher) return { promotedTo: null };

  const averageRating = ratings._avg.studentRating ?? 0;
  const cancellationRate = computeCancellationRate({
    completed,
    studentNoShow,
    teacherCancelled,
    teacherNoShow,
  });
  const monthsActive = teacher.onboardedAt ? wholeMonthsBetween(teacher.onboardedAt, now) : 0;

  const next = evaluateTeacherLevel({
    totalClassesGiven: completed,
    averageRating,
    cancellationRate,
    monthsActive,
    level: teacher.level,
  });

  await tx.teacher.update({
    where: { id: teacherId },
    data: {
      totalClassesGiven: completed,
      averageRating,
      ratingCount: ratings._count.studentRating,
      cancellationRate,
      monthsActive,
      ...(next ? { level: next, levelPromotedAt: now } : {}),
    },
  });

  return { promotedTo: next === 'VERIFICADO' || next === 'DESTACADO' ? next : null };
}

// ─────────────────────────────── Consultas del job ───────────────────────────────

export const lifecycleQueries = {
  /** Reservas sin pagar que ya vencieron. */
  expiredHolds(now: Date) {
    return prisma.classSession.findMany({
      where: { status: 'PENDING_PAYMENT', createdAt: { lt: new Date(now.getTime() - PAYMENT_SLOT_RELEASE_MINUTES * 60_000) } },
      select: { id: true, stripeCheckoutSessionId: true, stripePaymentId: true },
      take: 200,
    });
  },

  /** Clases pagadas que aún no confirmó el profesor (la línea de tiempo se aplica en el llamador). */
  awaitingConfirmation() {
    return prisma.classSession.findMany({
      where: { status: 'BOOKED', paidAt: { not: null } },
      select: {
        id: true, scheduledAt: true, paidAt: true, confirmationRequestedAt: true, adminAlertedAt: true,
      },
      take: 500,
    });
  },

  /** Clases confirmadas cuyo enlace ya toca mandar. */
  meetingLinksDue(now: Date) {
    return prisma.classSession.findMany({
      where: {
        status: 'CONFIRMED',
        meetingLinkSentAt: null,
        scheduledAt: { lte: new Date(now.getTime() + 15 * 60_000), gte: new Date(now.getTime() - 3 * 3_600_000) },
      },
      select: { id: true, scheduledAt: true, durationMinutes: true, meetingUrl: true, meetingEventId: true },
      take: 200,
    });
  },

  /** Clases con reembolso pendiente de emitir o de completar. */
  async refundsDue() {
    const rows = await prisma.classSession.findMany({
      where: { refundDueCents: { gt: 0 }, stripePaymentId: { not: null } },
      select: { id: true, refundDueCents: true, refundedCents: true },
      take: 500,
    });
    return rows.filter((r) => r.refundedCents < r.refundDueCents);
  },

  /** Grabaciones cuya retención venció. */
  expiredRecordings(now: Date) {
    return prisma.classSession.findMany({
      where: { recordingUrl: { not: null }, recordingExpiresAt: { lt: now } },
      select: { id: true, recordingUrl: true },
      take: 200,
    });
  },
};

// ─────────────────────────────── Contexto para avisos ───────────────────────────────

export interface ClassNotifyContext {
  id: string;
  status: ClassStatus;
  subjectKey: string;
  scheduledAt: Date;
  durationMinutes: number;
  finalTariffCents: number;
  recordingConsent: boolean;
  meetingUrl: string | null;
  confirmationRequestedAt: Date | null;
  student: { profileId: string; displayName: string | null };
  teacher: { id: string; userProfileId: string; publicName: string };
}

/** Todo lo que un correo de clase necesita, en una consulta. Nunca sale de esta capa hacia el navegador. */
export async function getClassNotifyContext(classId: string): Promise<ClassNotifyContext | null> {
  const row = await prisma.classSession.findUnique({
    where: { id: classId },
    select: {
      id: true,
      status: true,
      subjectKey: true,
      scheduledAt: true,
      durationMinutes: true,
      finalTariffCents: true,
      recordingConsent: true,
      meetingUrl: true,
      confirmationRequestedAt: true,
      studentProfile: { select: { id: true, displayName: true } },
      teacher: { select: { id: true, userProfileId: true, publicName: true } },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    subjectKey: row.subjectKey,
    scheduledAt: row.scheduledAt,
    durationMinutes: row.durationMinutes,
    finalTariffCents: row.finalTariffCents,
    recordingConsent: row.recordingConsent,
    meetingUrl: row.meetingUrl,
    confirmationRequestedAt: row.confirmationRequestedAt,
    student: { profileId: row.studentProfile.id, displayName: row.studentProfile.displayName },
    teacher: row.teacher,
  };
}

/** Marca (una sola vez) que ya se pidió la confirmación al profesor. Devuelve si esta llamada la marcó. */
export async function markConfirmationRequested(classId: string, now: Date): Promise<boolean> {
  const res = await prisma.classSession.updateMany({
    where: { id: classId, status: 'BOOKED', confirmationRequestedAt: null },
    data: { confirmationRequestedAt: now },
  });
  return res.count > 0;
}

/** Marca (una sola vez) que ya se alertó al admin y se avisó al alumno. */
export async function markAdminAlerted(classId: string, now: Date): Promise<boolean> {
  const res = await prisma.classSession.updateMany({
    where: { id: classId, status: 'BOOKED', adminAlertedAt: null },
    data: { adminAlertedAt: now },
  });
  return res.count > 0;
}

/** Guarda el enlace de la clase (una vez: la creación en el proveedor es idempotente por clase). */
export async function saveMeeting(
  classId: string,
  meeting: { meetingUrl: string; eventId: string }
): Promise<void> {
  await prisma.classSession.update({
    where: { id: classId },
    data: { meetingUrl: meeting.meetingUrl, meetingEventId: meeting.eventId },
  });
}

/** Marca que el enlace ya se mandó a las dos partes. */
export async function markMeetingLinkSent(classId: string, now: Date): Promise<void> {
  await prisma.classSession.updateMany({
    where: { id: classId, meetingLinkSentAt: null },
    data: { meetingLinkSentAt: now },
  });
}

// ─────────────────────────────── Datos para reservar ───────────────────────────────

export interface ActivePremium {
  /** Fin de vigencia = fecha del examen. `null` = sin tope. */
  expiresAt: Date | null;
  /** Cliente de Stripe donde el Checkout de Premium guardó la tarjeta (null en una cortesía). */
  stripeCustomerId: string | null;
}

/**
 * El Premium VIGENTE del alumno. Se pide PREMIUM a propósito: `getActiveSubscription`
 * devuelve la suscripción activa más reciente de cualquier plan, y un Pase de
 * Temporada más nuevo taparía a un Premium que sí da acceso a las clases.
 */
export async function getActivePremium(userProfileId: string, now: Date): Promise<ActivePremium | null> {
  const sub = await prisma.subscription.findFirst({
    where: {
      userProfileId,
      plan: 'PREMIUM',
      status: 'ACTIVE',
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { updatedAt: 'desc' },
    select: { expiresAt: true, stripeCustomerId: true },
  });
  return sub ? { expiresAt: sub.expiresAt, stripeCustomerId: sub.stripeCustomerId } : null;
}

export interface TeacherForBooking {
  id: string;
  userProfileId: string;
  publicName: string;
  level: TeacherLevel;
  availability: unknown;
  subjects: string[];
  recordingPolicyAccepted: boolean;
}

/** Un profesor RESERVABLE (ACTIVE). Cualquier otro estado es «no existe» para el alumno. */
export async function getTeacherForBooking(teacherId: string): Promise<TeacherForBooking | null> {
  const t = await prisma.teacher.findFirst({
    where: { id: teacherId, status: 'ACTIVE' },
    select: {
      id: true,
      userProfileId: true,
      publicName: true,
      level: true,
      availability: true,
      recordingPolicyAcceptedAt: true,
      subjects: { select: { subjectKey: true } },
    },
  });
  if (!t) return null;
  return {
    id: t.id,
    userProfileId: t.userProfileId,
    publicName: t.publicName,
    level: t.level,
    availability: t.availability,
    subjects: t.subjects.map((s) => s.subjectKey),
    recordingPolicyAccepted: t.recordingPolicyAcceptedAt !== null,
  };
}

/** Guarda el PaymentIntent del cobro con tarjeta guardada: permite reconciliar si el webhook se pierde. */
export async function attachPaymentIntent(classId: string, paymentIntentId: string): Promise<void> {
  await prisma.classSession.updateMany({
    where: { id: classId, status: 'PENDING_PAYMENT', stripePaymentId: null },
    data: { stripePaymentId: paymentIntentId },
  });
}
