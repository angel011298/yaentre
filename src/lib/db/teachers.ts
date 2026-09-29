import { Prisma, type TeacherLevel, type TeacherStatus } from '@prisma/client';
import { prisma } from './prisma';
import { MarketplaceError } from '@/lib/classes/errors';
import { SLOT_HOLDING_STATUSES } from '@/lib/classes/policy';
import { parseStoredAvailability, type AvailabilityBlock } from '@/lib/teachers/availability';
import { maskClabe } from '@/lib/teachers/identity';
import { levelProgress, wholeMonthsBetween, type LevelProgress } from '@/lib/teachers/level-engine';
import type { TeacherApplication } from '@/lib/teachers/onboarding';
import {
  BASE_RATES,
  SUBJECT_LABELS,
  isSubjectKey,
  teacherFromPriceCents,
  type SubjectKey,
} from '@/lib/teachers/tariff';

/**
 * Capa de datos del profesor — Bloque 2 (spec §2, §3 y §8).
 *
 * ── Qué ve quién ────────────────────────────────────────────────────────────
 *
 *  · CUALQUIER alumno Premium ve `PublicTeacherCard` / `PublicTeacherProfile`,
 *    que salen de `PUBLIC_TEACHER_SELECT`. Ese `select` NO incluye nombre
 *    completo, CURP, CLABE, RFC, teléfono, ruta de la constancia ni la tasa de
 *    cancelación: es una lista BLANCA, y una prueba impide que se le añada uno
 *    de esos campos por descuido.
 *  · El propio profesor ve `OwnTeacherView`: sus datos, con CURP y CLABE
 *    ENMASCARADAS (solo los últimos 4). Nunca se le devuelve entera ni a él: la
 *    pantalla no la necesita y una respuesta con la CLABE completa es una que un
 *    XSS o una extensión del navegador puede llevarse.
 *  · El admin (maestro) ve `TeacherAdminDetail`, con todo — es quien hace la
 *    revisión de identidad y la hoja de pago.
 *
 * Toda función que recibe `userProfileId` lo recibe DEL GUARD del llamador,
 * nunca de un cuerpo de petición (guardrail de CLAUDE.md).
 */

// ─────────────────────────────── Vistas públicas ───────────────────────────────

/**
 * Lista BLANCA de lo que un alumno puede ver de un profesor. Agregar aquí un
 * campo es una decisión de privacidad, no de comodidad: la prueba
 * `tests/teachers/public-select.test.ts` fija los campos permitidos y falla ante
 * cualquier otro.
 */
export const PUBLIC_TEACHER_SELECT = {
  id: true,
  publicName: true,
  bio: true,
  level: true,
  averageRating: true,
  ratingCount: true,
  totalClassesGiven: true,
  availability: true,
  subjects: { select: { subjectKey: true } },
} satisfies Prisma.TeacherSelect;

type PublicTeacherRow = Prisma.TeacherGetPayload<{ select: typeof PUBLIC_TEACHER_SELECT }>;

export interface PublicTeacherCard {
  id: string;
  publicName: string;
  level: TeacherLevel;
  /** `null` mientras no tenga calificaciones: un «0.0★» leería como una mala nota. */
  averageRating: number | null;
  ratingCount: number;
  subjects: Array<{ key: SubjectKey; label: string }>;
  /** «Desde $X», calculado sobre lo que de verdad se puede cobrar (ver `priceFloorCents`). */
  fromPriceCents: number | null;
}

export interface PublicTeacherProfile extends PublicTeacherCard {
  bio: string | null;
  totalClassesGiven: number;
  availability: AvailabilityBlock[];
}

function subjectKeysOf(row: { subjects: Array<{ subjectKey: string }> }): SubjectKey[] {
  return row.subjects.map((s) => s.subjectKey).filter(isSubjectKey);
}

