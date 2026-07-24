import { describe, expect, it } from 'vitest';
import {
  isStreakAtRisk,
  newlyReachedStreakMilestone,
  STREAK_MILESTONES,
} from '@/lib/gamification/streak-signals';

describe('newlyReachedStreakMilestone', () => {
  it('los milestones son exactamente 7, 14, 30', () => {
    expect(STREAK_MILESTONES).toEqual([7, 14, 30]);
  });

  it('null si no se cruzó ningún milestone', () => {
    expect(newlyReachedStreakMilestone(3, 4)).toBeNull();
  });

  it('detecta cruzar 7 exactamente (6→7)', () => {
    expect(newlyReachedStreakMilestone(6, 7)).toBe(7);
  });

  it('null si la racha YA venía pasado el milestone (no es "recién" cruzado)', () => {
    expect(newlyReachedStreakMilestone(8, 9)).toBeNull();
  });

  it('detecta cruzar 14 exactamente (13→14)', () => {
    expect(newlyReachedStreakMilestone(13, 14)).toBe(14);
  });

  it('detecta cruzar 30 exactamente (29→30)', () => {
    expect(newlyReachedStreakMilestone(29, 30)).toBe(30);
  });

  it('si de algún salto raro se cruzan varios a la vez, devuelve el MAYOR', () => {
    // p. ej. una racha recalculada de golpe que salta de 5 a 15 (cruza 7 y 14)
    expect(newlyReachedStreakMilestone(5, 15)).toBe(14);
  });

  it('racha que se rompe (baja) nunca cuenta como "recién alcanzado"', () => {
    expect(newlyReachedStreakMilestone(10, 1)).toBeNull();
  });
});

describe('isStreakAtRisk', () => {
  const today = new Date('2027-05-15T18:00:00.000Z'); // ~mediodía México

  it('false sin racha activa', () => {
    expect(isStreakAtRisk(0, new Date('2027-05-14T12:00:00Z'), today)).toBe(false);
  });

  it('false sin lastActivityDate', () => {
    expect(isStreakAtRisk(5, null, today)).toBe(false);
  });

  it('true cuando la última actividad fue un día México anterior al de hoy', () => {
    // día México anterior real (medianoche México del 14 = 06:00 UTC del 14)
    expect(isStreakAtRisk(5, new Date('2027-05-14T06:00:00.000Z'), today)).toBe(true);
  });

  it('false si ya hubo actividad calificante HOY (mismo día México)', () => {
    expect(isStreakAtRisk(5, new Date('2027-05-15T06:00:00.000Z'), today)).toBe(false);
  });

  it('estudiar 23:30 hora México (05:30 UTC del día siguiente) sigue contando como el día anterior — no dispara riesgo si hoy no ha comenzado', () => {
    // 2027-05-14 23:30 México = 2027-05-15 05:30 UTC. `startOfMexicoDay` debe
    // bucketear esto al día México 14, consistente con F11/F9.
    const lateNightMexico = new Date('2027-05-15T05:30:00.000Z');
    // "now" apenas entrando al día México 15 (00:05 México = 06:05 UTC)
    const justAfterMidnight = new Date('2027-05-15T06:05:00.000Z');
    expect(isStreakAtRisk(3, lateNightMexico, justAfterMidnight)).toBe(true);
  });
});
