import { Prisma, type ClassTrack, type Teacher, type TeacherStatus } from '@prisma/client';
import { prisma } from './prisma';
import type { AvailabilityBlock } from '@/lib/teachers/availability';
import { determinePaymentRail, normalizeId, TEACHER_LEGAL_VERSIONS } from '@/lib/teachers/onboarding';

/**
 * G103 — capa de datos del profesor: alta, disponibilidad y fechas
 * bloqueadas. El dueño de cada recurso SIEMPRE se pasa desde el guard
 * (`teacherId` del profesor de la sesión): ninguna función acepta un id que
 * venga del cliente sin filtrarlo por ese dueño.
 */

export class TeacherError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'TeacherError';
  }
}

export type TeacherWithSubjects = Prisma.TeacherGetPayload<{ include: { subjects: true } }>;

export function getTeacherByProfile(userProfileId: string): Promise<TeacherWithSubjects | null> {
  return prisma.teacher.findUnique({ where: { userProfileId }, include: { subjects: true } });
}

export interface TeacherApplicationInput {
  displayName: string;
  bio: string | null;
  fullName: string;
  curp: string;
  phone: string;
  clabe: string;
  bankName: string;
  canInvoice: boolean;
  rfc: string | null;
  subjects: Array<{ subjectKey: string; track: ClassTrack }>;
}

/** Estados en los que NO se puede volver a solicitar. */
const BLOCKING: TeacherStatus[] = ['PENDING_REVIEW', 'ACTIVE', 'SUSPENDED', 'INACTIVE'];

export async function submitTeacherApplication(
  userProfileId: string,
  input: TeacherApplicationInput,
  now: Date
): Promise<Teacher> {
  const existing = await prisma.teacher.findUnique({ where: { userProfileId } });
  if (existing && BLOCKING.includes(existing.status)) {
    throw new TeacherError('ALREADY_APPLIED', 'Ya tienes una solicitud o un perfil de profesor.');
  }

  const rfc = input.canInvoice && input.rfc ? normalizeId(input.rfc) : null;
  const data = {
    displayName: input.displayName.trim(),
    bio: input.bio?.trim() || null,
    fullName: input.fullName.trim(),
    curp: normalizeId(input.curp),
    phone: input.phone.replace(/[^\d+]/g, ''),
    clabe: input.clabe.replace(/\s+/g, ''),
    bankName: input.bankName.trim(),
    canInvoice: input.canInvoice,
    rfc,
    // La constancia se sube DESPUÉS (necesita el id del profesor para el path):
    // hasta entonces el carril es B aunque haya dicho que factura.
    paymentRail: determinePaymentRail(input.canInvoice, rfc, existing?.csfDocumentPath ?? null),
    status: 'PENDING_REVIEW' as const,
    reviewNote: null,
    contractAcceptedAt: now,
    contractVersion: TEACHER_LEGAL_VERSIONS.contract,
    ndaAcceptedAt: now,
    recordingPolicyAcceptedAt: now,
  };

  return prisma.$transaction(async (tx) => {
    const teacher = existing
      ? await tx.teacher.update({ where: { id: existing.id }, data })
      : await tx.teacher.create({ data: { ...data, userProfileId } });
    await tx.teacherSubject.deleteMany({ where: { teacherId: teacher.id } });
    await tx.teacherSubject.createMany({
      data: input.subjects.map((s) => ({ teacherId: teacher.id, subjectKey: s.subjectKey, track: s.track })),
      skipDuplicates: true,
    });
    return teacher;
  });
}

/** Constancia de situación fiscal ya subida → recalcula el carril. */
export async function recordTeacherCsf(teacherId: string, path: string): Promise<Teacher> {
  const t = await prisma.teacher.findUniqueOrThrow({ where: { id: teacherId } });
  return prisma.teacher.update({
    where: { id: teacherId },
    data: { csfDocumentPath: path, paymentRail: determinePaymentRail(t.canInvoice, t.rfc, path) },
  });
}

export async function updateTeacherPublicProfile(
  teacherId: string,
  input: { displayName: string; bio: string | null }
): Promise<void> {
  await prisma.teacher.update({
    where: { id: teacherId },
    data: { displayName: input.displayName.trim(), bio: input.bio?.trim() || null },
  });
}

// ─────────────────────────── Disponibilidad ───────────────────────────

export function getAvailability(teacherId: string) {
  return prisma.teacherAvailability.findMany({
    where: { teacherId, isActive: true },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
  });
}

/** Reemplazo en LOTE y transaccional (spec §1.5): o queda la semana nueva, o la anterior. */
export async function replaceAvailability(teacherId: string, blocks: AvailabilityBlock[]): Promise<number> {
  return prisma.$transaction(async (tx) => {
    await tx.teacherAvailability.deleteMany({ where: { teacherId } });
    if (blocks.length === 0) return 0;
    const r = await tx.teacherAvailability.createMany({
      data: blocks.map((b) => ({ teacherId, dayOfWeek: b.dayOfWeek, startTime: b.startTime, endTime: b.endTime })),
    });
    return r.count;
  });
}

// ─────────────────────────── Fechas bloqueadas ───────────────────────────

/** `@db.Date` llega como medianoche UTC: la clave es la fecha tal cual. */
export function dateKeyOfDbDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function listDateBlocks(teacherId: string, fromKey: string) {
  const rows = await prisma.teacherDateBlock.findMany({
    where: { teacherId, blockedDate: { gte: new Date(`${fromKey}T00:00:00Z`) } },
    orderBy: { blockedDate: 'asc' },
    select: { id: true, blockedDate: true, reason: true },
  });
  return rows.map((r) => ({ id: r.id, date: dateKeyOfDbDate(r.blockedDate), reason: r.reason }));
}

export async function addDateBlock(teacherId: string, dateKey: string, reason: string | null) {
  try {
    const r = await prisma.teacherDateBlock.create({
      data: { teacherId, blockedDate: new Date(`${dateKey}T00:00:00Z`), reason: reason?.trim() || null },
    });
    return { id: r.id, date: dateKey, reason: r.reason };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new TeacherError('DUPLICATE', 'Esa fecha ya está bloqueada.');
    }
    throw err;
  }
}

/** Solo borra si la fecha es de ESTE profesor (`count` 0 = no existe o es de otro). */
export async function deleteDateBlock(teacherId: string, id: string): Promise<boolean> {
  const r = await prisma.teacherDateBlock.deleteMany({ where: { id, teacherId } });
  return r.count === 1;
}

// ─────────────────────────── Administración ───────────────────────────

export function listTeachersForAdmin(status?: TeacherStatus) {
  return prisma.teacher.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: { subjects: true },
    take: 200,
  });
}

export function getTeacherForAdmin(teacherId: string) {
  return prisma.teacher.findUnique({ where: { id: teacherId }, include: { subjects: true } });
}

export async function setTeacherStatus(
  teacherId: string,
  status: TeacherStatus,
  note: string | null,
  now: Date
): Promise<Teacher> {
  return prisma.teacher.update({
    where: { id: teacherId },
    data: {
      status,
      reviewNote: note,
      ...(status === 'ACTIVE' ? { onboardedAt: now, suspendedAt: null, suspendReason: null } : {}),
      ...(status === 'SUSPENDED' ? { suspendedAt: now, suspendReason: note } : {}),
    },
  });
}
