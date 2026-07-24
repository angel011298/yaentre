import { describe, expect, it } from 'vitest';
import { hashSeed, orderQuestionOptions, seededShuffle } from '@/lib/simulator/shuffle';

const options = [
  { id: 'A', text: 'uno' },
  { id: 'B', text: 'dos' },
  { id: 'C', text: 'tres' },
  { id: 'D', text: 'cuatro' },
];

describe('seededShuffle', () => {
  it('es determinista: misma semilla ⇒ misma permutación', () => {
    const seed = hashSeed('sess:q1');
    expect(seededShuffle(options, seed)).toEqual(seededShuffle(options, seed));
  });

  it('semillas distintas suelen dar órdenes distintos', () => {
    const a = seededShuffle(options, hashSeed('sess:q1'));
    const b = seededShuffle(options, hashSeed('sess:q2'));
    // No garantiza SIEMPRE diferente, pero con 4! permutaciones y semillas
    // distintas es prácticamente seguro aquí.
    expect(a).not.toEqual(b);
  });

  it('es una permutación (conserva todos los elementos, no muta la entrada)', () => {
    const original = [...options];
    const shuffled = seededShuffle(options, 12345);
    expect(shuffled).toHaveLength(options.length);
    expect(new Set(shuffled.map((o) => o.id))).toEqual(new Set(['A', 'B', 'C', 'D']));
    expect(options).toEqual(original);
  });
});

describe('orderQuestionOptions', () => {
  it('deshabilitado (IPN): conserva el orden original', () => {
    const result = orderQuestionOptions(options, {
      enabled: false,
      sessionId: 's1',
      questionId: 'q1',
    });
    expect(result).toEqual(options);
  });

  it('habilitado (UNAM): estable para el mismo par sesión+reactivo (reanudar)', () => {
    const params = { enabled: true, sessionId: 's1', questionId: 'q1' } as const;
    expect(orderQuestionOptions(options, params)).toEqual(orderQuestionOptions(options, params));
  });

  it('habilitado: conserva los ids (barajar no pierde ni inventa opciones)', () => {
    const result = orderQuestionOptions(options, {
      enabled: true,
      sessionId: 's1',
      questionId: 'q1',
    });
    expect(new Set(result.map((o) => o.id))).toEqual(new Set(['A', 'B', 'C', 'D']));
  });
});
