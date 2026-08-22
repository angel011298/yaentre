import { describe, expect, it } from 'vitest';
import {
  MIN_SUBJECT_ATTEMPTS,
  PESSIMISTIC_DEFAULT_HIT_RATE,
  effectiveSubjectHitRate,
  predictScore,
  subjectHasSufficientData,
} from '@/lib/adaptive/predictor';
import {
  MASTERED_THRESHOLD,
  MIN_TOPIC_ATTEMPTS,
  WEAK_THRESHOLD,
  aggregateTopicStats,
  classifyTopicTier,
  isWeakTopic,
  selectWeakTopics,
} from '@/lib/adaptive/topic-stats';
import {
  selectAdaptiveQuestions,
  selectRandomFallback,
  targetBucketCounts,
  type SelectableQuestion,
} from '@/lib/adaptive/selector';
import { recommendCareerStrategy, type CareerTarget } from '@/lib/adaptive/career-strategy';
import type { TopicTier } from '@/lib/adaptive/topic-stats';

/**
 * Regresión del motor adaptativo (F19 tarea 4) — casos LÍMITE descubiertos al
 * auditar el código, complementando los tests de comportamiento normal de F6.
 *
 * Por qué importan: el motor decide qué practica el alumno y qué número ve en
 * su Entrómetro. Un error aquí no rompe la app de forma visible — produce
 * silenciosamente una predicción inflada o una ruta de estudio equivocada, que
 * es exactamente el tipo de fallo que cuesta confianza y no se detecta solo.
 */

// ─────────────────────── Predictor: divisiones y fronteras ───────────────────────

describe('predictScore — entradas degeneradas no deben romper ni inventar', () => {
  it('sin materias devuelve 0 aciertos y confianza 0 (no NaN)', () => {
    const r = predictScore({ subjects: [], totalQuestions: 120 });
    expect(r.predictedScore).toBe(0);
    expect(r.confidence).toBe(0);
    expect(Number.isNaN(r.weightedHitRate)).toBe(false);
    expect(r.weightedHitRate).toBe(0);
  });

  it('con todos los pesos en 0 no divide entre cero', () => {
    const r = predictScore({
      subjects: [
        { subjectId: 'a', weight: 0, correct: 10, attempts: 10 },
        { subjectId: 'b', weight: 0, correct: 0, attempts: 10 },
      ],
      totalQuestions: 120,
    });
    expect(Number.isNaN(r.weightedHitRate)).toBe(false);
    expect(r.predictedScore).toBe(0);
    // Ambas materias SÍ tienen datos suficientes, aunque no pesen.
    expect(r.confidence).toBe(1);
  });

  it('con totalQuestions 0 la predicción es 0, no NaN', () => {
    const r = predictScore({
      subjects: [{ subjectId: 'a', weight: 26, correct: 20, attempts: 20 }],
      totalQuestions: 0,
    });
    expect(r.predictedScore).toBe(0);
  });

  it('un alumno perfecto nunca predice MÁS aciertos que reactivos del examen', () => {
    const r = predictScore({
      subjects: [{ subjectId: 'a', weight: 26, correct: 50, attempts: 50 }],
      totalQuestions: 120,
    });
    expect(r.predictedScore).toBeLessThanOrEqual(120);
    expect(r.predictedScore).toBe(120);
  });
});

