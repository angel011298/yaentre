import { describe, it, expect } from 'vitest';
import { planReplacements, poolCoverage, type QuestionRef } from '../../scripts/g100/plan';

const q = (id: string, topicId: string, format = 'MULTIPLE_CHOICE', difficulty = 'BASIC'): QuestionRef => ({
  id,
  topicId,
  format,
  difficulty,
});

describe('planReplacements (regla de oro de G100)', () => {
  it('sin reemplazos NO se despublica nada: todo queda pendiente', () => {
    const plan = planReplacements([q('a1', 't1'), q('a2', 't1')], []);
    expect(plan.pairs).toEqual([]);
    expect(plan.pending.map((p) => p.id)).toEqual(['a1', 'a2']);
  });

  it('cada reemplazo cubre UN solo anclado: con 1 reemplazo y 2 anclados, uno queda pendiente', () => {
    const plan = planReplacements([q('a1', 't1'), q('a2', 't1')], [q('r1', 't1')]);
    expect(plan.pairs).toHaveLength(1);
    expect(plan.pending).toHaveLength(1);
    const used = plan.pairs.map((p) => p.replacementId);
    expect(new Set(used).size).toBe(used.length);
  });

  it('un reemplazo de OTRO tema no cubre un anclado (sirve a otro pool/áreas)', () => {
    const plan = planReplacements([q('a1', 't1')], [q('r1', 't2')]);
    expect(plan.pairs).toEqual([]);
    expect(plan.pending).toHaveLength(1);
  });

  it('prefiere mismo formato y dificultad, y luego mismo formato', () => {
    const anchored = [q('a1', 't1', 'READING_COMPREHENSION', 'ADVANCED')];
    const reps = [
      q('r1', 't1', 'MULTIPLE_CHOICE', 'ADVANCED'),
      q('r2', 't1', 'READING_COMPREHENSION', 'BASIC'),
      q('r3', 't1', 'READING_COMPREHENSION', 'ADVANCED'),
    ];
    expect(planReplacements(anchored, reps).pairs[0].replacementId).toBe('r3');
    expect(planReplacements(anchored, reps.slice(0, 2)).pairs[0].replacementId).toBe('r2');
  });

  it('es determinista y nunca empareja más anclados que reemplazos (barrido combinatorio)', () => {
    const mismatches: string[] = [];
    for (let nA = 0; nA <= 5; nA++) {
      for (let nR = 0; nR <= 5; nR++) {
        const anchored = Array.from({ length: nA }, (_, i) => q(`a${i}`, 't1', i % 2 ? 'READING_COMPREHENSION' : 'MULTIPLE_CHOICE'));
        const reps = Array.from({ length: nR }, (_, i) => q(`r${i}`, 't1', i % 3 ? 'MULTIPLE_CHOICE' : 'READING_COMPREHENSION'));
        const plan = planReplacements(anchored, reps);
        if (plan.pairs.length !== Math.min(nA, nR)) mismatches.push(`${nA}/${nR}: ${plan.pairs.length}`);
        if (plan.pairs.length + plan.pending.length !== nA) mismatches.push(`${nA}/${nR}: no cuadra`);
        if (JSON.stringify(plan) !== JSON.stringify(planReplacements(anchored, reps))) mismatches.push(`${nA}/${nR}: no determinista`);
      }
    }
    expect(mismatches).toEqual([]);
  });
});

describe('poolCoverage (≥ 90 % del tamaño original tras despublicar)', () => {
  const cov = (servable: number, unpublished: number, replacements: number) =>
    poolCoverage(new Map([['p', servable]]), new Map([['p', unpublished]]), new Map([['p', replacements]]))[0];

  it('un reemplazo uno-a-uno devuelve el pool a su tamaño original: 68 servibles, 28 nuevos, 28 despublicados', () => {
    const c = cov(68, 28, 28);
    expect(c.baseline).toBe(40);
    expect(c.after).toBe(40);
    expect(c.ratio).toBe(1);
    expect(c.ok).toBe(true);
  });

  it('despublicar SIN reemplazos baja el pool y el guard se pone rojo (el rojo es alcanzable)', () => {
    const c = cov(40, 28, 0);
    expect(c.after).toBe(12);
    expect(c.ok).toBe(false);
  });

  it('el umbral es exactamente 90 %', () => {
    expect(cov(100, 10, 0).ok).toBe(true);
    expect(cov(100, 11, 0).ok).toBe(false);
  });
});
