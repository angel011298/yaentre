import { describe, expect, it } from 'vitest';
import { selectCelebration } from '@/lib/gamification/celebrations';

describe('selectCelebration', () => {
  it('null si ningún candidato califica', () => {
    expect(
      selectCelebration({ masteredSubjects: [], perfectRound: false, streakMilestone: null })
    ).toBeNull();
  });

  it('materia dominada gana sobre ronda perfecta y racha simultáneas', () => {
    const result = selectCelebration({
      masteredSubjects: [{ subjectId: 's1', subjectName: 'Matemáticas' }],
      perfectRound: true,
      streakMilestone: 7,
    });
    expect(result).toEqual({ kind: 'materiaDominada', subjectId: 's1', subjectName: 'Matemáticas' });
  });

  it('ronda perfecta gana sobre racha cuando no hay materia dominada', () => {
    const result = selectCelebration({
      masteredSubjects: [],
      perfectRound: true,
      streakMilestone: 30,
    });
    expect(result).toEqual({ kind: 'perfectRound' });
  });

  it('racha se dispara solo cuando no compite con materia dominada ni ronda perfecta', () => {
    const result = selectCelebration({
      masteredSubjects: [],
      perfectRound: false,
      streakMilestone: 14,
    });
    expect(result).toEqual({ kind: 'streakMilestone', days: 14 });
  });

  it('con varias materias dominadas a la vez, toma la primera de la lista (una sola celebración grande)', () => {
    const result = selectCelebration({
      masteredSubjects: [
        { subjectId: 's1', subjectName: 'Matemáticas' },
        { subjectId: 's2', subjectName: 'Español' },
      ],
      perfectRound: true,
      streakMilestone: 7,
    });
    expect(result).toEqual({ kind: 'materiaDominada', subjectId: 's1', subjectName: 'Matemáticas' });
  });

  it('nunca devuelve más de una celebración a la vez (siempre resultado único o null)', () => {
    const result = selectCelebration({
      masteredSubjects: [{ subjectId: 's1', subjectName: 'Física' }],
      perfectRound: true,
      streakMilestone: 30,
    });
    expect(Object.keys(result ?? {})).not.toContain('perfectRound');
    expect(result?.kind).toBe('materiaDominada');
  });
});
