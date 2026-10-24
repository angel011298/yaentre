'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { AuthError } from '@/lib/auth/errors';
import {
  addLesson,
  addModule,
  courseBytesUsed,
  CourseError,
  createCourse,
  deleteLesson,
  deleteModule,
  getTeacherCourse,
  lessonOfTeacher,
  moveLesson,
  moveModule,
  setCourseMediaPath,
  setLessonMedia,
  submitCourseForReview,
  updateCourseDetails,
  updateLesson,
  updateModule,
} from '@/lib/db/courses';
import { prisma } from '@/lib/db/prisma';
import { validateCoursePrice, validateOriginalPrice } from '@/lib/courses/commission';
import {
  buildObjectPath,
  isOwnObjectPath,
  maxBytesFor,
  sniffMatchesKind,
  sniffMediaType,
  validateUploadRequest,
  type MediaKind,
} from '@/lib/courses/media';
import { COURSE_TEACHER_TERMS_VERSION, validateCourseForSubmission } from '@/lib/courses/rules';
import {
  courseDetailsSchema,
  courseUpdateSchema,
  idSchema,
  lessonSchema,
  lessonUpdateSchema,
  moduleSchema,
  moduleUpdateSchema,
  moveSchema,
  uploadConfirmSchema,
  uploadRequestSchema,
} from '@/lib/courses/schemas';
import { createUploadUrl, inspectObject, removeObjects } from '@/lib/courses/storage';
import { evaluateLegalGate, LEGAL_PENDING_MESSAGE } from '@/lib/marketplace/legal-gate';
import { readMarketplaceFlags } from '@/lib/marketplace/flags';
import { reportControlFailure } from '@/lib/observability/report';
import { consumeRateLimit, type RateLimitName } from '@/lib/rate-limit/store';
import type { ActionResult } from '@/lib/sessions/schemas';
import { requireTeacher } from '@/lib/teachers/guard';

/**
 * G103 — acciones del profesor sobre SUS cursos (spec §2.6). Solo profesores
 * ACTIVOS crean cursos. Cada acción, en este orden: bandera → guard del
 * profesor (el dueño sale de la sesión) → límite de tasa → validación estricta
 * → la capa de datos filtra por `teacherId` (un id ajeno = «no existe») y solo
 * deja editar en borrador o rechazado.
 */

function fail(code: string, message: string): ActionResult<never> {
  return { ok: false, code, message };
}

async function begin(limit: RateLimitName = 'TEACHER_WRITE') {
  if (!readMarketplaceFlags().courses) return { ok: false as const, result: fail('NOT_FOUND', 'Esta sección no está disponible.') };
  try {
    const ctx = await requireTeacher({ active: true });
    const v = await consumeRateLimit(limit, ctx.profile.id);
    if (!v.allowed) return { ok: false as const, result: fail('RATE_LIMIT', 'Demasiados cambios seguidos. Espera un momento.') };
    return { ok: true as const, teacher: ctx.teacher };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false as const, result: fail(err.code, err.message) };
    throw err;
  }
}

function asResult(err: unknown): ActionResult<never> {
  if (err instanceof CourseError) return fail(err.code, err.message);
  console.error('[courses] Error inesperado', err instanceof Error ? err.message : err);
  return fail('UNKNOWN', 'Algo salió mal. Intenta de nuevo.');
}

function priceFields(d: z.infer<typeof courseDetailsSchema>): { ok: true; priceCents: number; originalPriceCents: number | null } | { ok: false; error: string } {
  const priceCents = d.isFree ? 0 : d.pricePesos * 100;
  const originalPriceCents = d.isFree || d.originalPricePesos === null ? null : d.originalPricePesos * 100;
  const p = validateCoursePrice(priceCents, d.isFree);
  if (!p.valid) return { ok: false, error: p.error! };
  const o = validateOriginalPrice(priceCents, originalPriceCents);
  if (!o.valid) return { ok: false, error: o.error! };
  return { ok: true, priceCents, originalPriceCents };
}

