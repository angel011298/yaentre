import { startOfMexicoDay } from '@/lib/paywall/mexico-time';

/**
 * Señales de racha para gamificación (F15 tarea 1 y 2). Módulo PURO. Las
 * reglas de CUÁNDO suma un día ya viven en `src/lib/streak/compute.ts` (F11:
 * `isQualifyingStreakSession` — ≥10 min, huso de México vía `startOfMexicoDay`,
 * así que estudiar 23:00-23:59 México ya cuenta para ESE día calendario). Este
 * módulo añade dos señales derivadas que F11 no necesitaba: milestones (7/14/30)
 * y "racha en riesgo".
 */

export const STREAK_MILESTONES = [7, 14, 30] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

/**
 * ¿La racha ACTUAL acaba de cruzar un milestone que la ANTERIOR (antes de esta
 * sesión) no había alcanzado? Devuelve el milestone más alto recién cruzado
 * (si de algún modo se saltara varios a la vez, prioriza el mayor — más
 * impresionante, y es el único que tiene sentido celebrar).
 */
export function newlyReachedStreakMilestone(
  previousStreak: number,
  currentStreak: number
): StreakMilestone | null {
  const crossed = STREAK_MILESTONES.filter((m) => currentStreak >= m && previousStreak < m);
  if (crossed.length === 0) return null;
  return crossed[crossed.length - 1];
}

/**
 * "Racha en riesgo" (F15 tarea 4 — microcopy dedicado): hay una racha activa
 * (> 0), pero el último día con actividad calificante es ANTERIOR al día de
 * México actual — es decir, hoy (o el resto de "hoy") todavía no tiene una
 * sesión que la sostenga. `computeCurrentStreak` (F11) ya trata "hoy sin
 * sesión todavía" como racha viva (no rota), así que esta señal es
 * exactamente esa ventana: viva, pero a punto de romperse si el día termina
 * sin estudiar.
 */
export function isStreakAtRisk(
  currentStreak: number,
  lastActivityDate: Date | null,
  now: Date
): boolean {
  if (currentStreak <= 0 || !lastActivityDate) return false;
  return startOfMexicoDay(lastActivityDate).getTime() < startOfMexicoDay(now).getTime();
}
