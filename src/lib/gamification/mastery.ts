import { MIN_TOPIC_ATTEMPTS } from '@/lib/adaptive/topic-stats';

/**
 * "Materia dominada" (F15 tarea 1). Módulo PURO: la regla es sobre TODOS los
 * temas de la materia, NO el promedio — una materia con 5 temas al 100% y uno
 * al 50% NO cuenta, aunque el promedio general (91.6%) supere el umbral.
 *
 * Un tema sin evidencia suficiente (< MIN_TOPIC_ATTEMPTS — el mismo umbral que
 * ya usa el motor adaptativo, F6, para no clasificar por muestra chica) hace
 * que la materia entera NO se considere dominada: nunca se otorga el logro
 * "gratis" por temas que el alumno simplemente nunca intentó.
 */
export const SUBJECT_MASTERY_THRESHOLD = 0.85;

export interface TopicMasteryInput {
  topicId: string;
  attempts: number;
  hitRate: number;
}

export function isSubjectMastered(topics: readonly TopicMasteryInput[]): boolean {
  if (topics.length === 0) return false;
  return topics.every(
    (t) => t.attempts >= MIN_TOPIC_ATTEMPTS && t.hitRate >= SUBJECT_MASTERY_THRESHOLD
  );
}
