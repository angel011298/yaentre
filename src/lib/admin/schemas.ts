import { z } from 'zod';

/** Validación Zod en el borde de las Server Actions del panel admin. */

export const questionIdSchema = z.object({
  questionId: z.string().min(1),
});
export type QuestionIdInput = z.infer<typeof questionIdSchema>;

/**
 * El cuerpo del reactivo editado (`draft`) se valida con `validateDraft` de
 * scripts/lib/question-draft-schema.ts (las mismas reglas de la Etapa 2 del
 * pipeline), no con Zod aquí — por eso `draft` entra como `unknown`.
 *
 * `markVerified` (F3): true cuando la edición viene del panel de revisión —
 * guardar también resuelve la cola (ver adminDb.updateQuestion).
 */
export const updateQuestionInputSchema = z.object({
  questionId: z.string().min(1),
  draft: z.unknown(),
  markVerified: z.boolean().optional().default(false),
});
export type UpdateQuestionInput = z.input<typeof updateQuestionInputSchema>;

/** F3: "aprobar con la opción X" desde el panel de revisión. */
export const approveWithOptionSchema = z.object({
  questionId: z.string().min(1),
  optionId: z.string().min(1),
});
export type ApproveWithOptionInput = z.input<typeof approveWithOptionSchema>;

/** Mismo patrón que src/lib/sessions/schemas.ts, duplicado a propósito para
 * no acoplar el dominio admin al de sesiones. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };
