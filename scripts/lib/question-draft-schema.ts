import { z } from 'zod';
import katex from 'katex';

/**
 * Etapa 2 del pipeline (PRD §8): validación automática de los reactivos
 * generados por IA ANTES de que toquen la base de datos.
 *
 * Este módulo es puro y testeable: no importa Prisma ni la red. Se usa tanto
 * desde el CLI de generación como desde los tests de Vitest.
 *
 * Los cinco enums de dificultad provienen del schema Prisma (DifficultyLevel).
 */
export const DIFFICULTY_LEVELS = [
  'BEGINNER',
  'BASIC',
  'INTERMEDIATE',
  'ADVANCED',
  'EXPERT',
] as const;

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

/** Formatos de reactivo (espejo del enum QuestionFormat de Prisma, F2). */
export const QUESTION_FORMATS = [
  'MULTIPLE_CHOICE',
  'READING_COMPREHENSION',
  'IMAGE_OPTIONS',
  'CHART_TABLE',
  'MATCHING',
  'SENTENCE_COMPLETION',
  'ANALOGY',
  'ORDERING',
  'NUMERIC_SERIES',
  'PROBLEM_SOLVING',
  'SPATIAL_SERIES',
  'SPATIAL_IMAGINATION',
] as const;

export type QuestionFormat = (typeof QUESTION_FORMATS)[number];

const OPTION_IDS = ['A', 'B', 'C', 'D'] as const;

const nonEmpty = (label: string) =>
  z
    .string({ error: `${label} debe ser texto` })
    .trim()
    .min(1, `${label} no puede estar vacío`);

/**
 * Extrae todos los fragmentos LaTeX inline delimitados por `$...$` de un texto.
 * Ignora `$$...$$` (no lo usamos) y escapes `\$`.
 */
export function extractInlineLatex(text: string): string[] {
  const fragments: string[] = [];
  const regex = /(?<!\\)\$([^$]+?)(?<!\\)\$/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    fragments.push(match[1]);
  }
  return fragments;
}

/**
 * Valida un fragmento LaTeX puro con KaTeX. Devuelve un mensaje de error si es
 * inválido, o null si compila. `strict: false` evita rechazar por advertencias
 * de estilo (p. ej. Unicode), solo nos importan los errores de sintaxis reales.
 */
export function validateLatexFragment(latex: string): string | null {
  try {
    katex.renderToString(latex, { throwOnError: true, strict: false });
    return null;
  } catch (err) {
    if (err instanceof katex.ParseError) {
      return err.message;
    }
    return err instanceof Error ? err.message : 'LaTeX inválido';
  }
}

/**
 * Recorre un texto, extrae su LaTeX inline (`$...$`) y valida cada fragmento.
 * Devuelve la lista de errores encontrados (vacía si todo compila).
 */
function collectLatexErrors(text: string, where: string): string[] {
  return extractInlineLatex(text)
    .map((frag) => {
      const error = validateLatexFragment(frag);
      return error ? `${where}: LaTeX inválido en "$${frag}$" — ${error}` : null;
    })
    .filter((e): e is string => e !== null);
}

const explanationLayerSchema = z.object({
  layer: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  title: nonEmpty('El título de la explicación'),
  content: nonEmpty('El contenido de la explicación'),
  latexContent: z.string().trim().min(1).nullable().optional().default(null),
});

const optionSchema = z.object({
  id: z.enum(OPTION_IDS),
  text: nonEmpty('El texto de la opción'),
  isCorrect: z.boolean(),
  // Soporte de imagen por opción (formato IMAGE_OPTIONS / SPATIAL_*): la
  // opción puede llevar una imagen además del texto (el texto sigue siendo
  // obligatorio como descripción accesible — WCAG, color/imagen nunca es el
  // único canal).
  imageUrl: z.string().url().nullable().optional().default(null),
});

/**
 * Schema base (forma). Las reglas cruzadas (1 correcta, ids únicos A-D, capas
 * 1/2/3, LaTeX bien formado) se aplican con superRefine para dar mensajes
 * accionables al log de rechazados.
 */
export const QuestionDraftSchema = z
  .object({
    stem: nonEmpty('El enunciado'),
    options: z.array(optionSchema),
    difficulty: z.enum(DIFFICULTY_LEVELS),
    explanations: z.array(explanationLayerSchema),
    // Formato del reactivo (F2). Default MULTIPLE_CHOICE para compatibilidad
    // con el corpus few-shot existente que no lo declara.
    format: z.enum(QUESTION_FORMATS).optional().default('MULTIPLE_CHOICE'),
  })
  .superRefine((draft, ctx) => {
    // ── Opciones: exactamente 4, ids A/B/C/D únicos ──
    if (draft.options.length !== 4) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: `Debe haber exactamente 4 opciones (hay ${draft.options.length})`,
      });
    }
    const ids = draft.options.map((o) => o.id);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Los ids de opción están duplicados; deben ser A, B, C, D',
      });
    }
    for (const required of OPTION_IDS) {
      if (!uniqueIds.has(required)) {
        ctx.addIssue({
          code: 'custom',
          path: ['options'],
          message: `Falta la opción con id "${required}"`,
        });
      }
    }

    // ── Exactamente una opción correcta ──
    const correctCount = draft.options.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: `Debe haber exactamente 1 opción correcta (hay ${correctCount})`,
      });
    }

    // ── Explicaciones: exactamente las capas 1, 2 y 3 ──
    const layers = draft.explanations.map((e) => e.layer).sort();
    const expected = [1, 2, 3];
    const layersOk =
      layers.length === 3 && expected.every((l, i) => layers[i] === l);
    if (!layersOk) {
      ctx.addIssue({
        code: 'custom',
        path: ['explanations'],
        message: `Deben estar exactamente las capas 1, 2 y 3 (se encontró: [${layers.join(', ')}])`,
      });
    }

    // ── LaTeX bien formado dondequiera que aparezca ──
    const latexErrors: string[] = [
      ...collectLatexErrors(draft.stem, 'stem'),
      ...draft.options.flatMap((o) =>
        collectLatexErrors(o.text, `opción ${o.id}`),
      ),
      ...draft.explanations.flatMap((e) => {
        const errs = collectLatexErrors(e.content, `capa ${e.layer} (content)`);
        if (e.latexContent) {
          const bare = validateLatexFragment(e.latexContent);
          if (bare) {
            errs.push(`capa ${e.layer} (latexContent) — ${bare}`);
          }
        }
        return errs;
      }),
    ];
    for (const message of latexErrors) {
      ctx.addIssue({ code: 'custom', path: ['latex'], message });
    }
  });

export type QuestionDraft = z.infer<typeof QuestionDraftSchema>;

export interface ValidationOk {
  ok: true;
  draft: QuestionDraft;
}
export interface ValidationFail {
  ok: false;
  errors: string[];
  raw: unknown;
}
export type ValidationResult = ValidationOk | ValidationFail;

/** Valida un objeto candidato y aplana los errores de Zod a strings legibles. */
export function validateDraft(candidate: unknown): ValidationResult {
  const result = QuestionDraftSchema.safeParse(candidate);
  if (result.success) {
    return { ok: true, draft: result.data };
  }
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  return { ok: false, errors, raw: candidate };
}

/**
 * Normaliza un stem para detección de duplicados: minúsculas, espacios
 * colapsados y sin signos de puntuación superficiales. Permite comparar
 * "¿Cuánto es 2+2?" con "Cuanto es 2 + 2" como potencial duplicado.
 */
export function normalizeStem(stem: string): string {
  return stem
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s$]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
