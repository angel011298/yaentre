import { z } from 'zod';

/**
 * Parseo del veredicto del pipeline adversarial (F2/F2b) guardado en
 * `Question.verification` (JSONB) — y las utilidades puras que el panel de
 * revisión (F3) necesita para clasificar la cola y resolver decisiones.
 *
 * Espejo runtime de las interfaces de scripts/lib/verifier.ts y
 * scripts/lib/resolution.ts. No se importa el RUNTIME de esos módulos aquí
 * (arrastrarían el SDK de Anthropic y node:vm al bundle de la app) — este
 * archivo es la fuente de verdad para leer esos datos desde Next.js.
 */

const PROBLEM_TYPES = [
  'AMBIGUOUS_STEM',
  'MULTIPLE_VALID',
  'NONE_VALID',
  'WEAK_DISTRACTORS',
  'OFF_SYLLABUS',
  'CALC_NOT_EXECUTED',
  'OTHER',
] as const;

const verifierVerdictSchema = z.object({
  chosenOption: z.enum(['A', 'B', 'C', 'D']),
  confidence: z.number(),
  reasoning: z.string(),
  problems: z.array(z.object({ type: z.enum(PROBLEM_TYPES), detail: z.string() })),
  model: z.string(),
  usedCalculation: z.boolean(),
  usage: z.object({ inputTokens: z.number(), outputTokens: z.number() }),
  verifiedAt: z.string(),
});

const decisionSchema = z.enum(['AUTO_APPROVED', 'UNPUBLISHED']);

const auditSchema = z.object({
  verdict: verifierVerdictSchema,
  decision: decisionSchema,
  reasons: z.array(z.string()),
  degraded: z.boolean(),
});

/**
 * Anotación de resolución manual (F3): un admin aprobó con una opción
 * específica, guardó una edición que resuelve la cola, o retiró el reactivo
 * por ser duplicado de otro (`duplicate`, G40 — despublicado a propósito:
 * `isVerified=false` permanente, fuera de toda cola, sin borrar el histórico
 * del pipeline). Se AGREGA al
 * registro sin tocar `decision`/`reasons`/`audit` — esos preservan lo que el
 * PIPELINE decidió originalmente (para poder medir su salud sin importar qué
 * pase después); `manualReview` es lo único que decide si sigue en la cola.
 */
const manualReviewSchema = z.object({
  action: z.enum(['approved_with_option', 'edited', 'duplicate']),
  optionId: z.string().optional(),
  at: z.string(),
  note: z.string().optional(),
});

export const verificationRecordSchema = z.object({
  pipeline: z.string(), // 'adversarial-v1' hoy; sin cerrar a un literal para tolerar versiones futuras
  generatorModel: z.string(),
  generatorOption: z.string(),
  verdict: verifierVerdictSchema,
  decision: decisionSchema,
  reasons: z.array(z.string()),
  audit: auditSchema.nullable().optional(),
  manualReview: manualReviewSchema.nullable().optional(),
});

export type VerificationRecord = z.infer<typeof verificationRecordSchema>;
export type VerifierVerdict = z.infer<typeof verifierVerdictSchema>;

/**
 * Lee `Question.verification` (JsonValue de Prisma) como un VerificationRecord
 * válido. `null` si está ausente, es legado o está corrupto — el panel lo
 * trata como "sin veredicto del pipeline" en vez de romper la página.
 */
export function parseVerificationRecord(raw: unknown): VerificationRecord | null {
  if (raw === null || raw === undefined) return null;
  const result = verificationRecordSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/** Fusiona una anotación de resolución manual sobre un registro existente.
 * `undefined` si no había veredicto del pipeline (nada que anotar). */
export function withManualReview(
  raw: unknown,
  entry: {
    action: 'approved_with_option' | 'edited' | 'duplicate';
    optionId?: string;
    note?: string;
  },
): VerificationRecord | undefined {
  const record = parseVerificationRecord(raw);
  if (!record) return undefined;
  return { ...record, manualReview: { ...entry, at: new Date().toISOString() } };
}

// ─────────────────── Colas de revisión (F3) ───────────────────

export type ReviewQueueKind = 'discrepancy' | 'low_confidence' | 'degraded_audit';

export const REVIEW_QUEUE_LABELS: Record<ReviewQueueKind, string> = {
  discrepancy: 'Discrepancias',
  low_confidence: 'Baja confianza / problemas',
  degraded_audit: 'Muestreo degradado',
};

export const REVIEW_QUEUE_ORDER: ReviewQueueKind[] = [
  'discrepancy',
  'low_confidence',
  'degraded_audit',
];

/**
 * Clasifica un veredicto en una de las 3 colas del panel (F3), o `null` si no
 * pertenece a ninguna (auto-aprobado, o ya resuelto manualmente). Reglas, en
 * orden — mutuamente excluyentes por construcción del pipeline
 * (content-run.ts / verify-questions.ts):
 *   1. manualReview: un admin ya lo resolvió — sale de toda cola.
 *   2. degraded_audit: la tercera pasada (muestreo de auditoría 5%) degradó
 *      un reactivo que SÍ se había auto-aprobado inicialmente. Solo se
 *      auditan reactivos AUTO_APPROVED, así que el veredicto de 2ª pasada
 *      conserva `decision: 'AUTO_APPROVED'` a propósito (para medir la salud
 *      del pipeline sin importar qué pase después) y el rechazo vive en
 *      `audit.degraded`. Por eso se comprueba ANTES del guard de `decision`:
 *      si no, un degradado (que content-audit-resolve.ts deja en
 *      isVerified=false) quedaría fuera de toda cola e invisible en el panel.
 *   3. discrepancy: el veredicto INICIAL (nunca auditado) no coincidió con
 *      la opción del generador.
 *   4. low_confidence: el veredicto inicial coincidió en la opción, pero
 *      falló por confianza baja o problemas detectados.
 */
export function classifyReviewQueue(record: VerificationRecord): ReviewQueueKind | null {
  if (record.manualReview) return null; // ya resuelto por un admin
  if (record.audit?.degraded) return 'degraded_audit';
  if (record.decision !== 'UNPUBLISHED') return null;
  if (record.reasons.some((r) => r.startsWith('DISCREPANCIA:'))) return 'discrepancy';
  if (
    record.reasons.some(
      (r) => r.startsWith('CONFIANZA BAJA:') || r.startsWith('PROBLEMAS DETECTADOS:'),
    )
  ) {
    return 'low_confidence';
  }
  return null;
}

// ─────────────────── Opciones de reactivo (tolerante a imagen) ───────────────────

export interface AdminOption {
  id: string;
  text: string;
  isCorrect: boolean;
  imageUrl?: string | null;
}

const adminOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  isCorrect: z.boolean(),
  imageUrl: z.string().nullable().optional(),
});
const adminOptionsSchema = z.array(adminOptionSchema).min(2);

/**
 * Parseo TOLERANTE de `Question.options` para el panel admin (incluye
 * `imageUrl`, a diferencia del schema estricto de scoring — ver
 * src/lib/sessions/scoring.ts, que es código crítico 🔴 y no se toca aquí).
 */
export function parseAdminOptions(raw: unknown): AdminOption[] {
  return adminOptionsSchema.parse(raw);
}

/** Reescribe las opciones marcando `correctId` como la única correcta. Pura;
 * usada al "aprobar con la opción X" desde el panel de revisión (F3). */
export function withCorrectOption(options: AdminOption[], correctId: string): AdminOption[] {
  return options.map((o) => ({ ...o, isCorrect: o.id === correctId }));
}
