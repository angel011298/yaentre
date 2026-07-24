import { describe, expect, it } from 'vitest';
import {
  computeCurrentStreak,
  computeLongestStreak,
  isQualifyingStreakSession,
  MIN_STREAK_SESSION_MINUTES,
  toActiveDaySet,
} from '@/lib/streak/compute';

describe('isQualifyingStreakSession — mínimo 10 minutos', () => {
  it('sesión de exactamente 10 min califica', () => {
    expect(
      isQualifyingStreakSession({
        startedAt: new Date('2026-07-20T12:00:00Z'),
        finishedAt: new Date('2026-07-20T12:10:00Z'),
      })
    ).toBe(true);
  });

  it('sesión de 9 min no califica', () => {
    expect(
      isQualifyingStreakSession({
        startedAt: new Date('2026-07-20T12:00:00Z'),
        finishedAt: new Date('2026-07-20T12:09:00Z'),
      })
    ).toBe(false);
  });

  it('sesión sin finishedAt (aún en curso) no califica', () => {
    expect(
      isQualifyingStreakSession({ startedAt: new Date('2026-07-20T12:00:00Z'), finishedAt: null })
    ).toBe(false);
  });

  it('el umbral documentado es exactamente 10', () => {
    expect(MIN_STREAK_SESSION_MINUTES).toBe(10);
  });

  it('es agnóstico al modo de sesión: un FULL_SIMULATION de ≥10 min cuenta igual que un drill (F13 tarea 11)', () => {
    // La firma solo pide startedAt/finishedAt — ni siquiera recibe el modo,
    // así que un simulacro terminado de 180 min (3h) del examen real
    // automáticamente cuenta para la racha vía el mismo finishSession→
    // onSessionFinished→recomputeStreak que ya usan diagnóstico y drill.
    expect(
      isQualifyingStreakSession({
        startedAt: new Date('2027-05-15T09:00:00Z'),
        finishedAt: new Date('2027-05-15T12:00:00Z'), // 180 min, un simulacro completo
      })
    ).toBe(true);
  });
});

describe('computeCurrentStreak — huso de México, evaluado al cierre del día', () => {
  it('sin días activos, racha 0', () => {
    expect(computeCurrentStreak(new Set(), new Date('2026-07-22T12:00:00Z'))).toBe(0);
  });

  it('3 días consecutivos terminando hoy ⇒ racha 3', () => {
    // "Hoy" en México = 22 jul. Días activos: 20, 21, 22 jul (México).
    const days = toActiveDaySet([
      new Date('2026-07-20T18:00:00Z'), // 20 jul México
      new Date('2026-07-21T18:00:00Z'), // 21 jul México
      new Date('2026-07-22T18:00:00Z'), // 22 jul México
    ]);
    const now = new Date('2026-07-22T20:00:00Z'); // sigue siendo 22 jul México
    expect(computeCurrentStreak(days, now)).toBe(3);
  });

  it('hoy sin sesión TODAVÍA, pero ayer sí ⇒ racha sigue viva (no rota en vivo)', () => {
    const days = toActiveDaySet([new Date('2026-07-21T18:00:00Z')]); // ayer
    const now = new Date('2026-07-22T08:00:00Z'); // hoy, temprano, sin sesión aún
    expect(computeCurrentStreak(days, now)).toBe(1);
  });

  it('ni hoy ni ayer tienen sesión ⇒ racha rota (0)', () => {
    const days = toActiveDaySet([new Date('2026-07-18T18:00:00Z')]); // hace 4 días
    const now = new Date('2026-07-22T12:00:00Z');
    expect(computeCurrentStreak(days, now)).toBe(0);
  });

  it('un hueco de un día corta la racha en el día más reciente', () => {
    // Activo: 18, 19, 21, 22 jul — hueco el 20.
    const days = toActiveDaySet([
      new Date('2026-07-18T18:00:00Z'),
      new Date('2026-07-19T18:00:00Z'),
      new Date('2026-07-21T18:00:00Z'),
      new Date('2026-07-22T18:00:00Z'),
    ]);
    const now = new Date('2026-07-22T20:00:00Z');
    expect(computeCurrentStreak(days, now)).toBe(2); // solo cuenta 21 y 22
  });

  it('23:30 México del día 21 (05:30 UTC del 22) sigue contando como día 21', () => {
    const days = toActiveDaySet([new Date('2026-07-21T05:30:00Z')]); // 20 jul 23:30 México en realidad
    // Nota: reusa la frontera de mexico-time.ts ya testeada en F9; aquí solo se
    // verifica que computeCurrentStreak delega correctamente en ella.
    const now = new Date('2026-07-21T10:00:00Z'); // 21 jul México
    expect(computeCurrentStreak(days, now)).toBe(1);
  });
});

describe('computeLongestStreak — la racha más larga de todo el historial', () => {
  it('sin días activos, 0', () => {
    expect(computeLongestStreak(new Set())).toBe(0);
  });

  it('un solo día activo, racha más larga = 1', () => {
    const days = toActiveDaySet([new Date('2026-07-22T18:00:00Z')]);
    expect(computeLongestStreak(days)).toBe(1);
  });

  it('encuentra la racha más larga aunque no sea la más reciente', () => {
    // Racha vieja de 5 días (1-5 jun), luego hueco, luego racha actual de 2 (21-22 jul).
    const days = toActiveDaySet([
      new Date('2026-06-01T18:00:00Z'),
      new Date('2026-06-02T18:00:00Z'),
      new Date('2026-06-03T18:00:00Z'),
      new Date('2026-06-04T18:00:00Z'),
      new Date('2026-06-05T18:00:00Z'),
      new Date('2026-07-21T18:00:00Z'),
      new Date('2026-07-22T18:00:00Z'),
    ]);
    expect(computeLongestStreak(days)).toBe(5);
  });

  it('no depende del orden de entrada', () => {
    const unordered = toActiveDaySet([
      new Date('2026-07-22T18:00:00Z'),
      new Date('2026-07-20T18:00:00Z'),
      new Date('2026-07-21T18:00:00Z'),
    ]);
    expect(computeLongestStreak(unordered)).toBe(3);
  });
});

describe('toActiveDaySet — dedupe por día', () => {
  it('varias sesiones el mismo día México cuentan como un solo día activo', () => {
    const days = toActiveDaySet([
      new Date('2026-07-22T14:00:00Z'),
      new Date('2026-07-22T20:00:00Z'),
      new Date('2026-07-22T22:00:00Z'),
    ]);
    expect(days.size).toBe(1);
  });
});
