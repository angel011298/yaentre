import { describe, expect, it } from 'vitest';
import { computePercentileRank, MIN_PERCENTILE_SAMPLE } from '@/lib/simulator/percentile';

describe('computePercentileRank', () => {
  it('oculta con elegancia (null) cuando la muestra es menor al mínimo', () => {
    const otherScores = Array.from({ length: MIN_PERCENTILE_SAMPLE - 1 }, () => 50);
    expect(computePercentileRank(80, otherScores)).toBeNull();
  });

  it('null con muestra vacía (alumno recién estrenando el examen)', () => {
    expect(computePercentileRank(100, [])).toBeNull();
  });

  it('calcula el percentil en el umbral mínimo exacto de muestra', () => {
    const otherScores = [10, 20, 30, 40, 50]; // exactamente MIN_PERCENTILE_SAMPLE
    // le gana a 4 de 5 (todos menos el empate en 50) → 80%
    expect(computePercentileRank(50, otherScores)).toBe(80);
  });

  it('0% si nadie tiene un score menor', () => {
    expect(computePercentileRank(10, [50, 60, 70, 80, 90])).toBe(0);
  });

  it('100% si le gana a todos', () => {
    expect(computePercentileRank(120, [50, 60, 70, 80, 90])).toBe(100);
  });

  it('un empate no cuenta como "le ganó" (comparación estricta)', () => {
    expect(computePercentileRank(50, [50, 50, 50, 50, 50])).toBe(0);
  });

  it('redondea al entero más cercano', () => {
    // le gana a 1 de 3... pero necesita mínimo 5, así que probamos con 6
    const otherScores = [10, 20, 30, 40, 50, 60];
    // score=35 le gana a [10,20,30] = 3/6 = 50%
    expect(computePercentileRank(35, otherScores)).toBe(50);
  });
});
