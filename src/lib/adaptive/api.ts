import { z } from 'zod';

/**
 * Esquemas Zod del borde de los endpoints del motor adaptativo (F6). Validación
 * en el borde de cada Route Handler (CLAUDE.md: "Validación con Zod en el borde
 * de cada Server Action y Route Handler").
 */

export const DEFAULT_ADAPTIVE_COUNT = 10;
export const MAX_ADAPTIVE_COUNT = 50;

export const nextQuestionsSchema = z.object({
  /** Área a practicar. Si se omite, el endpoint usa la del alumno (carrera meta). */
  areaId: z.string().min(1).optional(),
  count: z.number().int().min(1).max(MAX_ADAPTIVE_COUNT).optional(),
});

export type NextQuestionsInput = z.infer<typeof nextQuestionsSchema>;
