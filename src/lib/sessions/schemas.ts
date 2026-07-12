import { z } from 'zod';

/**
 * Validación Zod en el borde de las Server Actions de sesiones. Todo input del
 * cliente pasa por aquí antes de tocar la DB.
 */

export const sessionModeSchema = z.enum([
  'DIAGNOSTIC',
  'TOPIC_DRILL',
  'AREA_PRACTICE',
  'FULL_SIMULATION',
]);

export const startSessionSchema = z.object({
  examId: z.string().min(1),
  mode: sessionModeSchema,
  // Opcional: si no se provee, la capa DB usa exam.durationMins * 60.
  timeLimitSecs: z.number().int().positive().optional(),
});

export const submitAnswerSchema = z.object({
  sessionId: z.string().min(1),
  questionId: z.string().min(1),
  // null = respuesta omitida. Un id concreto se valida contra el reactivo
  // real en la capa DB (aquí solo se garantiza forma).
  selectedOption: z.string().min(1).nullable(),
  position: z.number().int().min(0),
  timeSpentSecs: z.number().int().min(0),
});

export const finishSessionSchema = z.object({
  sessionId: z.string().min(1),
  reason: z.enum(['USER', 'TIMEOUT']).optional(),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
export type FinishSessionInput = z.infer<typeof finishSessionSchema>;

/**
 * Resultado discriminado de las Server Actions: evita propagar excepciones
 * (y stack traces) a través del borde servidor/cliente. La UI hace un check
 * de `ok` y ya tiene datos tipados o un error legible.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };
