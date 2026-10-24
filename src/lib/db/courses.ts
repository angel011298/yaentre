import { randomInt } from 'node:crypto';
import { Prisma, type CourseCategory, type CourseLevel, type CourseStatus, type LessonType } from '@prisma/client';
import { prisma } from './prisma';
import { runIdempotent } from './billing';
import { calculateCourseRevenue } from '@/lib/courses/commission';
import { averageRating, isVideoCompleted, progressPercent, slugify } from '@/lib/courses/rules';
import { reportControlFailure } from '@/lib/observability/report';
import type { PaidCheckout } from '@/lib/stripe/marketplace-webhook';
import type { ApplyResult } from '@/lib/stripe/webhook';

/**
 * G103 — capa de datos del Course Marketplace (spec §2). El dueño SIEMPRE se
 * pasa desde el guard: cada función del profesor filtra por `teacherId` y
 * cada una del alumno por `userProfileId`, así que un id ajeno equivale a
 * «no existe».
 */

export class CourseError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'CourseError';
  }
}

const EDITABLE: CourseStatus[] = ['DRAFT', 'REJECTED'];
const ACCESS: Prisma.CourseEnrollmentWhereInput['status'] = { in: ['ACTIVE', 'COMPLETED'] };

const editorInclude = {
  modules: {
    orderBy: { sortOrder: 'asc' as const },
    include: { lessons: { orderBy: { sortOrder: 'asc' as const } } },
  },
} satisfies Prisma.CourseInclude;

export type CourseWithContent = Prisma.CourseGetPayload<{ include: typeof editorInclude }>;

// ─────────────────────────── Profesor ───────────────────────────

export function listTeacherCourses(teacherId: string) {
  return prisma.course.findMany({
    where: { teacherId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      priceCents: true,
      isFree: true,
      totalLessons: true,
      totalEnrollments: true,
      averageRating: true,
      totalRatings: true,
      reviewNote: true,
      updatedAt: true,
    },
  });
}

export function getTeacherCourse(teacherId: string, courseId: string): Promise<CourseWithContent | null> {
  return prisma.course.findFirst({ where: { id: courseId, teacherId }, include: editorInclude });
}

async function requireEditable(teacherId: string, courseId: string) {
  const c = await prisma.course.findFirst({ where: { id: courseId, teacherId }, select: { id: true, status: true } });
  if (!c) throw new CourseError('NOT_FOUND', 'No encontramos ese curso.');
  if (!EDITABLE.includes(c.status)) {
    throw new CourseError('NOT_EDITABLE', 'Este curso ya no se puede editar (está en revisión, publicado o archivado).');
  }
  return c;
}

export interface CourseDetailsInput {
  title: string;
  shortDescription: string;
  description: string;
  learningOutcomes: string[];
  category: CourseCategory;
  subjectArea: string;
  level: CourseLevel;
  tags: string[];
  isFree: boolean;
  priceCents: number;
  originalPriceCents: number | null;
}

