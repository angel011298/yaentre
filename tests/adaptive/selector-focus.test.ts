import { describe, expect, it } from 'vitest';
import { selectAdaptiveQuestions, type SelectableQuestion } from '@/lib/adaptive/selector';
import type { TopicTier } from '@/lib/adaptive/topic-stats';

/**
 * G100 — «materias a reforzar». Regla: los temas NO dominados de una materia
 * en foco van a la cubeta de débiles (~60%); los dominados siguen como repaso.
 */
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

function qs(topicId: string, subjectId: string, n: number): SelectableQuestion[] {
  return Array.from({ length: n }, (_, i) => ({ id: `${topicId}_q${i}`, topicId, subjectId }));
}

// Dos materias con temas intermedios idénticos en tamaño; sin débiles reales.
const TIERS = new Map<string, TopicTier>([
  ['mate_i', 'intermediate'],
  ['fis_i', 'intermediate'],
  ['mate_m', 'mastered'],
]);
const POOL = [...qs('mate_i', 'MATE', 40), ...qs('fis_i', 'FIS', 40), ...qs('mate_m', 'MATE', 40)];
const topicOf = (id: string) => id.split('_q')[0];

function run(focus?: Set<string>, seed = 7) {
  return selectAdaptiveQuestions({
    questions: POOL,
    topicTier: TIERS,
    excludeQuestionIds: new Set(),
    count: 20,
    rng: seededRng(seed),
    focusSubjectIds: focus,
  });
}

describe('selectAdaptiveQuestions — materias a reforzar (G100)', () => {
  it('sin foco, las dos materias intermedias se reparten la cubeta intermedia', () => {
    const picked = run();
    const fis = picked.filter((id) => topicOf(id) === 'fis_i').length;
    const mateI = picked.filter((id) => topicOf(id) === 'mate_i').length;
    // Sin débiles, la mezcla rellena desde intermedios: ambas aparecen.
    expect(fis).toBeGreaterThan(0);
    expect(mateI).toBeGreaterThan(0);
  });

  it('con foco en Física, sus temas intermedios ocupan la cubeta de débiles (≥ 60%)', () => {
    const picked = run(new Set(['FIS']));
    const fis = picked.filter((id) => topicOf(id) === 'fis_i').length;
    expect(fis).toBeGreaterThanOrEqual(12); // round(20 × 0.6)
  });

  it('el foco SUBE la cuota de la materia respecto de no tener foco (por efecto, varias semillas)', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const without = run(undefined, seed).filter((id) => topicOf(id) === 'fis_i').length;
      const withFocus = run(new Set(['FIS']), seed).filter((id) => topicOf(id) === 'fis_i').length;
      expect(withFocus).toBeGreaterThan(without);
    }
  });

  it('un tema DOMINADO de una materia en foco sigue siendo repaso, no débil', () => {
    const picked = run(new Set(['MATE']));
    const mastered = picked.filter((id) => topicOf(id) === 'mate_m').length;
    // targetBucketCounts(20).mastered = 3: el dominado no se infla a 12.
    expect(mastered).toBeLessThanOrEqual(3);
  });

  it('reactivos sin subjectId nunca entran al foco (compatibilidad con pools viejos)', () => {
    const legacy = POOL.map(({ id, topicId }) => ({ id, topicId }));
    const a = selectAdaptiveQuestions({
      questions: legacy,
      topicTier: TIERS,
      excludeQuestionIds: new Set(),
      count: 20,
      rng: seededRng(9),
    });
    const b = selectAdaptiveQuestions({
      questions: legacy,
      topicTier: TIERS,
      excludeQuestionIds: new Set(),
      count: 20,
      rng: seededRng(9),
      focusSubjectIds: new Set(['FIS']),
    });
    expect(b).toEqual(a);
  });

  it('el foco nunca rompe las garantías: sin repetidos, sin excluidos, tamaño exacto', () => {
    const excluded = new Set(POOL.filter((_, i) => i % 3 === 0).map((q) => q.id));
    const picked = selectAdaptiveQuestions({
      questions: POOL,
      topicTier: TIERS,
      excludeQuestionIds: excluded,
      count: 30,
      rng: seededRng(11),
      focusSubjectIds: new Set(['FIS', 'MATE']),
    });
    expect(picked).toHaveLength(30);
    expect(new Set(picked).size).toBe(30);
    expect(picked.some((id) => excluded.has(id))).toBe(false);
  });
});
