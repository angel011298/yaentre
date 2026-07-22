import type { TopicTier } from './topic-stats';

/**
 * Motor adaptativo (F6) — selector de reactivos para práctica libre (drill).
 * Lógica PURA y determinista (rng inyectable). Sin Prisma, sin red, sin IA.
 *
 * Mezcla objetivo (Task 2): ~60% temas débiles, ~25% intermedios, ~15%
 * dominados (repaso de mantenimiento). Excluye reactivos ya respondidos en las
 * últimas 72h (esa exclusión la resuelve la capa DB pasando `excludeQuestionIds`).
 *
 * GARANTÍA DE SEGURIDAD: este módulo NO decide qué reactivos son servibles; la
 * capa DB solo le pasa reactivos ya filtrados (usage=SERVABLE, isVerified=true).
 * Aun así, si la clasificación de temas falla aguas arriba, existe
 * `selectRandomFallback` para degradar a una selección aleatoria sin romper la
 * sesión del usuario.
 */

export const WEAK_RATIO = 0.6;
export const INTERMEDIATE_RATIO = 0.25;
export const MASTERED_RATIO = 0.15;

/** Horas hacia atrás durante las que un reactivo respondido no se repite. */
export const RECENT_EXCLUSION_HOURS = 72;

export interface SelectableQuestion {
  id: string;
  topicId: string;
}

export interface SelectionInput {
  /** Pool ya filtrado a SERVABLE + verificado por la capa DB. */
  questions: SelectableQuestion[];
  /** Clasificación por tema (topicId → tier). Temas ausentes ⇒ 'insufficient'. */
  topicTier: Map<string, TopicTier>;
  /** Reactivos respondidos en las últimas 72h — nunca se repiten. */
  excludeQuestionIds: Set<string>;
  /** Cuántos reactivos pedir. */
  count: number;
  /** Aleatoriedad inyectable para tests deterministas. */
  rng?: () => number;
}

/** A qué "cubeta" de selección va cada tier. Los de muestra insuficiente se
 *  practican como intermedios (aún se están explorando, no confirmados débiles
 *  ni dominados). */
function bucketOf(tier: TopicTier): 'weak' | 'intermediate' | 'mastered' {
  switch (tier) {
    case 'weak':
      return 'weak';
    case 'mastered':
      return 'mastered';
    case 'intermediate':
    case 'insufficient':
    default:
      return 'intermediate';
  }
}

/** Fisher-Yates sobre una copia; rng inyectable para determinismo en tests. */
function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

/**
 * Reparte `count` en las tres cubetas según la mezcla objetivo. weak por
 * redondeo, intermediate por redondeo, mastered = resto (para que sumen exacto
 * `count` sin descuadres por redondeo).
 */
export function targetBucketCounts(count: number): {
  weak: number;
  intermediate: number;
  mastered: number;
} {
  const weak = Math.round(count * WEAK_RATIO);
  const intermediate = Math.round(count * INTERMEDIATE_RATIO);
  const mastered = Math.max(0, count - weak - intermediate);
  return { weak, intermediate, mastered };
}

/**
 * Selección adaptativa. Nunca incluye un reactivo excluido (72h). Nunca repite
 * un id. Respeta la mezcla objetivo tanto como el pool lo permita, y si una
 * cubeta se queda corta, RELLENA con reactivos sobrantes de otras cubetas para
 * acercarse a `count` (mejor entregar una sesión completa que respetar la
 * proporción de forma estricta). Devuelve como máximo min(count, disponibles).
 */
export function selectAdaptiveQuestions(input: SelectionInput): string[] {
  const { questions, topicTier, excludeQuestionIds, count } = input;
  const rng = input.rng ?? Math.random;

  if (count <= 0) return [];

  const available = questions.filter((q) => !excludeQuestionIds.has(q.id));

  const buckets: Record<'weak' | 'intermediate' | 'mastered', SelectableQuestion[]> = {
    weak: [],
    intermediate: [],
    mastered: [],
  };
  for (const q of available) {
    const tier = topicTier.get(q.topicId) ?? 'insufficient';
    buckets[bucketOf(tier)].push(q);
  }

  const shuffled = {
    weak: shuffle(buckets.weak, rng),
    intermediate: shuffle(buckets.intermediate, rng),
    mastered: shuffle(buckets.mastered, rng),
  };

  const targets = targetBucketCounts(count);
  const selected: string[] = [];
  const taken = new Set<string>();

  const takeFrom = (bucket: SelectableQuestion[], n: number) => {
    for (const q of bucket) {
      if (selected.length >= count) break;
      if (n <= 0) break;
      if (taken.has(q.id)) continue;
      taken.add(q.id);
      selected.push(q.id);
      n--;
    }
  };

  takeFrom(shuffled.weak, targets.weak);
  takeFrom(shuffled.intermediate, targets.intermediate);
  takeFrom(shuffled.mastered, targets.mastered);

  // Relleno: si alguna cubeta se quedó corta, completar desde el resto para
  // acercarse a `count`. El orden (débil → intermedio → dominado) mantiene la
  // prioridad pedagógica al rellenar.
  if (selected.length < count) {
    const leftover = shuffle(
      [...shuffled.weak, ...shuffled.intermediate, ...shuffled.mastered].filter(
        (q) => !taken.has(q.id)
      ),
      rng
    );
    takeFrom(leftover, count - selected.length);
  }

  return selected;
}

/**
 * Respaldo seguro (Task 2): selección puramente aleatoria del pool disponible,
 * sin clasificación por temas. Se usa cuando el cálculo de temas débiles falla
 * por cualquier razón — la sesión del usuario nunca debe romperse.
 */
export function selectRandomFallback(
  questions: SelectableQuestion[],
  excludeQuestionIds: Set<string>,
  count: number,
  rng: () => number = Math.random
): string[] {
  if (count <= 0) return [];
  const available = questions.filter((q) => !excludeQuestionIds.has(q.id));
  return shuffle(available, rng)
    .slice(0, count)
    .map((q) => q.id);
}