function revalidate(courseId?: string) {
  revalidatePath('/profesor/cursos');
  if (courseId) revalidatePath(`/profesor/cursos/${courseId}`);
}

export async function createCourseAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const b = await begin();
  if (!b.ok) return b.result;
  const parsed = courseDetailsSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', parsed.error.issues[0]?.message ?? 'Revisa los datos.');
  const d = parsed.data;

  // Condiciones de contenido: se aceptan al crear el PRIMER curso.
  if (!b.teacher.courseTermsAcceptedAt) {
    if (!d.acceptCourseTerms) return fail('TERMS', 'Acepta las condiciones de contenido para crear tu primer curso.');
    const legal = evaluateLegalGate([COURSE_TEACHER_TERMS_VERSION], process.env.VERCEL_ENV);
    if (!legal.ok) {
      reportControlFailure('legal_text_pending', 'fail-closed', new Error('Curso con condiciones TODO-CLO'), { pending: legal.pending });
      return fail('LEGAL_PENDING', LEGAL_PENDING_MESSAGE);
    }
    await prisma.teacher.update({
      where: { id: b.teacher.id },
      data: { courseTermsAcceptedAt: new Date(), courseTermsVersion: COURSE_TEACHER_TERMS_VERSION },
    });
  }

  const price = priceFields(d);
  if (!price.ok) return fail('VALIDATION', price.error);
  try {
    const c = await createCourse(b.teacher.id, {
      title: d.title,
      shortDescription: d.shortDescription,
      description: d.description,
      learningOutcomes: d.learningOutcomes,
      category: d.category,
      subjectArea: d.subjectArea,
      level: d.level,
      tags: d.tags,
      isFree: d.isFree,
      priceCents: price.priceCents,
      originalPriceCents: price.originalPriceCents,
    });
    revalidate();
    return { ok: true, data: { id: c.id } };
  } catch (err) {
    return asResult(err);
  }
}

export async function updateCourseDetailsAction(raw: unknown): Promise<ActionResult<{ saved: true }>> {
  const b = await begin();
  if (!b.ok) return b.result;
  const parsed = courseUpdateSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', parsed.error.issues[0]?.message ?? 'Revisa los datos.');
  const d = parsed.data;
  const price = priceFields(d);
  if (!price.ok) return fail('VALIDATION', price.error);
  try {
    await updateCourseDetails(b.teacher.id, d.courseId, {
      title: d.title,
      shortDescription: d.shortDescription,
      description: d.description,
      learningOutcomes: d.learningOutcomes,
      category: d.category,
      subjectArea: d.subjectArea,
      level: d.level,
      tags: d.tags,
      isFree: d.isFree,
      priceCents: price.priceCents,
      originalPriceCents: price.originalPriceCents,
    });
    revalidate(d.courseId);
    return { ok: true, data: { saved: true } };
  } catch (err) {
    return asResult(err);
  }
}

export async function addModuleAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const b = await begin();
  if (!b.ok) return b.result;
  const parsed = moduleSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', parsed.error.issues[0]?.message ?? 'Revisa los datos.');
  try {
    const m = await addModule(b.teacher.id, parsed.data.courseId, parsed.data.title, parsed.data.description);
    revalidate(parsed.data.courseId);
    return { ok: true, data: { id: m.id } };
  } catch (err) {
    return asResult(err);
  }
}

export async function updateModuleAction(raw: unknown): Promise<ActionResult<{ saved: true }>> {
  const b = await begin();
  if (!b.ok) return b.result;
  const parsed = moduleUpdateSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', parsed.error.issues[0]?.message ?? 'Revisa los datos.');
  try {
    await updateModule(b.teacher.id, parsed.data.moduleId, parsed.data.title, parsed.data.description);
    revalidate();
    return { ok: true, data: { saved: true } };
  } catch (err) {
    return asResult(err);
  }
}

export async function deleteModuleAction(raw: unknown): Promise<ActionResult<{ deleted: true }>> {
  const b = await begin();
  if (!b.ok) return b.result;
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', 'Módulo inválido.');
  try {
    const orphanPaths = await deleteModule(b.teacher.id, parsed.data.id);
    await removeObjects(orphanPaths);
    revalidate();
    return { ok: true, data: { deleted: true } };
  } catch (err) {
    return asResult(err);
  }
}