export function toPublicCard(row: PublicTeacherRow): PublicTeacherCard {
  const keys = subjectKeysOf(row);
  return {
    id: row.id,
    publicName: row.publicName,
    level: row.level,
    averageRating: row.ratingCount > 0 ? Math.round(row.averageRating * 10) / 10 : null,
    ratingCount: row.ratingCount,
    subjects: keys.map((key) => ({ key, label: SUBJECT_LABELS[key] })),
    fromPriceCents: teacherFromPriceCents(keys, row.level),
  };
}

export function toPublicProfile(row: PublicTeacherRow): PublicTeacherProfile {
  return {
    ...toPublicCard(row),
    bio: row.bio,
    totalClassesGiven: row.totalClassesGiven,
    availability: parseStoredAvailability(row.availability),
  };
}

const LEVEL_RANK: Record<TeacherLevel, number> = { INICIAL: 0, VERIFICADO: 1, DESTACADO: 2 };
export const DIRECTORY_PAGE_SIZE = 24;
/** Tope de filas que se traen antes de filtrar en memoria: el directorio es chico (decenas de profesores). */
const DIRECTORY_FETCH_CAP = 500;

export interface DirectoryFilters {
  subjectKey?: SubjectKey;
  level?: TeacherLevel;
  /** 0 = domingo … 6 = sábado (hora de México). */
  weekday?: number;
  maxPriceCents?: number;
  page?: number;
}

/** Directorio: SOLO profesores ACTIVOS. Más alto primero: nivel, luego calificación, luego experiencia. */
export async function listDirectory(
  filters: DirectoryFilters
): Promise<{ items: PublicTeacherCard[]; total: number; page: number; pageSize: number }> {
  const rows = await prisma.teacher.findMany({
    where: {
      status: 'ACTIVE',
      ...(filters.level ? { level: filters.level } : {}),
      ...(filters.subjectKey ? { subjects: { some: { subjectKey: filters.subjectKey } } } : {}),
    },
    select: PUBLIC_TEACHER_SELECT,
    take: DIRECTORY_FETCH_CAP,
  });

  const filtered = rows
    .filter((row) => {
      if (filters.weekday !== undefined) {
        if (!parseStoredAvailability(row.availability).some((b) => b.weekday === filters.weekday)) return false;
      }
      if (filters.maxPriceCents !== undefined) {
        const from = toPublicCard(row).fromPriceCents;
        if (from === null || from > filters.maxPriceCents) return false;
      }
      return true;
    })
    .sort(
      (a, b) =>
        LEVEL_RANK[b.level] - LEVEL_RANK[a.level] ||
        b.averageRating - a.averageRating ||
        b.totalClassesGiven - a.totalClassesGiven
    );

  const page = Math.max(1, filters.page ?? 1);
  const start = (page - 1) * DIRECTORY_PAGE_SIZE;
  return {
    items: filtered.slice(start, start + DIRECTORY_PAGE_SIZE).map(toPublicCard),
    total: filtered.length,
    page,
    pageSize: DIRECTORY_PAGE_SIZE,
  };
}

/** Perfil público. Un profesor que no está ACTIVO no existe para el alumno (404, no «suspendido»). */
export async function getPublicTeacher(teacherId: string): Promise<PublicTeacherProfile | null> {
  const row = await prisma.teacher.findFirst({
    where: { id: teacherId, status: 'ACTIVE' },
    select: PUBLIC_TEACHER_SELECT,
  });
  return row ? toPublicProfile(row) : null;
}

// ─────────────────────────────── Solicitud de onboarding ───────────────────────────────

export interface AgreementVersions {
  contract: string;
  nda: string;
  recording: string;
}

function uniqueTarget(err: unknown): string | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const target = err.meta?.target;
    return Array.isArray(target) ? target.join(',') : String(target ?? '');
  }
  return null;
}

/**
 * Crea la solicitud (Teacher en PENDING_REVIEW) con sus materias y las tres
 * aceptaciones digitales selladas con marca de tiempo y versión.
 *
 * El nivel arranca en INICIAL y NO es un campo de la solicitud: los niveles son
 * SOLO por mérito automático (spec §4). El carril ya viene decidido por
 * `determinePaymentRail` dentro de la solicitud validada.
 */
