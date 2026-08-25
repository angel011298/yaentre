import { z } from 'zod';

/**
 * Verificación adversarial vía SESIONES de Claude Code (G2) — reemplaza por
 * completo al antiguo `verifier.ts` (que llamaba a la API de pago).
 *
 * GARANTÍA ESTRUCTURAL preservada, ahora por AISLAMIENTO DE SESIÓN en vez de
 * aislamiento de código: `buildBlindItem()` construye el ítem del lote ciego
 * por SELECCIÓN EXPLÍCITA de campos — `isCorrect` y `explanations` NO EXISTEN
 * en el tipo de retorno, así que no pueden viajar al archivo que lee la sesión
 * verificadora. Esa sesión debe ser DISTINTA (proceso/conversación separada)
 * de la que compuso los reactivos — la separación de sesión sustituye a la
 * separación de llamada-a-API del diseño anterior.
 *
 * El orden de las opciones se mezcla de forma DETERMINISTA (semilla = id del
 * reactivo) para que la sesión verificadora nunca vea la A/B/C/D original —
 * ni siquiera por posición. `translateChosenOption` recompone el mismo
 * mezclado en el momento de resolver, sin necesidad de persistir un mapa en
 * ningún archivo intermedio.
 */

// ── Modelo/tier recomendado por rol (documentación de orquestación, NUNCA
//    usado para una llamada a API — ver CLAUDE.md) ──
export const VERIFIER_MODEL_TIER = 'claude-fable-5';
export const AUDIT_MODEL_TIER = 'claude-opus-4-8';

export const PROBLEM_TYPES = [
  'AMBIGUOUS_STEM',
  'MULTIPLE_VALID',
  'NONE_VALID',
  'WEAK_DISTRACTORS',
  'OFF_SYLLABUS',
  'CALC_NOT_EXECUTED',
  'OTHER',
] as const;

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;
export type OptionLabel = (typeof OPTION_LABELS)[number];

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');
}

const CALC_SUBJECT_KEYS = ['matematica', 'fisica', 'quimica', 'aritmetica', 'calculo', 'algebra'];

/** Materias donde la sesión verificadora debe EJECUTAR el cálculo (Bash/código
 *  propio de la sesión), no solo razonar en texto — mismo criterio que F2. */
export function isCalcSubject(subject: string): boolean {
  const n = normalize(subject);
  return CALC_SUBJECT_KEYS.some((k) => n.includes(k));
}

// ── Shuffle determinista (semilla = questionId) ──

/** Hash simple string→uint32, suficiente para sembrar un PRNG (no criptográfico). */
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** PRNG determinista (mulberry32) sembrado por el hash del id del reactivo. */
function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface StoredOption {
  id: string;
  text: string;
  isCorrect: boolean;
  imageUrl?: string | null;
}

export interface ShuffledOption {
  label: OptionLabel;
  originalId: string;
  text: string;
  imageUrl?: string | null;
}

/**
 * Mezcla las opciones de un reactivo con una semilla DETERMINISTA derivada de
 * `questionId` — la misma llamada con los mismos `options` siempre produce el
 * mismo orden, así que `translateChosenOption` puede recomponerlo sin
 * necesitar un archivo de mapeo separado. Ordena `options` por `id` ANTES de
 * mezclar (independiente del orden en que Prisma los devuelva).
 */
export function shuffleOptionsForQuestion(
  questionId: string,
  options: StoredOption[],
): ShuffledOption[] {
  const sorted = [...options].sort((a, b) => a.id.localeCompare(b.id));
  const rng = seededRng(hashSeed(questionId));
  const pool = [...sorted];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 4).map((o, i) => ({
    label: OPTION_LABELS[i],
    originalId: o.id,
    text: o.text,
    imageUrl: o.imageUrl ?? null,
  }));
}

/** Recompone el mismo mezclado y traduce la letra elegida por la sesión
 *  verificadora de vuelta al id ORIGINAL de la opción en la DB. */
export function translateChosenOption(
  questionId: string,
  options: StoredOption[],
  chosenLabel: OptionLabel,
): string {
  const shuffled = shuffleOptionsForQuestion(questionId, options);
  const match = shuffled.find((o) => o.label === chosenLabel);
  if (!match) {
    throw new Error(`Letra "${chosenLabel}" no corresponde a ninguna opción de ${questionId}`);
  }
  return match.originalId;
}

// ── Lote ciego: SOLO lo que un sustentante vería ──

export interface BlindQuestionInput {
  id: string;
  stem: string;
  options: StoredOption[];
  format?: string | null;
  passageContent?: string | null;
}

export interface BlindContext {
  subject: string;
  topic: string;
  institution: string;
}

export interface BlindOption {
  label: OptionLabel;
  text: string;
  imageUrl?: string | null;
}

export interface BlindBatchItem {
  questionId: string;
  institution: string;
  subject: string;
  topic: string;
  format: string;
  passage?: string | null;
  requiresCalculation: boolean;
  stem: string;
  options: BlindOption[];
}

/**
 * Construye el ítem del lote ciego por SELECCIÓN EXPLÍCITA de campos —
 * `isCorrect` y `explanations` no existen en `BlindBatchItem`, así que no hay
 * forma de que se filtren aquí por accidente (mismo patrón que
 * `buildVerifierPayload` del diseño anterior, ahora sin SDK).
 */
export function buildBlindItem(question: BlindQuestionInput, ctx: BlindContext): BlindBatchItem {
  const shuffled = shuffleOptionsForQuestion(question.id, question.options);
  return {
    questionId: question.id,
    institution: ctx.institution,
    subject: ctx.subject,
    topic: ctx.topic,
    format: question.format ?? 'MULTIPLE_CHOICE',
    passage: question.passageContent ?? null,
    requiresCalculation: isCalcSubject(ctx.subject),
    stem: question.stem,
    options: shuffled.map((o) => ({ label: o.label, text: o.text, imageUrl: o.imageUrl })),
  };
}

// ── Respuesta de la sesión verificadora (archivo de resultados) ──

export const VerifierAnswerSchema = z.object({
  questionId: z.string().min(1),
  chosenOption: z.enum(OPTION_LABELS),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional().default(''),
  /** true si la sesión verificadora EJECUTÓ el cálculo (código real), en vez
   *  de solo razonarlo en texto — obligatorio en materias `isCalcSubject`.
   *  Se persiste tal cual en `Question.verification` para que el registro de
   *  auditoría no afirme algo distinto de lo que la sesión hizo. */
  usedCalculation: z.boolean().optional().default(false),
  problems: z
    .array(z.object({ type: z.enum(PROBLEM_TYPES), detail: z.string() }))
    .optional()
    .default([]),
});
export type VerifierAnswer = z.infer<typeof VerifierAnswerSchema>;

export const VerifierAnswersFileSchema = z.array(VerifierAnswerSchema);