export async function moveModuleAction(raw: unknown): Promise<ActionResult<{ moved: true }>> {
  const b = await begin();
  if (!b.ok) return b.result;
  const parsed = moveSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', 'Módulo inválido.');
  try {
    await moveModule(b.teacher.id, parsed.data.id, parsed.data.direction);
    revalidate();
    return { ok: true, data: { moved: true } };
  } catch (err) {
    return asResult(err);
  }
}

export async function addLessonAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const b = await begin();
  if (!b.ok) return b.result;
  const parsed = lessonSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', parsed.error.issues[0]?.message ?? 'Revisa los datos.');
  try {
    const l = await addLesson(b.teacher.id, parsed.data.moduleId, {
      title: parsed.data.title,
      type: parsed.data.type,
      content: parsed.data.type === 'TEXT' ? parsed.data.content : null,
      isFreePreview: parsed.data.isFreePreview,
    });
    revalidate();
    return { ok: true, data: { id: l.id } };
  } catch (err) {
    return asResult(err);
  }
}

export async function updateLessonAction(raw: unknown): Promise<ActionResult<{ saved: true }>> {
  const b = await begin();
  if (!b.ok) return b.result;
  const parsed = lessonUpdateSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', parsed.error.issues[0]?.message ?? 'Revisa los datos.');
  const { lessonId, ...rest } = parsed.data;
  try {
    await updateLesson(b.teacher.id, lessonId, rest);
    revalidate();
    return { ok: true, data: { saved: true } };
  } catch (err) {
    return asResult(err);
  }
}

export async function deleteLessonAction(raw: unknown): Promise<ActionResult<{ deleted: true }>> {
  const b = await begin();
  if (!b.ok) return b.result;
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', 'Lección inválida.');
  try {
    await removeObjects(await deleteLesson(b.teacher.id, parsed.data.id));
    revalidate();
    return { ok: true, data: { deleted: true } };
  } catch (err) {
    return asResult(err);
  }
}

export async function moveLessonAction(raw: unknown): Promise<ActionResult<{ moved: true }>> {
  const b = await begin();
  if (!b.ok) return b.result;
  const parsed = moveSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', 'Lección inválida.');
  try {
    await moveLesson(b.teacher.id, parsed.data.id, parsed.data.direction);
    revalidate();
    return { ok: true, data: { moved: true } };
  } catch (err) {
    return asResult(err);
  }
}

/** ¿El `lessonId` (si aplica) es de ESE curso y del tipo correcto para el archivo? */
async function checkLessonTarget(teacherId: string, courseId: string, kind: MediaKind, lessonId: string | null) {
  if (kind === 'thumbnail' || kind === 'preview') return lessonId === null;
  if (!lessonId) return false;
  const l = await lessonOfTeacher(teacherId, lessonId);
  if (l.module.courseId !== courseId) return false;
  return kind === 'video' ? l.type === 'VIDEO' : l.type === 'RESOURCE';
}

/** Paso 1 de la subida: valida y emite la URL firmada (el archivo va directo a Storage). */
export async function requestCourseUploadAction(raw: unknown): Promise<ActionResult<{ path: string; signedUrl: string }>> {
  const b = await begin('TEACHER_UPLOAD');
  if (!b.ok) return b.result;
  const parsed = uploadRequestSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', 'Archivo inválido.');
  const d = parsed.data;
  try {
    const course = await getTeacherCourse(b.teacher.id, d.courseId);
    if (!course) return fail('NOT_FOUND', 'No encontramos ese curso.');
    if (!['DRAFT', 'REJECTED'].includes(course.status)) return fail('NOT_EDITABLE', 'Este curso ya no se puede editar.');
    if (!(await checkLessonTarget(b.teacher.id, d.courseId, d.kind, d.lessonId))) return fail('VALIDATION', 'Ese archivo no corresponde a esa lección.');
    const check = validateUploadRequest({ kind: d.kind, mimeType: d.mimeType, sizeBytes: d.sizeBytes, courseBytesUsed: await courseBytesUsed(d.courseId) });
    if (!check.ok) return fail('VALIDATION', check.error);
    const path = buildObjectPath(d.courseId, d.kind, randomUUID(), check.ext);
    const upload = await createUploadUrl(path);
    if (!upload) return fail('STORAGE', 'No pudimos preparar la subida. Intenta de nuevo.');
    return { ok: true, data: { path, signedUrl: upload.signedUrl } };
  } catch (err) {
    return asResult(err);
  }
}

