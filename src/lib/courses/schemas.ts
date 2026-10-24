import { z } from 'zod';

/**
 * G103 — validación en el borde de las acciones de cursos. Estrictos: un campo
 * de más (un `status`, un `teacherId`, un monto o un id de usuario) se rechaza.
 * Los montos llegan en PESOS enteros desde la interfaz y se convierten a
 * centavos en el servidor.
 */

const cuid = z.string().regex(/^c[a-z0-9]{20,40}$/, 'Identificador inválido.');
const text = (min: number, max: number, msg: string) => z.string().trim().min(min, msg).max(max, `Máximo ${max} caracteres.`);

export const courseDetailsSchema = z
  .object({
    title: text(5, 90, 'El título necesita al menos 5 caracteres.'),
    shortDescription: text(10, 160, 'Escribe una descripción corta (10 a 160 caracteres).'),
    description: text(40, 6000, 'La descripción necesita al menos 40 caracteres.'),
    learningOutcomes: z.array(z.string().trim().min(3).max(120)).max(10).default([]),
    category: z.enum(['REGULARIZACION', 'IDIOMAS', 'HABILIDADES', 'TECNOLOGIA', 'OTRO']),
    subjectArea: z.string().trim().min(2).max(40).regex(/^[a-z0-9_]+$/, 'Usa minúsculas sin espacios.'),
    level: z.enum(['BASICO', 'INTERMEDIO', 'AVANZADO']),
    tags: z.array(z.string().trim().toLowerCase().min(2).max(30)).max(10).default([]),
    isFree: z.boolean(),
    pricePesos: z.number().int().min(0).max(9_999),
    originalPricePesos: z.number().int().min(0).max(9_999).nullable().default(null),
    acceptCourseTerms: z.literal(true, 'Acepta las condiciones de contenido para continuar.').optional(),
  })
  .strict();

export const courseUpdateSchema = courseDetailsSchema.extend({ courseId: cuid }).strict();

export const moduleSchema = z
  .object({
    courseId: cuid,
    title: text(2, 120, 'Escribe el título del módulo.'),
    description: z.string().trim().max(500).nullable().default(null),
  })
  .strict();

export const moduleUpdateSchema = z
  .object({ moduleId: cuid, title: text(2, 120, 'Escribe el título del módulo.'), description: z.string().trim().max(500).nullable().default(null) })
  .strict();

export const moveSchema = z.object({ id: cuid, direction: z.enum(['up', 'down']) }).strict();
export const idSchema = z.object({ id: cuid }).strict();

export const lessonSchema = z
  .object({
    moduleId: cuid,
    title: text(2, 120, 'Escribe el título de la lección.'),
    type: z.enum(['VIDEO', 'TEXT', 'RESOURCE']),
    content: z.string().max(20_000).nullable().default(null),
    isFreePreview: z.boolean().default(false),
  })
  .strict();

export const lessonUpdateSchema = z
  .object({
    lessonId: cuid,
    title: text(2, 120, 'Escribe el título de la lección.').optional(),
    content: z.string().max(20_000).nullable().optional(),
    isFreePreview: z.boolean().optional(),
  })
  .strict();

export const uploadRequestSchema = z
  .object({
    courseId: cuid,
    lessonId: cuid.nullable().default(null),
    kind: z.enum(['video', 'preview', 'thumbnail', 'resource']),
    mimeType: z.string().max(60),
    sizeBytes: z.number().int().positive(),
  })
  .strict();

export const uploadConfirmSchema = z
  .object({
    courseId: cuid,
    lessonId: cuid.nullable().default(null),
    kind: z.enum(['video', 'preview', 'thumbnail', 'resource']),
    path: z.string().max(200),
    /** Lo lee el navegador del <video> local antes de subir; se acota en el servidor. */
    durationSeconds: z.number().min(1).max(6 * 3600).nullable().default(null),
  })
  .strict();

export const coursePurchaseSchema = z
  .object({ slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/), acceptImmediateAccess: z.literal(true) })
  .strict();

export const freeEnrollSchema = z.object({ slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/) }).strict();

export const lessonProgressSchema = z
  .object({
    lessonId: cuid,
    positionSeconds: z.number().min(0).max(24 * 3600),
    markCompleted: z.boolean().default(false),
  })
  .strict();

export const rateCourseSchema = z
  .object({
    courseId: cuid,
    rating: z.number().int().min(1).max(5),
    review: z.string().trim().max(1_000).nullable().default(null),
  })
  .strict();

export const mediaUrlSchema = z.object({ lessonId: cuid, kind: z.enum(['video', 'resource']) }).strict();
