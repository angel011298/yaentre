/**
 * Alerta de inactividad del panel parental (F16 tarea 3/PRD F-06): "Sin
 * actividad en 3 días". Módulo PURO — distinto de `isStreakAtRisk` (F15,
 * atado al límite del día México actual): esta regla es una diferencia de
 * días calendario simple contra `StreakRecord.lastActivityDate`, visible
 * para el tutor incluso si la racha ya está en 0 (un alumno sin racha
 * también puede llevar 3+ días sin actividad, y el tutor debe verlo igual).
 */

export const INACTIVITY_ALERT_DAYS = 3;

const ONE_DAY_MS = 24 * 3600 * 1000;

export function daysSinceActivity(lastActivityDate: Date | null, now: Date): number | null {
  if (!lastActivityDate) return null;
  const diffMs = now.getTime() - lastActivityDate.getTime();
  return Math.floor(diffMs / ONE_DAY_MS);
}

export function isInactiveStudent(lastActivityDate: Date | null, now: Date): boolean {
  const days = daysSinceActivity(lastActivityDate, now);
  return days !== null && days >= INACTIVITY_ALERT_DAYS;
}