export async function createTeacherApplication(input: {
  userProfileId: string;
  application: TeacherApplication;
  versions: AgreementVersions;
  now: Date;
}): Promise<{ teacherId: string }> {
  const { application: a, versions, now } = input;
  try {
    const created = await prisma.teacher.create({
      data: {
        userProfileId: input.userProfileId,
        fullName: a.fullName,
        publicName: a.publicName,
        bio: a.bio,
        rfc: a.rfc,
        curp: a.curp,
        clabe: a.clabe,
        bankName: a.bankName,
        phone: a.phone,
        paymentRail: a.paymentRail,
        csfDocumentUrl: a.csfDocumentPath,
        availability: a.availability as unknown as Prisma.InputJsonValue,
        status: 'PENDING_REVIEW',
        contractAcceptedAt: now,
        contractVersion: versions.contract,
        ndaAcceptedAt: now,
        recordingPolicyAcceptedAt: now,
        subjects: {
          create: a.subjects.map((subjectKey) => ({ subjectKey, baseRate: BASE_RATES[subjectKey] })),
        },
      },
      select: { id: true },
    });
    return { teacherId: created.id };
  } catch (err) {
    const target = uniqueTarget(err);
    if (target !== null) {
      // Mensajes distintos para no dejar a la persona atorada, pero sin confirmar
      // a quién pertenece una CURP ajena.
      if (target.includes('curp')) {
        throw new MarketplaceError(
          'CONFLICT',
          'Ya existe una solicitud registrada con esa CURP. Si crees que es un error, escríbenos a soporte.'
        );
      }
      throw new MarketplaceError('CONFLICT', 'Ya enviaste tu solicitud para dar clases en YaEntre.');
    }
    throw err;
  }
}

// ─────────────────────────────── Vista del propio profesor ───────────────────────────────

export interface OwnTeacherView {
  id: string;
  status: TeacherStatus;
  level: TeacherLevel;
  levelPromotedAt: Date | null;
  fullName: string;
  publicName: string;
  bio: string | null;
  phone: string;
  /** «****4567»: nunca completa, ni siquiera para su dueño. */
  curpMasked: string;
  clabeMasked: string;
  bankName: string;
  rfcMasked: string | null;
  paymentRail: 'ASIMILADOS' | 'COMISION_MERCANTIL';
  availability: AvailabilityBlock[];
  subjects: SubjectKey[];
  onboardedAt: Date | null;
  contractVersion: string | null;
  metrics: {
    totalClassesGiven: number;
    averageRating: number | null;
    ratingCount: number;
    cancellationRate: number;
    monthsActive: number;
  };
  progress: LevelProgress;
}

export async function getOwnTeacherView(userProfileId: string, now: Date = new Date()): Promise<OwnTeacherView | null> {
  const t = await prisma.teacher.findUnique({
    where: { userProfileId },
    include: { subjects: { select: { subjectKey: true } } },
  });
  if (!t) return null;

  const monthsActive = t.onboardedAt ? wholeMonthsBetween(t.onboardedAt, now) : 0;
  const metrics = {
    totalClassesGiven: t.totalClassesGiven,
    averageRating: t.ratingCount > 0 ? Math.round(t.averageRating * 100) / 100 : null,
    ratingCount: t.ratingCount,
    cancellationRate: t.cancellationRate,
    monthsActive,
  };

  return {
    id: t.id,
    status: t.status,
    level: t.level,
    levelPromotedAt: t.levelPromotedAt,
    fullName: t.fullName,
    publicName: t.publicName,
    bio: t.bio,
    phone: t.phone,
    curpMasked: maskClabe(t.curp),
    clabeMasked: maskClabe(t.clabe),
    bankName: t.bankName,
    rfcMasked: t.rfc ? maskClabe(t.rfc) : null,
    paymentRail: t.paymentRail,
    availability: parseStoredAvailability(t.availability),
    subjects: subjectKeysOf(t),
    onboardedAt: t.onboardedAt,
    contractVersion: t.contractVersion,
    metrics,
    progress: levelProgress({
      totalClassesGiven: t.totalClassesGiven,
      averageRating: t.averageRating,
      cancellationRate: t.cancellationRate,
      monthsActive,
      level: t.level,
    }),
  };
}

