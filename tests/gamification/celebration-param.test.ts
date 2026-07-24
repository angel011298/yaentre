import { describe, expect, it } from 'vitest';
import {
  decodeCelebrationParam,
  encodeCelebrationParam,
  type Celebration,
} from '@/lib/gamification/celebrations';

describe('encodeCelebrationParam / decodeCelebrationParam', () => {
  it('perfectRound hace round-trip', () => {
    const c: Celebration = { kind: 'perfectRound' };
    expect(decodeCelebrationParam(encodeCelebrationParam(c))).toEqual(c);
  });

  it('streakMilestone hace round-trip para 7, 14 y 30', () => {
    for (const days of [7, 14, 30] as const) {
      const c: Celebration = { kind: 'streakMilestone', days };
      expect(decodeCelebrationParam(encodeCelebrationParam(c))).toEqual(c);
    }
  });

  it('materiaDominada hace round-trip, incluyendo nombres con espacios/acentos', () => {
    const c: Celebration = { kind: 'materiaDominada', subjectId: 'subj_123', subjectName: 'Matemáticas' };
    expect(decodeCelebrationParam(encodeCelebrationParam(c))).toEqual(c);
  });

  it('materiaDominada con nombre que contiene ":" no rompe el parseo', () => {
    const c: Celebration = { kind: 'materiaDominada', subjectId: 'subj_1', subjectName: 'Física: mecánica' };
    expect(decodeCelebrationParam(encodeCelebrationParam(c))).toEqual(c);
  });

  it('decodeCelebrationParam(null/undefined/"") devuelve null', () => {
    expect(decodeCelebrationParam(null)).toBeNull();
    expect(decodeCelebrationParam(undefined)).toBeNull();
    expect(decodeCelebrationParam('')).toBeNull();
  });

  it('decodeCelebrationParam ignora basura no reconocida', () => {
    expect(decodeCelebrationParam('algoInventado')).toBeNull();
    expect(decodeCelebrationParam('streakMilestone:99')).toBeNull();
  });
});