/**
 * Paso 2: el navegador avisa que terminó. Se comprueba que la ruta sea una
 * que generó el servidor para ESE curso, que el archivo exista, su TAMAÑO
 * real y su FIRMA real. Si algo no cuadra, el archivo se borra.
 */
export async function confirmCourseUploadAction(raw: unknown): Promise<ActionResult<{ saved: true }>> {
  const b = await begin('TEACHER_UPLOAD');
  if (!b.ok) return b.result;
  const parsed = uploadConfirmSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', 'Archivo inválido.');
  const d = parsed.data;
  if (!isOwnObjectPath(d.path, d.courseId, d.kind)) return fail('VALIDATION', 'Archivo inválido.');
  try {
    const course = await getTeacherCourse(b.teacher.id, d.courseId);
    if (!course) return fail('NOT_FOUND', 'No encontramos ese curso.');
    if (!(await checkLessonTarget(b.teacher.id, d.courseId, d.kind, d.lessonId))) return fail('VALIDATION', 'Ese archivo no corresponde a esa lección.');

    const obj = await inspectObject(d.path);
    if (!obj) return fail('NOT_UPLOADED', 'No encontramos el archivo subido. Vuelve a intentarlo.');
    if (!sniffMatchesKind(sniffMediaType(obj.head), d.kind) || obj.sizeBytes <= 0 || obj.sizeBytes > maxBytesFor(d.kind)) {
      await removeObjects([d.path]);
      return fail('VALIDATION', 'El archivo no es del tipo o tamaño permitido.');
    }

    let previous: string | null = null;
    if (d.kind === 'thumbnail') previous = await setCourseMediaPath(b.teacher.id, d.courseId, 'thumbnailPath', d.path);
    else if (d.kind === 'preview') previous = await setCourseMediaPath(b.teacher.id, d.courseId, 'previewVideoPath', d.path);
    else if (d.kind === 'video') {
      if (!d.durationSeconds) {
        await removeObjects([d.path]);
        return fail('VALIDATION', 'No pudimos leer la duración del video.');
      }
      previous = await setLessonMedia(b.teacher.id, d.lessonId!, {
        kind: 'video',
        path: d.path,
        sizeBytes: obj.sizeBytes,
        durationSeconds: Math.round(d.durationSeconds),
      });
    } else {
      previous = await setLessonMedia(b.teacher.id, d.lessonId!, { kind: 'resource', path: d.path, sizeBytes: obj.sizeBytes });
    }
    if (previous && previous !== d.path) await removeObjects([previous]);
    revalidate(d.courseId);
    return { ok: true, data: { saved: true } };
  } catch (err) {
    return asResult(err);
  }
}

export async function submitCourseAction(raw: unknown): Promise<ActionResult<{ submitted: true }>> {
  const b = await begin();
  if (!b.ok) return b.result;
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) return fail('VALIDATION', 'Curso inválido.');
  try {
    const course = await getTeacherCourse(b.teacher.id, parsed.data.id);
    if (!course) return fail('NOT_FOUND', 'No encontramos ese curso.');
    const errors = validateCourseForSubmission(course);
    if (errors.length > 0) return fail('INCOMPLETE', errors.join(' '));
    await submitCourseForReview(b.teacher.id, course.id, new Date());
    revalidate(course.id);
    return { ok: true, data: { submitted: true } };
  } catch (err) {
    return asResult(err);
  }
}