// ─────────────────────────────── Actualización de datos propios ───────────────────────────────

export interface TeacherProfilePatch {
  clabe?: string;
  bankName?: string;
  phone?: string;
  bio?: string | null;
  publicName?: string;
  availability?: AvailabilityBlock[];
  subjects?: SubjectKey[];
}

/** Estados en los que el profesor puede editar sus propios datos. */
export const EDITABLE_STATUSES: readonly TeacherStatus[] = ['PENDING_REVIEW', 'ACTIVE', 'INACTIVE'];

/**
 * Aplica un cambio a los datos del PROPIO profesor (`teacherId` sale del guard).
 * Devuelve si la CLABE cambió, para que el llamador avise al titular por correo.
 *
 * No permite quitar una materia con clases vivas pendientes: dejaría al alumno
 * con una clase de una materia que su profesor ya no ofrece.
 */
export async function updateOwnTeacher(
  teacherId: string,
  patch: TeacherProfilePatch,
  now: Date = new Date()
): Promise<{ clabeChanged: boolean }> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.teacher.findUnique({
      where: { id: teacherId },
      select: { status: true, clabe: true, subjects: { select: { subjectKey: true } } },
    });
    if (!current || !EDITABLE_STATUSES.includes(current.status)) {
      throw new MarketplaceError('INVALID_STATE', 'Tu perfil no se puede editar en este momento.');
    }

    if (patch.subjects) {
      const wanted = new Set<string>(patch.subjects);
      const removed = current.subjects.map((s) => s.subjectKey).filter((k) => !wanted.has(k));
      if (removed.length > 0) {
        const pending = await tx.classSession.count({
          where: {
            teacherId,
            subjectKey: { in: removed },
            status: { in: [...SLOT_HOLDING_STATUSES] },
            scheduledAt: { gt: now },
          },
        });
        if (pending > 0) {
          throw new MarketplaceError(
            'CONFLICT',
            'Tienes clases pendientes en una materia que quieres quitar. Espera a impartirlas o cancélalas primero.'
          );
        }
        await tx.teacherSubject.deleteMany({ where: { teacherId, subjectKey: { in: removed } } });
      }
      const have = new Set(current.subjects.map((s) => s.subjectKey));
      const added = patch.subjects.filter((k) => !have.has(k));
      if (added.length > 0) {
        await tx.teacherSubject.createMany({
          data: added.map((subjectKey) => ({ teacherId, subjectKey, baseRate: BASE_RATES[subjectKey] })),
        });
      }
    }

    const clabeChanged = patch.clabe !== undefined && patch.clabe !== current.clabe;

    await tx.teacher.update({
      where: { id: teacherId },
      data: {
        ...(patch.clabe !== undefined ? { clabe: patch.clabe } : {}),
        ...(clabeChanged ? { clabeUpdatedAt: now } : {}),
        ...(patch.bankName !== undefined ? { bankName: patch.bankName } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
        ...(patch.publicName !== undefined ? { publicName: patch.publicName } : {}),
        ...(patch.availability !== undefined
          ? { availability: patch.availability as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });

    return { clabeChanged };
  });
}

/**
 * Pausa o reanuda la visibilidad en el directorio. Solo entre ACTIVE e
 * INACTIVE: un profesor pendiente o suspendido NO puede reactivarse solo.
 */
export async function setOwnActive(teacherId: string, active: boolean): Promise<void> {
  const from: TeacherStatus = active ? 'INACTIVE' : 'ACTIVE';
  const to: TeacherStatus = active ? 'ACTIVE' : 'INACTIVE';
  const res = await prisma.teacher.updateMany({ where: { id: teacherId, status: from }, data: { status: to } });
  if (res.count === 0) {
    throw new MarketplaceError('INVALID_STATE', 'No se puede cambiar tu visibilidad en el estado actual.');
  }
}

// ─────────────────────────────── Administración ───────────────────────────────

export const ADMIN_TEACHERS_PAGE_SIZE = 25;

export interface TeacherAdminRow {
  id: string;
  fullName: string;
  publicName: string;
  status: TeacherStatus;
  level: TeacherLevel;
  paymentRail: 'ASIMILADOS' | 'COMISION_MERCANTIL';
  totalClassesGiven: number;
  createdAt: Date;
}

export async function listTeachersAdmin(input: {
  status?: TeacherStatus;
  page?: number;
}): Promise<{ rows: TeacherAdminRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, input.page ?? 1);
  const where = input.status ? { status: input.status } : {};
  const [rows, total] = await Promise.all([
    prisma.teacher.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * ADMIN_TEACHERS_PAGE_SIZE,
      take: ADMIN_TEACHERS_PAGE_SIZE,
      select: {
        id: true,
        fullName: true,
        publicName: true,
        status: true,
        level: true,
        paymentRail: true,
        totalClassesGiven: true,
        createdAt: true,
      },
    }),
    prisma.teacher.count({ where }),
  ]);
  return { rows, total, page, pageSize: ADMIN_TEACHERS_PAGE_SIZE };
}