export async function createCourse(teacherId: string, input: CourseDetailsInput) {
  const base = slugify(input.title);
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${randomInt(1000, 10_000)}`;
    try {
      return await prisma.course.create({ data: { ...input, teacherId, slug, status: 'DRAFT' }, select: { id: true, slug: true } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') continue;
      throw err;
    }
  }
  throw new CourseError('SLUG', 'Elige un título un poco distinto.');
}

export async function updateCourseDetails(teacherId: string, courseId: string, input: CourseDetailsInput) {
  await requireEditable(teacherId, courseId);
  await prisma.course.update({ where: { id: courseId }, data: input });
}

export async function setCourseMediaPath(
  teacherId: string,
  courseId: string,
  field: 'thumbnailPath' | 'previewVideoPath',
  path: string
): Promise<string | null> {
  await requireEditable(teacherId, courseId);
  const prev = await prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    select: { thumbnailPath: true, previewVideoPath: true },
  });
  await prisma.course.update({ where: { id: courseId }, data: { [field]: path } });
  return prev[field];
}

export async function addModule(teacherId: string, courseId: string, title: string, description: string | null) {
  await requireEditable(teacherId, courseId);
  const last = await prisma.courseModule.findFirst({ where: { courseId }, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
  return prisma.courseModule.create({ data: { courseId, title, description, sortOrder: (last?.sortOrder ?? 0) + 1 } });
}

async function moduleOfTeacher(teacherId: string, moduleId: string) {
  const m = await prisma.courseModule.findFirst({
    where: { id: moduleId, course: { teacherId } },
    select: { id: true, courseId: true, sortOrder: true },
  });
  if (!m) throw new CourseError('NOT_FOUND', 'No encontramos ese módulo.');
  await requireEditable(teacherId, m.courseId);
  return m;
}

export async function updateModule(teacherId: string, moduleId: string, title: string, description: string | null) {
  await moduleOfTeacher(teacherId, moduleId);
  await prisma.courseModule.update({ where: { id: moduleId }, data: { title, description } });
}

export async function deleteModule(teacherId: string, moduleId: string): Promise<string[]> {
  const m = await moduleOfTeacher(teacherId, moduleId);
  const lessons = await prisma.courseLesson.findMany({ where: { moduleId }, select: { videoPath: true, resourcePath: true } });
  await prisma.courseModule.delete({ where: { id: moduleId } });
  await recomputeCourseTotals(m.courseId);
  return lessons.flatMap((l) => [l.videoPath, l.resourcePath]).filter((p): p is string => Boolean(p));
}

/** Reordenar: intercambia con el vecino (arriba/abajo). Accesible por teclado, sin arrastrar. */
export async function moveModule(teacherId: string, moduleId: string, direction: 'up' | 'down') {
  const m = await moduleOfTeacher(teacherId, moduleId);
  const neighbor = await prisma.courseModule.findFirst({
    where: { courseId: m.courseId, sortOrder: direction === 'up' ? { lt: m.sortOrder } : { gt: m.sortOrder } },
    orderBy: { sortOrder: direction === 'up' ? 'desc' : 'asc' },
    select: { id: true, sortOrder: true },
  });
  if (!neighbor) return;
  await prisma.$transaction([
    prisma.courseModule.update({ where: { id: m.id }, data: { sortOrder: neighbor.sortOrder } }),
    prisma.courseModule.update({ where: { id: neighbor.id }, data: { sortOrder: m.sortOrder } }),
  ]);
}

export interface LessonInput {
  title: string;
  type: LessonType;
  content: string | null;
  isFreePreview: boolean;
}

export async function addLesson(teacherId: string, moduleId: string, input: LessonInput) {
  const m = await moduleOfTeacher(teacherId, moduleId);
  const last = await prisma.courseLesson.findFirst({ where: { moduleId }, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
  const lesson = await prisma.courseLesson.create({
    data: { moduleId, title: input.title, type: input.type, content: input.content, isFreePreview: input.isFreePreview, sortOrder: (last?.sortOrder ?? 0) + 1 },
  });
  await recomputeCourseTotals(m.courseId);
  return lesson;
}

export async function lessonOfTeacher(teacherId: string, lessonId: string) {
  const l = await prisma.courseLesson.findFirst({
    where: { id: lessonId, module: { course: { teacherId } } },
    select: { id: true, moduleId: true, sortOrder: true, type: true, videoPath: true, resourcePath: true, module: { select: { courseId: true } } },
  });
  if (!l) throw new CourseError('NOT_FOUND', 'No encontramos esa lección.');
  await requireEditable(teacherId, l.module.courseId);
  return l;
}

export async function updateLesson(teacherId: string, lessonId: string, input: Partial<LessonInput>) {
  const l = await lessonOfTeacher(teacherId, lessonId);
  await prisma.courseLesson.update({ where: { id: lessonId }, data: input });
  await recomputeCourseTotals(l.module.courseId);
}

export async function deleteLesson(teacherId: string, lessonId: string): Promise<string[]> {
  const l = await lessonOfTeacher(teacherId, lessonId);
  await prisma.courseLesson.delete({ where: { id: lessonId } });
  await recomputeCourseTotals(l.module.courseId);
  return [l.videoPath, l.resourcePath].filter((p): p is string => Boolean(p));
}

export async function moveLesson(teacherId: string, lessonId: string, direction: 'up' | 'down') {
  const l = await lessonOfTeacher(teacherId, lessonId);
  const neighbor = await prisma.courseLesson.findFirst({
    where: { moduleId: l.moduleId, sortOrder: direction === 'up' ? { lt: l.sortOrder } : { gt: l.sortOrder } },
    orderBy: { sortOrder: direction === 'up' ? 'desc' : 'asc' },
    select: { id: true, sortOrder: true },
  });
  if (!neighbor) return;
  await prisma.$transaction([
    prisma.courseLesson.update({ where: { id: l.id }, data: { sortOrder: neighbor.sortOrder } }),
    prisma.courseLesson.update({ where: { id: neighbor.id }, data: { sortOrder: l.sortOrder } }),
  ]);
}

export async function setLessonMedia(
  teacherId: string,
  lessonId: string,
  media: { kind: 'video'; path: string; sizeBytes: number; durationSeconds: number } | { kind: 'resource'; path: string; sizeBytes: number }
): Promise<string | null> {
  const l = await lessonOfTeacher(teacherId, lessonId);
  const data =
    media.kind === 'video'
      ? { videoPath: media.path, videoSizeBytes: media.sizeBytes, videoDurationSeconds: media.durationSeconds }
      : { resourcePath: media.path, resourceSizeBytes: media.sizeBytes };
  await prisma.courseLesson.update({ where: { id: lessonId }, data });
  await recomputeCourseTotals(l.module.courseId);
  return media.kind === 'video' ? l.videoPath : l.resourcePath;
}

/** Bytes ya usados por el curso (videos + recursos), para la cuota de 5 GB. */
export async function courseBytesUsed(courseId: string): Promise<number> {
  const agg = await prisma.courseLesson.aggregate({
    where: { module: { courseId } },
    _sum: { videoSizeBytes: true, resourceSizeBytes: true },
  });
  return (agg._sum.videoSizeBytes ?? 0) + (agg._sum.resourceSizeBytes ?? 0);
}

export async function recomputeCourseTotals(courseId: string): Promise<void> {
  const lessons = await prisma.courseLesson.findMany({
    where: { module: { courseId } },
    select: { videoDurationSeconds: true },
  });
  const seconds = lessons.reduce((s, l) => s + (l.videoDurationSeconds ?? 0), 0);
  await prisma.course.update({
    where: { id: courseId },
    data: { totalLessons: lessons.length, totalDurationMinutes: Math.round(seconds / 60) },
  });
}

export async function submitCourseForReview(teacherId: string, courseId: string, now: Date) {
  await requireEditable(teacherId, courseId);
  await prisma.course.update({ where: { id: courseId }, data: { status: 'IN_REVIEW', submittedAt: now, reviewNote: null } });
}

// ─────────────────────────── Catálogo público ───────────────────────────

export type CatalogSort = 'popular' | 'rating' | 'price_asc' | 'price_desc' | 'new';

export async function listPublishedCourses(opts: {
  category?: CourseCategory;
  level?: CourseLevel;
  q?: string;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
}) {
  const pageSize = Math.min(opts.pageSize ?? 12, 48);
  const page = Math.max(1, opts.page ?? 1);
  const q = opts.q?.trim().slice(0, 80);
  const where: Prisma.CourseWhereInput = {
    status: 'PUBLISHED',
    ...(opts.category ? { category: opts.category } : {}),
    ...(opts.level ? { level: opts.level } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { shortDescription: { contains: q, mode: 'insensitive' } },
            { tags: { has: q.toLowerCase() } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.CourseOrderByWithRelationInput[] =
    opts.sort === 'rating'
      ? [{ averageRating: 'desc' }, { totalRatings: 'desc' }]
      : opts.sort === 'price_asc'
        ? [{ priceCents: 'asc' }]
        : opts.sort === 'price_desc'
          ? [{ priceCents: 'desc' }]
          : opts.sort === 'new'
            ? [{ publishedAt: 'desc' }]
            : [{ totalEnrollments: 'desc' }, { averageRating: 'desc' }];
  const [total, rows] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        title: true,
        shortDescription: true,
        category: true,
        level: true,
        priceCents: true,
        originalPriceCents: true,
        isFree: true,
        thumbnailPath: true,
        totalLessons: true,
        totalDurationMinutes: true,
        averageRating: true,
        totalRatings: true,
        teacher: { select: { displayName: true, level: true } },
      },
    }),
  ]);
  return { total, page, pageSize, rows };
}

/**
 * Detalle público: títulos, tipos y duraciones de TODAS las lecciones, pero
 * rutas de archivo SOLO de las lecciones de muestra gratuita.
 */
export async function getPublishedCourseBySlug(slug: string) {
  const c = await prisma.course.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      teacher: { select: { id: true, displayName: true, level: true, averageRating: true, totalRatings: true } },
      modules: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          title: true,
          lessons: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, title: true, type: true, videoDurationSeconds: true, isFreePreview: true, videoPath: true },
          },
        },
      },
    },
  });
  if (!c) return null;
  return {
    ...c,
    modules: c.modules.map((m) => ({
      ...m,
      lessons: m.lessons.map((l) => ({ ...l, videoPath: l.isFreePreview ? l.videoPath : null })),
    })),
  };
}

export function listCourseReviews(courseId: string) {
  return prisma.courseEnrollment.findMany({
    where: { courseId, rating: { not: null }, reviewHidden: false, status: { not: 'REFUNDED' } },
    orderBy: { ratedAt: 'desc' },
    take: 20,
    select: { id: true, rating: true, review: true, ratedAt: true },
  });
}

// ─────────────────────────── Alumno ───────────────────────────

export function getEnrollment(userProfileId: string, courseId: string) {
  return prisma.courseEnrollment.findUnique({ where: { courseId_userProfileId: { courseId, userProfileId } } });
}

export async function enrollFree(userProfileId: string, courseId: string, totalLessons: number, now: Date) {
  try {
    return await prisma.$transaction(async (tx) => {
      const e = await tx.courseEnrollment.create({
        data: { courseId, userProfileId, pricePaidCents: 0, totalLessons, paidAt: now, status: 'ACTIVE' },
      });
      await tx.course.update({ where: { id: courseId }, data: { totalEnrollments: { increment: 1 } } });
      return e;
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return getEnrollment(userProfileId, courseId);
    }
    throw err;
  }
}

export function listMyCourses(userProfileId: string) {
  return prisma.courseEnrollment.findMany({
    where: { userProfileId, status: ACCESS },
    orderBy: [{ lastAccessedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    include: {
      course: { select: { slug: true, title: true, thumbnailPath: true, totalLessons: true, teacher: { select: { displayName: true } } } },
    },
  });
}

/** Curso completo para el reproductor: SOLO con inscripción vigente (o dueño / admin). */
export async function getCourseForLearner(slug: string, userProfileId: string, opts: { isAdmin: boolean }) {
  const course = await prisma.course.findUnique({
    where: { slug },
    include: { ...editorInclude, teacher: { select: { userProfileId: true, displayName: true } } },
  });
  if (!course) return null;
  const isOwner = course.teacher.userProfileId === userProfileId;
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { courseId_userProfileId: { courseId: course.id, userProfileId } },
    include: { lessonProgress: true },
  });
  const enrolled = Boolean(enrollment && (enrollment.status === 'ACTIVE' || enrollment.status === 'COMPLETED'));
  if (!enrolled && !isOwner && !opts.isAdmin) return null;
  // Un curso en borrador o revisión solo lo abren su dueño y el admin.
  if (!enrolled && !['PUBLISHED', 'ARCHIVED'].includes(course.status) && !isOwner && !opts.isAdmin) return null;
  return { course, enrollment: enrolled ? enrollment : null, isOwner };
}

/** ¿Puede este alumno leer el archivo de esta lección? (antes de firmar la URL). */
export async function lessonMediaAccess(lessonId: string, userProfileId: string, isAdmin: boolean) {
  const l = await prisma.courseLesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      videoPath: true,
      resourcePath: true,
      videoDurationSeconds: true,
      isFreePreview: true,
      module: { select: { course: { select: { id: true, status: true, teacher: { select: { userProfileId: true } } } } } },
    },
  });
  if (!l) return null;
  const course = l.module.course;
  if (isAdmin || course.teacher.userProfileId === userProfileId) return l;
  if (l.isFreePreview && course.status === 'PUBLISHED') return l;
  const e = await prisma.courseEnrollment.findUnique({
    where: { courseId_userProfileId: { courseId: course.id, userProfileId } },
    select: { status: true },
  });
  return e && (e.status === 'ACTIVE' || e.status === 'COMPLETED') ? l : null;
}

export async function saveLessonProgress(input: {
  userProfileId: string;
  lessonId: string;
  positionSeconds: number;
  markCompleted: boolean;
  now: Date;
}) {
  const lesson = await prisma.courseLesson.findUnique({
    where: { id: input.lessonId },
    select: { id: true, type: true, videoDurationSeconds: true, module: { select: { courseId: true } } },
  });
  if (!lesson) throw new CourseError('NOT_FOUND', 'Lección no encontrada.');
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { courseId_userProfileId: { courseId: lesson.module.courseId, userProfileId: input.userProfileId } },
    select: { id: true, status: true, totalLessons: true },
  });
  if (!enrollment || (enrollment.status !== 'ACTIVE' && enrollment.status !== 'COMPLETED')) {
    throw new CourseError('NOT_ENROLLED', 'No estás inscrito en este curso.');
  }
  const position = Math.max(0, Math.min(input.positionSeconds, lesson.videoDurationSeconds ?? input.positionSeconds));
  const completed = input.markCompleted || (lesson.type === 'VIDEO' && isVideoCompleted(position, lesson.videoDurationSeconds));

  return prisma.$transaction(async (tx) => {
    const existing = await tx.courseLessonProgress.findUnique({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: lesson.id } },
    });
    const nowCompleted = completed || Boolean(existing?.completed);
    await tx.courseLessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: lesson.id } },
      create: { enrollmentId: enrollment.id, lessonId: lesson.id, videoProgressSeconds: position, completed: nowCompleted, completedAt: nowCompleted ? input.now : null },
      update: {
        videoProgressSeconds: position,
        ...(nowCompleted && !existing?.completed ? { completed: true, completedAt: input.now } : {}),
      },
    });
    const totalLessons = await tx.courseLesson.count({ where: { module: { courseId: lesson.module.courseId } } });
    const done = await tx.courseLessonProgress.count({ where: { enrollmentId: enrollment.id, completed: true } });
    const pct = progressPercent(done, Math.max(totalLessons, 1));
    await tx.courseEnrollment.update({
      where: { id: enrollment.id },
      data: {
        completedLessons: done,
        progressPercent: pct,
        lastAccessedAt: input.now,
        lastLessonId: lesson.id,
        ...(done >= totalLessons && totalLessons > 0 ? { status: 'COMPLETED', completedAt: input.now } : {}),
      },
    });
    return { completed: nowCompleted, progressPercent: pct };
  });
}

export async function rateCourse(input: { userProfileId: string; courseId: string; rating: number; review: string | null; now: Date }) {
  const enrollment = await getEnrollment(input.userProfileId, input.courseId);
  if (!enrollment || (enrollment.status !== 'ACTIVE' && enrollment.status !== 'COMPLETED')) {
    throw new CourseError('NOT_ENROLLED', 'Solo los alumnos inscritos pueden calificar el curso.');
  }
  await prisma.$transaction(async (tx) => {
    await tx.courseEnrollment.update({
      where: { id: enrollment.id },
      data: { rating: input.rating, review: input.review, ratedAt: input.now },
    });
    const ratings = await tx.courseEnrollment.findMany({
      where: { courseId: input.courseId, rating: { not: null }, status: { not: 'REFUNDED' } },
      select: { rating: true },
    });
    await tx.course.update({
      where: { id: input.courseId },
      data: { averageRating: averageRating(ratings.map((r) => r.rating!)), totalRatings: ratings.length },
    });
  });
}

// ─────────────────────────── Webhook ───────────────────────────

export type EnrollOutcome = 'enrolled' | 'already' | 'mismatch' | 'duplicate_purchase';

/** Inscripción por compra, SOLO desde el webhook. Precio honrado = el cobrado. */
export function enrollCoursePurchase(
  eventId: string,
  eventType: string,
  paid: PaidCheckout
): Promise<{ result: ApplyResult; outcome: EnrollOutcome | null }> {
  const holder: { outcome: EnrollOutcome | null } = { outcome: null };
  return runIdempotent(eventId, eventType, async (tx) => {
    const md = paid.metadata;
    const expected = Number(md.expectedAmountCents);
    const course = await tx.course.findUnique({
      where: { id: md.courseId ?? '' },
      select: { id: true, totalLessons: true, isFree: true },
    });
    if (!course || !Number.isInteger(expected) || paid.amountMxn !== expected || paid.currency !== 'mxn' || !md.userProfileId) {
      holder.outcome = 'mismatch';
      reportControlFailure('payment_consistency', 'fail-closed', new Error('Compra de curso que no corresponde'), {
        checkoutSessionId: paid.checkoutSessionId,
        courseId: md.courseId,
      });
      return;
    }
    const existing = await tx.courseEnrollment.findUnique({
      where: { courseId_userProfileId: { courseId: course.id, userProfileId: md.userProfileId } },
    });
    if (existing?.stripeCheckoutSessionId === paid.checkoutSessionId) {
      holder.outcome = 'already';
      return;
    }
    if (existing && existing.status !== 'REFUNDED') {
      holder.outcome = 'duplicate_purchase';
      return;
    }
    const split = calculateCourseRevenue(expected);
    const data = {
      pricePaidCents: expected,
      teacherPayCents: split.teacherCents,
      commissionCents: split.yaentreCents,
      stripePaymentId: paid.paymentIntentId,
      stripeCheckoutSessionId: paid.checkoutSessionId,
      stripeCustomerId: paid.stripeCustomerId,
      paidAt: paid.eventCreatedAt,
      consentAt: md.consentAt ? new Date(md.consentAt) : null,
      consentVersion: md.consentVersion ?? null,
      totalLessons: course.totalLessons,
      status: 'ACTIVE' as const,
      refundedAt: null,
      payoutId: null,
      refundAdjustedPayoutId: null,
    };
    if (existing) {
      await tx.courseEnrollment.update({ where: { id: existing.id }, data });
    } else {
      await tx.courseEnrollment.create({ data: { ...data, courseId: course.id, userProfileId: md.userProfileId } });
    }
    await tx.course.update({
      where: { id: course.id },
      data: { totalEnrollments: { increment: 1 }, totalRevenueCents: { increment: expected } },
    });
    holder.outcome = 'enrolled';
  }).then((result) => ({ result, outcome: holder.outcome }));
}

/** Reembolso visto en Stripe → la inscripción pasa a REFUNDED y pierde el acceso. */
export async function recordCourseRefundTx(tx: Prisma.TransactionClient, paymentIntentId: string, now: Date): Promise<boolean> {
  const e = await tx.courseEnrollment.findUnique({ where: { stripePaymentId: paymentIntentId } });
  if (!e) return false;
  if (e.status === 'REFUNDED') return true;
  await tx.courseEnrollment.update({ where: { id: e.id }, data: { status: 'REFUNDED', refundedAt: now } });
  await tx.course.update({
    where: { id: e.courseId },
    data: { totalEnrollments: { decrement: 1 }, totalRevenueCents: { decrement: e.pricePaidCents } },
  });
  return true;
}

// ─────────────────────────── Administración ───────────────────────────

export function listCoursesForAdmin(status?: CourseStatus) {
  return prisma.course.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ status: 'asc' }, { submittedAt: 'asc' }, { updatedAt: 'desc' }],
    take: 200,
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      priceCents: true,
      isFree: true,
      totalLessons: true,
      totalDurationMinutes: true,
      totalEnrollments: true,
      submittedAt: true,
      reviewNote: true,
      teacher: { select: { displayName: true } },
    },
  });
}

export function getCourseForAdmin(courseId: string) {
  return prisma.course.findUnique({
    where: { id: courseId },
    include: { ...editorInclude, teacher: { select: { displayName: true, status: true } } },
  });
}

/** Transiciones de revisión. Archivar conserva el acceso de los inscritos. */
export async function setCourseStatusByAdmin(
  courseId: string,
  to: 'PUBLISHED' | 'REJECTED' | 'ARCHIVED',
  note: string | null,
  now: Date
): Promise<boolean> {
  const allowedFrom: Record<typeof to, CourseStatus[]> = {
    PUBLISHED: ['IN_REVIEW'],
    REJECTED: ['IN_REVIEW'],
    ARCHIVED: ['PUBLISHED'],
  };
  const r = await prisma.course.updateMany({
    where: { id: courseId, status: { in: allowedFrom[to] } },
    data: {
      status: to,
      reviewNote: note,
      ...(to === 'PUBLISHED' ? { publishedAt: now } : {}),
      ...(to === 'REJECTED' ? { rejectedAt: now } : {}),
      ...(to === 'ARCHIVED' ? { archivedAt: now } : {}),
    },
  });
  return r.count === 1;
}

export async function setReviewHidden(enrollmentId: string, hidden: boolean): Promise<boolean> {
  const r = await prisma.courseEnrollment.updateMany({ where: { id: enrollmentId }, data: { reviewHidden: hidden } });
  return r.count === 1;
}
