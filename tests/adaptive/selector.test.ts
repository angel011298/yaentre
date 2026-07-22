import { describe, expect, it } from 'vitest';
import {
  selectAdaptiveQuestions,
  selectRandomFallback,
  targetBucketCounts,
  type SelectableQuestion,
} from '@/lib/adaptive/selector';
import type { TopicTier } from '@/lib/adaptive/topic-stats';

/** RNG determinista sembrado (mulberry32) para tests reproducibles. */
function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Genera n reactivos de un tema con ids prefijados por el tema. */
function questionsFor(topicId: string, n: number): SelectableQuestion[] {
  return Array.from({ length: n }, (_, i) => ({ id: `${topicId}_q${i}`, topicId }));
}

const TIERS = new Map<string, TopicTier>([
  ['tw', 'weak'],
  ['ti', 'intermediate'],
  ['tm', 'mastered'],
]);

const POOL: SelectableQuestion[] = [
  ...questionsFor('tw', 30),
  ...questionsFor('ti', 30),
  ...questionsFor('tm', 30),
];

const bucketOfId = (id: string) => id.split('_')[0];

describe('targetBucketCounts — mezcla 60/25/15', () => {
  it('para 20 reactivos da exactamente 12/5/3', () => {
    expect(targetBucketCounts(20)).toEqual({ weak: 12, intermediate: 5, mastered: 3 });
  });

  it('para 100 reactivos da exactamente 60/25/15', () => {
    expect(targetBucketCounts(100)).toEqual({ weak: 60, intermediate: 25, mastered: 15 });
  });

  it('siempre suma el total pedido y prioriza temas débiles', () => {
    for (const n of [1, 3, 7, 10, 13, 25]) {
      const t = targetBucketCounts(n);
      expect(t.weak + t.intermediate + t.mastered).toBe(n);
      expect(t.weak).toBeGreaterThanOrEqual(t.intermediate);
    }
  });
});

describe('selectAdaptiveQuestions — mezcla y garantías', () => {
  it('con pool abundante respeta la mezcla 12/5/3 para 20 reactivos', () => {
    const ids = selectAdaptiveQuestions({
      questions: POOL,
      topicTier: TIERS,
      excludeQuestionIds: new Set(),
      count: 20,
      rng: seededRng(42),
    });
    expect(ids).toHaveLength(20);
    const byBucket = ids.reduce<Record<string, number>>((acc, id) => {
      const b = bucketOfId(id);
      acc[b] = (acc[b] ?? 0) + 1;
      return acc;
    }, {});
    expect(byBucket).toEqual({ tw: 12, ti: 5, tm: 3 });
  });

  it('NUNCA incluye un reactivo respondido en las últimas 72h', () => {
    const excluded = new Set(POOL.filter((q) => q.topicId === 'tw').map((q) => q.id));
    const ids = selectAdaptiveQuestions({
      questions: POOL,
      topicTier: TIERS,
      excludeQuestionIds: excluded,
      count: 20,
      rng: seededRng(7),
    });
    expect(ids.some((id) => excluded.has(id))).toBe(false);
    // Con débiles excluidos, rellena desde intermedios/dominados hasta 20.
    expect(ids).toHaveLength(20);
  });

  it('nunca repite un reactivo', () => {
    const ids = selectAdaptiveQuestions({
      questions: POOL,
      topicTier: TIERS,
      excludeQuestionIds: new Set(),
      count: 40,
      rng: seededRng(99),
    });
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('si una cubeta se queda corta, rellena desde otras para acercarse a count', () => {
    // Solo hay 3 débiles pero se piden 10; se completa con intermedios/dominados.
    const pool = [...questionsFor('tw', 3), ...questionsFor('ti', 20), ...questionsFor('tm', 20)];
    const ids = selectAdaptiveQuestions({
      questions: pool,
      topicTier: TIERS,
      excludeQuestionIds: new Set(),
      count: 10,
      rng: seededRng(3),
    });
    expect(ids).toHaveLength(10);
    expect(ids.filter((id) => bucketOfId(id) === 'tw').length).toBeLessThanOrEqual(3);
  });

  it('temas de muestra insuficiente (sin tier) se practican como intermedios', () => {
    const pool = questionsFor('tu', 10); // 'tu' no está en el mapa de tiers
    const ids = selectAdaptiveQuestions({
      questions: pool,
      topicTier: TIERS,
      excludeQuestionIds: new Set(),
      count: 5,
      rng: seededRng(11),
    });
    expect(ids).toHaveLength(5);
    expect(ids.every((id) => bucketOfId(id) === 'tu')).toBe(true);
  });

  it('devuelve como máximo los disponibles tras excluir', () => {
    const pool = questionsFor('tw', 4);
    const excluded = new Set([pool[0].id, pool[1].id]);
    const ids = selectAdaptiveQuestions({
      questions: pool,
      topicTier: TIERS,
      excludeQuestionIds: excluded,
      count: 10,
      rng: seededRng(1),
    });
    expect(ids).toHaveLength(2);
  });

  it('count 0 ⇒ selección vacía', () => {
    expect(
      selectAdaptiveQuestions({
        questions: POOL,
        topicTier: TIERS,
        excludeQuestionIds: new Set(),
        count: 0,
      })
    ).toEqual([]);
  });

  it('es determinista con la misma semilla', () => {
    const args = {
      questions: POOL,
      topicTier: TIERS,
      excludeQuestionIds: new Set<string>(),
      count: 15,
    };
    const a = selectAdaptiveQuestions({ ...args, rng: seededRng(123) });
    const b = selectAdaptiveQuestions({ ...args, rng: seededRng(123) });
    expect(a).toEqual(b);
  });
});

describe('selectRandomFallback — respaldo seguro', () => {
  it('excluye los recientes y respeta el count', () => {
    const excluded = new Set([POOL[0].id, POOL[1].id]);
    const ids = selectRandomFallback(POOL, excluded, 12, seededRng(5));
    expect(ids).toHaveLength(12);
    expect(ids.some((id) => excluded.has(id))).toBe(false);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('con pool más chico que count, devuelve todo lo disponible', () => {
    const pool = questionsFor('tw', 3);
    expect(selectRandomFallback(pool, new Set(), 10, seededRng(2))).toHaveLength(3);
  });
});