/**
 * Detalle COMPLETO para la revisión de identidad (spec §3.1 paso 4): CURP,
 * CLABE, RFC y la ruta de la constancia. SOLO lo llama una acción de admin
 * maestro, que además deja fila en la bitácora de que se consultó.
 */
export async function getTeacherAdminDetail(teacherId: string) {
  return prisma.teacher.findUnique({
    where: { id: teacherId },
    include: { subjects: { select: { subjectKey: true } } },
  });
}

/** PENDING_REVIEW → ACTIVE. Condicionado al estado: solo un llamador concurrente gana. */
export async function approveTeacher(teacherId: string, now: Date): Promise<void> {
  const res = await prisma.teacher.updateMany({
    where: { id: teacherId, status: 'PENDING_REVIEW' },
    data: { status: 'ACTIVE', level: 'INICIAL', onboardedAt: now },
  });
  if (res.count === 0) {
    throw new MarketplaceError('INVALID_STATE', 'Esa solicitud ya no está pendiente de revisión.');
  }
}

/** PENDING_REVIEW/ACTIVE/INACTIVE → SUSPENDED. Sirve también para rechazar una solicitud. */
export async function suspendTeacher(teacherId: string, reason: string, now: Date): Promise<void> {
  const res = await prisma.teacher.updateMany({
    where: { id: teacherId, status: { in: ['PENDING_REVIEW', 'ACTIVE', 'INACTIVE'] } },
    data: { status: 'SUSPENDED', suspendedAt: now, suspendReason: reason },
  });
  if (res.count === 0) {
    throw new MarketplaceError('INVALID_STATE', 'Ese profesor ya está suspendido o no existe.');
  }
}

/** SUSPENDED → ACTIVE (una suspensión manual es reversible). */
export async function reactivateTeacher(teacherId: string): Promise<void> {
  const res = await prisma.teacher.updateMany({
    where: { id: teacherId, status: 'SUSPENDED' },
    data: { status: 'ACTIVE', suspendedAt: null, suspendReason: null },
  });
  if (res.count === 0) {
    throw new MarketplaceError('INVALID_STATE', 'Ese profesor no está suspendido.');
  }
}

/** Lo mínimo para avisar y medir tras una decisión del admin. Nunca sale de la capa de servidor. */
export async function getTeacherContact(teacherId: string) {
  return prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { id: true, userProfileId: true, publicName: true, paymentRail: true, csfDocumentUrl: true },
  });
}
