import { startOfMexicoDay } from '@/lib/paywall/mexico-time';

/**
 * Motor de racha (F11): días calendario consecutivos, en huso de México, con
 * ≥1 sesión de estudio calificante. Módulo PURO — reusa `startOfMexicoDay`
 * (F9) para la misma frontera de "día" que ya usa el límite diario de drill,
 * en vez de reinventar el cálculo de zona horaria.
 *
 * Regla (PRD Data Dictionary / F-08): una sesión califica si duró ≥10 min.
 * "Racha actual" cuenta días consecutivos terminando HOY o AYER — si el
 * último día activo es más viejo que ayer, la racha está rota (0), pero un
 * día sin actividad TODAVÍA no la rompe si sigue siendo "hoy" (el día no ha
 * terminado): la racha se evalúa al cierre del día calendario, no en vivo.
 */

const ONE_DAY_MS = 24 * 3600 * 1000;

/** Duración mínima, en minutos, para que una sesión cuente para la racha. */
export const MIN_STREAK_SESSION_MINUTES = 10;

export function isQualifyingStreakSession(input: {
  startedAt: Date;
  finishedAt: Date | null;
}): boolean {
  if (!input.finishedAt) return false;
  const minutes = (input.finishedAt.getTime() - input.startedAt.getTime()) / 60000;
  return minutes >= MIN_STREAK_SESSION_MINUTES;
}

/** Convierte fechas de sesiones calificantes a un set de instantes de
 *  "medianoche México" únicos — uno por día con actividad. */
export function toActiveDaySet(sessionDates: Date[]): Set<number> {
  return new Set(sessionDates.map((d) => startOfMexicoDay(d).getTime()));
}

export function computeCurrentStreak(activeDays: Set<number>, now: Date): number {
  if (activeDays.size === 0) return 0;

  let cursor = startOfMexicoDay(now).getTime();
  if (!activeDays.has(cursor)) {
    cursor -= ONE_DAY_MS; // hoy sin sesión todavía: prueba si la racha sigue viva desde ayer
    if (!activeDays.has(cursor)) return 0;
  }

  let streak = 0;
  while (activeDays.has(cursor)) {
    streak++;
    cursor -= ONE_DAY_MS;
  }
  return streak;
}

/** Racha más larga en TODO el historial, no solo la que sigue activa hoy. */
export function computeLongestStreak(activeDays: Set<number>): number {
  if (activeDays.size === 0) return 0;

  const sorted = [...activeDays].sort((a, b) => a - b);
  let longest = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] === ONE_DAY_MS) {
      current++;
    } else {
      current = 1;
    }
    longest = Math.max(longest, current);
  }
  return longest;
}
