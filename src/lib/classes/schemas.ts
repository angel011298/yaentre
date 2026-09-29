import { z } from 'zod';
import { SUBJECT_KEYS } from '@/lib/teachers/tariff';

/**
 * Esquemas del BORDE de las rutas de clases — Bloque 2. Ninguno acepta un
 * identificador de persona (`userProfileId`, `studentProfileId`, …): el dueño de
 * cada recurso sale SIEMPRE del guard (guardrail de CLAUDE.md, verificado por
 * `pnpm security:authz`). Los ids que SÍ entran (profesor, clase) son del
 * recurso, y cada consulta los cruza con el dueño de la sesión.
 *
 * `.strict()` en cada objeto: un campo desconocido es un error, no se ignora en
 * silencio (un cliente que manda `priceCents` cree estar fijando el precio).
 */

/** Forma de un cuid: minúsculas y dígitos. Acota lo que llega a una consulta. */
export const resourceIdSchema = z.string().regex(/^[a-z0-9]{10,40}$/, 'Identificador inválido.');

const subjectKeySchema = z.enum(SUBJECT_KEYS as [string, ...string[]]);

/** ISO-8601 con zona (`2026-10-07T23:00:00Z`): sin zona, el servidor (UTC) la interpretaría mal. */
const instantSchema = z
  .string()
  .datetime({ offset: true, message: 'Fecha y hora inválidas.' })
  .transform((v) => new Date(v));

export const quoteSchema = z
  .object({
    teacherId: resourceIdSchema,
    subjectKey: subjectKeySchema,
    scheduledAt: instantSchema,
    durationMinutes: z.union([z.literal(50), z.literal(80)]),
  })
  .strict();

export const bookSchema = z
  .object({
    teacherId: resourceIdSchema,
    subjectKey: subjectKeySchema,
    scheduledAt: instantSchema,
    durationMinutes: z.union([z.literal(50), z.literal(80)]),
    recordingConsent: z.boolean(),
    /** El precio final que el alumno VIO. Sin él no se cobra: nunca un precio que la persona no vio. */
    expectedPriceCents: z.number().int().positive().max(10_000_00),
  })
  .strict();

export const directoryQuerySchema = z
  .object({
    subjectKey: subjectKeySchema.optional(),
    level: z.enum(['INICIAL', 'VERIFICADO', 'DESTACADO']).optional(),
    weekday: z.coerce.number().int().min(0).max(6).optional(),
    maxPriceCents: z.coerce.number().int().positive().max(10_000_00).optional(),
    page: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const cancelSchema = z.object({ reason: z.string().trim().max(300).optional() }).strict();

export const rateSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    feedback: z.string().trim().max(500).nullish(),
  })
  .strict();

export const disputeSchema = z
  .object({ reason: z.string().trim().min(10, 'Cuéntanos con un poco más de detalle qué pasó.').max(500) })
  .strict();
