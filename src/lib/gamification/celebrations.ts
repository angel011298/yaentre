import type { StreakMilestone } from './streak-signals';

/**
 * Motor de prioridad de celebraciones (F15 tareas 2 y 3). Módulo PURO —
 * "centraliza la lógica de cuándo se dispara cada mecánica en un solo lugar,
 * no dispersa" es literal aquí: esta es la ÚNICA función que decide qué
 * celebración grande (como máximo una) se muestra al terminar una sesión.
 *
 * Prioridad exacta (tarea 3): materia dominada > ronda perfecta > racha.
 * Si varias califican a la vez, solo la de más prioridad se dispara — las
 * demás simplemente no aparecen esta vez (no se pierden: la insignia de
 * materia dominada ya quedó otorgada permanentemente aunque no se muestre el
 * modal, por ejemplo, si compitiera con otra materia dominada en la misma
 * sesión — ver `computeSessionCelebration`, que ya deduplica a una sola).
 */

export interface CelebrationCandidates {
  /** Materias recién dominadas EN ESTA sesión (idempotente — ver capa DB). */
  masteredSubjects: readonly { subjectId: string; subjectName: string }[];
  perfectRound: boolean;
  streakMilestone: StreakMilestone | null;
}

export type Celebration =
  | { kind: 'materiaDominada'; subjectId: string; subjectName: string }
  | { kind: 'perfectRound' }
  | { kind: 'streakMilestone'; days: StreakMilestone };

export function selectCelebration(candidates: CelebrationCandidates): Celebration | null {
  if (candidates.masteredSubjects.length > 0) {
    const { subjectId, subjectName } = candidates.masteredSubjects[0];
    return { kind: 'materiaDominada', subjectId, subjectName };
  }
  if (candidates.perfectRound) {
    return { kind: 'perfectRound' };
  }
  if (candidates.streakMilestone) {
    return { kind: 'streakMilestone', days: candidates.streakMilestone };
  }
  return null;
}

/**
 * Serialización a un solo query param (F15): el simulador cierra vía Server
 * Action y LUEGO navega de página completa a `/simulador?view=result`, así que
 * el `Celebration` que `computeSessionCelebration` ya decidió no sobrevive por
 * sí solo — viaja codificado en la URL del redirect en vez de recalcularse
 * (recalcular en el render sería incorrecto: para entonces la insignia ya se
 * otorgó, así que "recién dominada" ya no se distinguiría de "dominada desde
 * antes"). El drill no lo necesita: ahí `FinishSessionResult` se consume
 * directo en el cliente sin navegación de por medio.
 */
export function encodeCelebrationParam(celebration: Celebration): string {
  switch (celebration.kind) {
    case 'materiaDominada':
      return `materiaDominada:${celebration.subjectId}:${encodeURIComponent(celebration.subjectName)}`;
    case 'perfectRound':
      return 'perfectRound';
    case 'streakMilestone':
      return `streakMilestone:${celebration.days}`;
  }
}

export function decodeCelebrationParam(value: string | undefined | null): Celebration | null {
  if (!value) return null;
  const [kind, ...rest] = value.split(':');
  if (kind === 'perfectRound') return { kind: 'perfectRound' };
  if (kind === 'streakMilestone') {
    const days = Number(rest[0]);
    if (days === 7 || days === 14 || days === 30) return { kind: 'streakMilestone', days };
    return null;
  }
  if (kind === 'materiaDominada') {
    const [subjectId, encodedName] = rest;
    if (!subjectId || !encodedName) return null;
    return { kind: 'materiaDominada', subjectId, subjectName: decodeURIComponent(encodedName) };
  }
  return null;
}
