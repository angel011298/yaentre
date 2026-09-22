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

// ═══════════════════════════════════════════════════════════════════════════
// G99 — ADMINISTRACIÓN DE CUENTAS
// ═══════════════════════════════════════════════════════════════════════════
//
// ⚠️ EXCEPCIÓN AUTORIZADA AL GUARDRAIL «no aceptar `userProfileId` como
// entrada de una Server Action» (CLAUDE.md). Una acción de administración
// tiene que recibir a quién afecta: no hay forma de derivar el objetivo del
// guard, porque el objetivo NO es quien actúa. La excepción vale ÚNICAMENTE
// con las cuatro condiciones, y en este orden:
//
//   1. la propia acción llama `requireRole('ADMIN')` (nunca se apoya en el
//      layout: una Server Action es su propio endpoint y se alcanza con un
//      `fetch` sin renderizar ningún layout);
//   2. el id entra validado como cuid por uno de los esquemas de este
//      archivo;
//   3. la acción escribe en `admin_audit_log` ANTES de responder;
//   4. pasa por `consumeRateLimit` (el contador COMPARTIDO de Postgres, nunca
//      el de memoria).
//
// `pnpm security:authz` verifica el guardrail original; estas acciones quedan
// fuera de su barrido por diseño y las cubre `tests/admin/authz.test.ts`, que
// enumera la matriz completa de roles.

/**
 * Los ids de `UserProfile` son cuid (`@default(cuid())`). Validar la FORMA
 * antes de tocar la base convierte un id inventado en un rechazo barato y
 * auditable, en vez de una consulta.
 */
const cuidSchema = z
  .string()
  .trim()
  .regex(/^c[a-z0-9]{24,31}$/, 'Identificador de usuario inválido.');

/**
 * Motivo OBLIGATORIO en toda acción de administración. No es burocracia: es
 * lo único que hace útil la bitácora seis meses después, cuando nadie recuerda
 * por qué esta cuenta tiene un Premium regalado.
 */
const reasonSchema = z
  .string()
  .trim()
  .min(8, 'Escribe el motivo (mínimo 8 caracteres).')
  .max(400, 'Máximo 400 caracteres.');

export const adminUserTargetSchema = z.object({
  userProfileId: cuidSchema,
  reason: reasonSchema,
});
export type AdminUserTargetInput = z.input<typeof adminUserTargetSchema>;

export const grantCompSchema = z.object({
  userProfileId: cuidSchema,
  reason: reasonSchema,
  plan: z.enum(['MONTHLY', 'SEASON_PASS', 'PREMIUM']),
  season: z.enum(['EARLY_BIRD', 'HIGH_SEASON', 'LAST_MINUTE']),
});
export type GrantCompInput = z.input<typeof grantCompSchema>;

export const cancelPlanSchema = z.object({
  userProfileId: cuidSchema,
  reason: reasonSchema,
  subscriptionId: cuidSchema,
});
export type CancelPlanInput = z.input<typeof cancelPlanSchema>;

export const changeRoleSchema = z.object({
  userProfileId: cuidSchema,
  reason: reasonSchema,
  role: z.enum(['STUDENT', 'PARENT', 'ADMIN']),
});
export type ChangeRoleInput = z.input<typeof changeRoleSchema>;

/** Búsqueda paginada de la pestaña Usuarios. Resuelta EN EL SERVIDOR. */
export const userSearchSchema = z.object({
  q: z.string().trim().max(120).optional().default(''),
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
});

/** Filtros de la pestaña Bitácora. */
export const auditFilterSchema = z.object({
  actor: z.string().trim().max(120).optional().default(''),
  action: z.string().trim().max(60).optional().default(''),
  target: z.string().trim().max(120).optional().default(''),
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
});

// ── Bóveda de archivos (G99 parte A2) ──────────────────────────────────────

export const vaultFileIdSchema = z.object({ fileId: cuidSchema });

export const deleteVaultFileSchema = z.object({
  fileId: cuidSchema,
  reason: reasonSchema,
});
export type DeleteVaultFileInput = z.input<typeof deleteVaultFileSchema>;

// ── Notas del panel (apartado dentro de /admin/boveda) ─────────────────────
//
// NO llevan `reason`: a diferencia de las acciones de la lista de arriba
// (cortesías, bajas, cambios de rol), crear o borrar una nota no mueve
// dinero ni cambia el acceso de una cuenta — exigir un motivo aquí sería
// burocracia sin ningún caso real que la use seis meses después.

export const createNoteSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Escribe algo antes de guardar.')
    .max(5000, 'Máximo 5 000 caracteres.'),
});
export type CreateNoteInput = z.input<typeof createNoteSchema>;

export const deleteNoteSchema = z.object({ noteId: cuidSchema });
export type DeleteNoteInput = z.input<typeof deleteNoteSchema>;
