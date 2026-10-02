import { describe, expect, it } from 'vitest';
import { dailyGoalProgress, hoursUntilExamAtPace, studyMinutesToday } from '@/lib/study/daily-goal';

// 2026-10-02 18:00 en CDMX = 2026-10-03 00:00 UTC.
const NOW = new Date('2026-10-03T00:00:00Z');
const at = (iso: string) => new Date(iso);

describe('studyMinutesToday (G100)', () => {
  it('suma solo las sesiones terminadas que empezaron hoy en la Ciudad de México', () => {
    const minutes = studyMinutesToday(
      [
        // hoy 10:00-10:25 CDMX
        { startedAt: at('2026-10-02T16:00:00Z'), finishedAt: at('2026-10-02T16:25:00Z'), timeLimitSecs: 3600 },
        // hoy 12:00-12:10 CDMX
        { startedAt: at('2026-10-02T18:00:00Z'), finishedAt: at('2026-10-02T18:10:00Z'), timeLimitSecs: 3600 },
        // AYER 23:00 CDMX (2 oct 05:00 UTC) — no cuenta aunque terminara hoy
        { startedAt: at('2026-10-02T05:00:00Z'), finishedAt: at('2026-10-02T07:00:00Z'), timeLimitSecs: 10800 },
        // sin terminar
        { startedAt: at('2026-10-02T20:00:00Z'), finishedAt: null, timeLimitSecs: 3600 },
      ],
      NOW
    );
    expect(minutes).toBe(35);
  });

  it('acota cada sesión a su límite: una pestaña abierta toda la noche no cumple la meta', () => {
    const minutes = studyMinutesToday(
      [{ startedAt: at('2026-10-02T13:00:00Z'), finishedAt: at('2026-10-02T23:00:00Z'), timeLimitSecs: 1800 }],
      NOW
    );
    expect(minutes).toBe(30);
  });
});

describe('dailyGoalProgress', () => {
  it('porcentaje entero y acotado a 100', () => {
    expect(dailyGoalProgress(10, 20)).toEqual({ minutes: 10, goal: 20, percent: 50, done: false });
    expect(dailyGoalProgress(45, 20)).toMatchObject({ percent: 100, done: true });
    expect(dailyGoalProgress(20, 20).done).toBe(true);
  });
});

describe('hoursUntilExamAtPace', () => {
  it('días restantes × minutos / 60', () => {
    expect(hoursUntilExamAtPace(30, at('2026-10-12T15:00:00Z'), NOW)).toBe(5); // 10 días
  });
  it('null sin fecha o con el examen pasado', () => {
    expect(hoursUntilExamAtPace(30, null, NOW)).toBeNull();
    expect(hoursUntilExamAtPace(30, at('2026-09-01T15:00:00Z'), NOW)).toBeNull();
  });
});
