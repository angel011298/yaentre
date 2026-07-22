/**
 * Motor adaptativo (F6) — clasificación de temas. Lógica PURA y determinista:
 * sin Prisma, sin red, sin IA. Las reglas son explícitas y testeables con
 * casos fijos (ver CLAUDE.md: "Motor adaptativo determinista").
 *
 * La tasa de acierto de un tema se ACUMULA a lo largo del tiempo (todas las
 * respuestas históricas del alumno a reactivos de ese tema), no solo la última
 * sesión. La agregación exacta se hace aquí a partir de la lista completa de
 * respuestas; la capa DB (src/lib/db/adaptive.ts) provee esa lista.
 */

/** Un tema es débil si su tasa de acierto < este umbral. */
export const WEAK_THRESHOLD = 0.6;

/** Por encima de este umbral el tema se considera dominado (repaso de mantenimiento). */
export const MASTERED_THRESHOLD = 0.85;

/**
 * Mínimo de intentos acumulados para clasificar un tema. Con menos muestra no
 * se marca débil (evita falsos positivos por mala suerte en 1-2 reactivos).
 */
export const MIN_TOPIC_ATTEMPTS = 3;

export type TopicTier = 'weak' | 'intermediate' | 'mastered' | 'insufficient';

export interface TopicStat {
  topicId: string;
  attempts: number;
  correct: number;
  /** correct / attempts (0 si attempts === 0). */
  hitRate: number;
}

/** Una respuesta histórica ya puntuada (correctitud calculada server-side). */
export interface AnsweredQuestion {
  topicId: string;
  isCorrect: boolean;
}

/**
 * Agrega TODAS las respuestas históricas del alumno por tema. Exacto (cuenta
 * intentos y aciertos enteros, sin arrastre de flotantes de recomputaciones
 * previas). Devuelve un mapa topicId → estadística acumulada.
 */
export function aggregateTopicStats(answers: AnsweredQuestion[]): Map<string, TopicStat> {
  const acc = new Map<string, { attempts: number; correct: number }>();

  for (const answer of answers) {
    const prev = acc.get(answer.topicId) ?? { attempts: 0, correct: 0 };
    acc.set(answer.topicId, {
      attempts: prev.attempts + 1,
      correct: prev.correct + (answer.isCorrect ? 1 : 0),
    });
  }

  const stats = new Map<string, TopicStat>();
  for (const [topicId, { attempts, correct }] of acc) {
    stats.set(topicId, {
      topicId,
      attempts,
      correct,
      hitRate: attempts === 0 ? 0 : correct / attempts,
    });
  }
  return stats;
}

/**
 * Clasifica un tema en su tier. `insufficient` cuando no hay muestra suficiente
 * (< MIN_TOPIC_ATTEMPTS): no sabemos aún si es débil o dominado.
 *
 * Fronteras (Task 2): débil < 0.60; intermedio [0.60, 0.85]; dominado > 0.85.
 */
export function classifyTopicTier(hitRate: number, attempts: number): TopicTier {
  if (attempts < MIN_TOPIC_ATTEMPTS) return 'insufficient';
  if (hitRate < WEAK_THRESHOLD) return 'weak';
  if (hitRate > MASTERED_THRESHOLD) return 'mastered';
  return 'intermediate';
}

/**
 * ¿El tema es DÉBIL? Regla de la Task 1: tasa de acierto < 0.60 Y al menos
 * MIN_TOPIC_ATTEMPTS intentos acumulados. Es el criterio que decide qué filas
 * se marcan en WeakTopic tras cada sesión.
 */
export function isWeakTopic(hitRate: number, attempts: number): boolean {
  return attempts >= MIN_TOPIC_ATTEMPTS && hitRate < WEAK_THRESHOLD;
}

/** Solo los temas que cumplen la regla de debilidad, de una tanda de stats. */
export function selectWeakTopics(stats: Iterable<TopicStat>): TopicStat[] {
  return [...stats].filter((s) => isWeakTopic(s.hitRate, s.attempts));
}