describe('effectiveSubjectHitRate — la regla pesimista no se puede burlar', () => {
  it(`en la frontera exacta de ${MIN_SUBJECT_ATTEMPTS} intentos ya usa la tasa observada`, () => {
    expect(subjectHasSufficientData(MIN_SUBJECT_ATTEMPTS)).toBe(true);
    expect(subjectHasSufficientData(MIN_SUBJECT_ATTEMPTS - 1)).toBe(false);
    expect(
      effectiveSubjectHitRate({
        subjectId: 'a',
        weight: 10,
        correct: MIN_SUBJECT_ATTEMPTS,
        attempts: MIN_SUBJECT_ATTEMPTS,
      })
    ).toBe(1);
  });

  it('REGRESIÓN: acertar 4 de 4 NO infla la predicción (muestra insuficiente ⇒ 0.30)', () => {
    // Sin esta regla, un alumno que responde 4 reactivos fáciles vería un
    // Entrómetro optimista y falso — el fallo de confianza más caro posible.
    const rate = effectiveSubjectHitRate({ subjectId: 'a', weight: 26, correct: 4, attempts: 4 });
    expect(rate).toBe(PESSIMISTIC_DEFAULT_HIT_RATE);
  });

  it('una materia intacta (0 intentos) también entra como 0.30, no como 0', () => {
    expect(effectiveSubjectHitRate({ subjectId: 'a', weight: 26, correct: 0, attempts: 0 })).toBe(
      PESSIMISTIC_DEFAULT_HIT_RATE
    );
  });

  it('materias sin tocar arrastran la predicción hacia abajo, nunca hacia arriba', () => {
    const soloUna = predictScore({
      subjects: [{ subjectId: 'a', weight: 26, correct: 26, attempts: 26 }],
      totalQuestions: 120,
    });
    const conMateriaIntacta = predictScore({
      subjects: [
        { subjectId: 'a', weight: 26, correct: 26, attempts: 26 },
        { subjectId: 'b', weight: 16, correct: 0, attempts: 0 },
      ],
      totalQuestions: 120,
    });
    expect(conMateriaIntacta.predictedScore).toBeLessThan(soloUna.predictedScore);
    expect(conMateriaIntacta.confidence).toBeLessThan(soloUna.confidence);
  });
});

// ─────────────────────── Clasificación de temas: fronteras ───────────────────────

describe('classifyTopicTier — fronteras exactas de los umbrales', () => {
  it(`hitRate exactamente ${WEAK_THRESHOLD} NO es débil (el umbral es estrictamente menor)`, () => {
    expect(classifyTopicTier(WEAK_THRESHOLD, 10)).toBe('intermediate');
    expect(isWeakTopic(WEAK_THRESHOLD, 10)).toBe(false);
    expect(classifyTopicTier(WEAK_THRESHOLD - 0.001, 10)).toBe('weak');
  });

  it(`hitRate exactamente ${MASTERED_THRESHOLD} NO es dominado (requiere superarlo)`, () => {
    expect(classifyTopicTier(MASTERED_THRESHOLD, 10)).toBe('intermediate');
    expect(classifyTopicTier(MASTERED_THRESHOLD + 0.001, 10)).toBe('mastered');
  });

  it(`con menos de ${MIN_TOPIC_ATTEMPTS} intentos nunca se clasifica, ni siquiera con 0%`, () => {
    expect(classifyTopicTier(0, MIN_TOPIC_ATTEMPTS - 1)).toBe('insufficient');
    expect(isWeakTopic(0, MIN_TOPIC_ATTEMPTS - 1)).toBe(false);
    // En la frontera exacta ya sí clasifica.
    expect(classifyTopicTier(0, MIN_TOPIC_ATTEMPTS)).toBe('weak');
  });
});

describe('aggregateTopicStats — agregación exacta sin arrastre de flotantes', () => {
  it('cuenta intentos y aciertos enteros por tema', () => {
    const stats = aggregateTopicStats([
      { topicId: 't1', isCorrect: true },
      { topicId: 't1', isCorrect: false },
      { topicId: 't1', isCorrect: true },
      { topicId: 't2', isCorrect: false },
    ]);
    expect(stats.get('t1')).toMatchObject({ attempts: 3, correct: 2 });
    expect(stats.get('t2')).toMatchObject({ attempts: 1, correct: 0, hitRate: 0 });
  });

  it('sin respuestas devuelve un mapa vacío (no explota)', () => {
    expect(aggregateTopicStats([]).size).toBe(0);
    expect(selectWeakTopics([])).toEqual([]);
  });

  it('un tema con 3 fallos seguidos sí califica como débil', () => {
    const stats = aggregateTopicStats([
      { topicId: 't1', isCorrect: false },
      { topicId: 't1', isCorrect: false },
      { topicId: 't1', isCorrect: false },
    ]);
    expect(selectWeakTopics(stats.values()).map((s) => s.topicId)).toEqual(['t1']);
  });
});

// ─────────────────────── Selector: invariantes duras ───────────────────────

