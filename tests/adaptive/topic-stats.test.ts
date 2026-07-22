import { describe, expect, it } from 'vitest';
import {
  aggregateTopicStats,
  classifyTopicTier,
  isWeakTopic,
  MASTERED_THRESHOLD,
  MIN_TOPIC_ATTEMPTS,
  selectWeakTopics,
  WEAK_THRESHOLD,
  type AnsweredQuestion,
} from '@/lib/adaptive/topic-stats';

describe('aggregateTopicStats — acumulación a lo largo del tiempo', () => {
  it('acumula intentos y aciertos de TODAS las respuestas, no solo la última sesión', () => {
    const answers: AnsweredQuestion[] = [
      { topicId: 't1', isCorrect: true },
      { topicId: 't1', isCorrect: false },
      { topicId: 't1', isCorrect: true },
      { topicId: 't2', isCorrect: false },
    ];
    const stats = aggregateTopicStats(answers);

    expect(stats.get('t1')).toMatchObject({ attempts: 3, correct: 2 });
    expect(stats.get('t1')!.hitRate).toBeCloseTo(2 / 3, 10);
    expect(stats.get('t2')).toMatchObject({ attempts: 1, correct: 0, hitRate: 0 });
  });

  it('sin respuestas ⇒ mapa vacío', () => {
    expect(aggregateTopicStats([]).size).toBe(0);
  });
});

describe('isWeakTopic — umbral 0.60 y mínimo de intentos', () => {
  it(`no marca débil con menos de ${MIN_TOPIC_ATTEMPTS} intentos, aunque falle todo`, () => {
    // 0/2 = 0% de acierto, pero solo 2 intentos ⇒ muestra insuficiente
    expect(isWeakTopic(0, 2)).toBe(false);
  });

  it('marca débil con hitRate < 0.60 y ≥ 3 intentos', () => {
    expect(isWeakTopic(0.5, 3)).toBe(true);
    expect(isWeakTopic(0.59, 10)).toBe(true);
  });

  it('exactamente 0.60 NO es débil (frontera estricta <)', () => {
    expect(isWeakTopic(WEAK_THRESHOLD, 10)).toBe(false);
  });
});

describe('classifyTopicTier — fronteras de los tiers', () => {
  it(`< ${MIN_TOPIC_ATTEMPTS} intentos ⇒ insufficient`, () => {
    expect(classifyTopicTier(0.4, 2)).toBe('insufficient');
    expect(classifyTopicTier(0.95, 1)).toBe('insufficient');
  });

  it('< 0.60 ⇒ weak; [0.60, 0.85] ⇒ intermediate; > 0.85 ⇒ mastered', () => {
    expect(classifyTopicTier(0.59, 5)).toBe('weak');
    expect(classifyTopicTier(WEAK_THRESHOLD, 5)).toBe('intermediate'); // 0.60 inclusivo
    expect(classifyTopicTier(0.75, 5)).toBe('intermediate');
    expect(classifyTopicTier(MASTERED_THRESHOLD, 5)).toBe('intermediate'); // 0.85 inclusivo
    expect(classifyTopicTier(0.86, 5)).toBe('mastered');
    expect(classifyTopicTier(1, 5)).toBe('mastered');
  });
});

describe('selectWeakTopics', () => {
  it('filtra solo los temas que cumplen la regla de debilidad', () => {
    const stats = aggregateTopicStats([
      // t_weak: 1/4 = 0.25, 4 intentos ⇒ débil
      ...Array(4).fill(null).map((_, i) => ({ topicId: 't_weak', isCorrect: i === 0 })),
      // t_ok: 9/10 = 0.90 ⇒ dominado, no débil
      ...Array(10).fill(null).map((_, i) => ({ topicId: 't_ok', isCorrect: i !== 0 })),
      // t_small: 0/2 ⇒ insuficiente, no débil
      { topicId: 't_small', isCorrect: false },
      { topicId: 't_small', isCorrect: false },
    ]);

    const weak = selectWeakTopics(stats.values()).map((s) => s.topicId);
    expect(weak).toEqual(['t_weak']);
  });
});