describe('targetBucketCounts — el reparto SIEMPRE suma exactamente lo pedido', () => {
  it('para todo count de 1 a 200 no se pierde ni se inventa un reactivo', () => {
    for (let count = 1; count <= 200; count++) {
      const { weak, intermediate, mastered } = targetBucketCounts(count);
      expect(
        weak + intermediate + mastered,
        `el reparto de ${count} dio ${weak}+${intermediate}+${mastered}`
      ).toBe(count);
      expect(weak).toBeGreaterThanOrEqual(0);
      expect(intermediate).toBeGreaterThanOrEqual(0);
      expect(mastered).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('selectAdaptiveQuestions — invariantes que no pueden romperse', () => {
  const rng = () => 0.5; // determinista

  function pool(n: number, topicId = 't1'): SelectableQuestion[] {
    return Array.from({ length: n }, (_, i) => ({ id: `q${i}`, topicId }));
  }

  const tiers = (entries: Array<[string, TopicTier]>) => new Map<string, TopicTier>(entries);

  it('NUNCA devuelve un reactivo excluido por la ventana de 72h', () => {
    const questions = pool(10);
    const excluded = new Set(['q0', 'q1', 'q2']);
    const result = selectAdaptiveQuestions({
      questions,
      topicTier: tiers([['t1', 'weak']]),
      excludeQuestionIds: excluded,
      count: 10,
      rng,
    });
    expect(result.some((id) => excluded.has(id))).toBe(false);
    expect(result).toHaveLength(7); // solo quedaban 7 disponibles
  });

  it('NUNCA repite el mismo reactivo dentro de una selección', () => {
    const questions = [
      ...pool(5, 'weak-topic'),
      ...pool(5, 'mastered-topic').map((q) => ({ ...q, id: `m${q.id}` })),
    ];
    const result = selectAdaptiveQuestions({
      questions,
      topicTier: tiers([
        ['weak-topic', 'weak'],
        ['mastered-topic', 'mastered'],
      ]),
      excludeQuestionIds: new Set(),
      count: 10,
      rng,
    });
    expect(new Set(result).size).toBe(result.length);
  });

  it('con un pool más chico que lo pedido devuelve todo lo disponible, sin rellenar de aire', () => {
    const result = selectAdaptiveQuestions({
      questions: pool(3),
      topicTier: tiers([['t1', 'weak']]),
      excludeQuestionIds: new Set(),
      count: 10,
      rng,
    });
    expect(result).toHaveLength(3);
  });

  it('count 0 o negativo devuelve vacío sin tocar el pool', () => {
    const args = {
      questions: pool(10),
      topicTier: tiers([['t1', 'weak']] as Array<[string, TopicTier]>),
      excludeQuestionIds: new Set<string>(),
      rng,
    };
    expect(selectAdaptiveQuestions({ ...args, count: 0 })).toEqual([]);
    expect(selectAdaptiveQuestions({ ...args, count: -5 })).toEqual([]);
  });

  it('si TODO el pool está excluido, devuelve vacío en vez de repetir lo ya visto', () => {
    const questions = pool(4);
    const result = selectAdaptiveQuestions({
      questions,
      topicTier: tiers([['t1', 'weak']]),
      excludeQuestionIds: new Set(questions.map((q) => q.id)),
      count: 10,
      rng,
    });
    expect(result).toEqual([]);
  });

  it('un tema sin clasificar se practica como intermedio, no se descarta', () => {
    const result = selectAdaptiveQuestions({
      questions: pool(5, 'tema-nuevo'),
      topicTier: tiers([]), // sin entrada ⇒ 'insufficient' ⇒ cubeta intermedia
      excludeQuestionIds: new Set(),
      count: 5,
      rng,
    });
    expect(result).toHaveLength(5);
  });

  it('rellena desde otras cubetas cuando la de débiles no alcanza', () => {
    // 1 débil + 9 dominados, se piden 10: debe entregar los 10, no solo 1.
    const questions = [
      { id: 'w0', topicId: 'weak-topic' },
      ...Array.from({ length: 9 }, (_, i) => ({ id: `m${i}`, topicId: 'mastered-topic' })),
    ];
    const result = selectAdaptiveQuestions({
      questions,
      topicTier: tiers([
        ['weak-topic', 'weak'],
        ['mastered-topic', 'mastered'],
      ]),
      excludeQuestionIds: new Set(),
      count: 10,
      rng,
    });
    expect(result).toHaveLength(10);
    expect(result).toContain('w0');
  });
});

describe('selectRandomFallback — el respaldo mantiene las mismas garantías', () => {
  it('respeta las exclusiones y el tope pedido', () => {
    const questions = Array.from({ length: 10 }, (_, i) => ({ id: `q${i}`, topicId: 't' }));
    const excluded = new Set(['q0', 'q1']);
    const result = selectRandomFallback(questions, excluded, 5, () => 0.5);
    expect(result).toHaveLength(5);
    expect(result.some((id) => excluded.has(id))).toBe(false);
    expect(new Set(result).size).toBe(5);
  });

  it('count 0 devuelve vacío', () => {
    expect(selectRandomFallback([{ id: 'q', topicId: 't' }], new Set(), 0)).toEqual([]);
  });
});

// ─────────────────────── Estrategia de carrera: fronteras ───────────────────────

describe('recommendCareerStrategy — fronteras de la meta', () => {
  const career = (id: string, minAciertos: number | null): CareerTarget => ({
    careerId: id,
    name: `Carrera ${id}`,
    minAciertos,
    minAciertosYear: 2026,
    minAciertosConfidence: 'HIGH',
  });

  it('predicción EXACTAMENTE igual a la meta cuenta como encaminado (gap 0)', () => {
    const r = recommendCareerStrategy({
      predictedScore: 101,
      chosenCareer: career('elegida', 101),
      areaCareers: [career('elegida', 101), career('otra', 88)],
    });
    expect(r.onTrack).toBe(true);
    expect(r.gap).toBe(0);
    // Yendo bien, no se ofrecen alternativas (serían ruido desmotivador).
    expect(r.alternatives).toEqual([]);
  });

  it('un acierto por debajo ya NO va encaminado y ofrece plan B', () => {
    const r = recommendCareerStrategy({
      predictedScore: 100,
      chosenCareer: career('elegida', 101),
      areaCareers: [career('elegida', 101), career('b', 97), career('c', 88)],
    });
    expect(r.onTrack).toBe(false);
    expect(r.gap).toBe(1);
    // De mayor a menor exigencia: la más ambiciosa alcanzable primero.
    expect(r.alternatives.map((a) => a.careerId)).toEqual(['b', 'c']);
  });

  it('una carrera sin meta conocida no inventa un gap', () => {
    const r = recommendCareerStrategy({
      predictedScore: 90,
      chosenCareer: career('sin-dato', null),
      areaCareers: [career('sin-dato', null), career('b', 80)],
    });
    expect(r.hasTarget).toBe(false);
    expect(r.gap).toBeNull();
    expect(r.onTrack).toBe(false);
    // Sin meta propia sí se sugieren alternativas medibles.
    expect(r.alternatives.map((a) => a.careerId)).toEqual(['b']);
  });

  it('nunca se sugiere a sí misma ni una carrera fuera de alcance', () => {
    const r = recommendCareerStrategy({
      predictedScore: 90,
      chosenCareer: career('elegida', 120),
      areaCareers: [career('elegida', 120), career('inalcanzable', 110), career('alcanzable', 85)],
    });
    expect(r.alternatives.map((a) => a.careerId)).toEqual(['alcanzable']);
  });

  it('como máximo 3 alternativas aunque haya muchas alcanzables', () => {
    const r = recommendCareerStrategy({
      predictedScore: 100,
      chosenCareer: career('elegida', 120),
      areaCareers: [
        career('elegida', 120),
        career('a', 99),
        career('b', 98),
        career('c', 97),
        career('d', 96),
        career('e', 95),
      ],
    });
    expect(r.alternatives).toHaveLength(3);
    expect(r.alternatives.map((a) => a.careerId)).toEqual(['a', 'b', 'c']);
  });

  it('las alternativas sin dato de meta nunca se cuelan como alcanzables', () => {
    const r = recommendCareerStrategy({
      predictedScore: 100,
      chosenCareer: career('elegida', 120),
      areaCareers: [career('elegida', 120), career('sin-dato', null), career('ok', 90)],
    });
    expect(r.alternatives.map((a) => a.careerId)).toEqual(['ok']);
  });
});
