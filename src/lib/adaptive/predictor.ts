/**
 * Motor adaptativo (F6) — Aciertómetro: predicción determinista de aciertos.
 * Lógica PURA, sin IA. Regla explícita (CLAUDE.md).
 *
 * Modelo: promedio ponderado de la tasa de acierto del alumno por materia,
 * usando `Subject.questionWeight` (# de reactivos esperados de esa materia en
 * el examen real) como ponderador; el promedio se proyecta sobre el total de
 * reactivos del examen.
 *
 *   promedioPonderado = Σ(hitRate_i · peso_i) / Σ(peso_i)
 *   predictedScore    = floor(promedioPonderado · totalReactivos)
 *
 * - Materias SIN datos suficientes usan un valor pesimista por defecto de 0.30
 *   (para no inflar la predicción; ver docs/ACIERTOS_MINIMOS.md, filosofía
 *   conservadora del Aciertómetro).
 * - `confidence` = proporción de materias con datos suficientes.
 * - Se usa floor (no round): truncar es la elección conservadora, coherente con
 *   "no inflar". Es lo que hace que el caso de referencia dé EXACTAMENTE 74.
 */

/** Tasa de acierto asumida para una materia sin datos suficientes (pesimista). */
export const PESSIMISTIC_DEFAULT_HIT_RATE = 0.3;

/**
 * Intentos mínimos para considerar que una materia "tiene datos suficientes".
 * Una materia agrupa varios temas; por debajo de esto la muestra no es
 * representativa y se aplica el default pesimista.
 */
export const MIN_SUBJECT_ATTEMPTS = 5;

export interface SubjectPerformance {
  subjectId: string;
  /** # de reactivos esperados de esta materia en el examen real (questionWeight). */
  weight: number;
  /** Aciertos acumulados del alumno en la materia. */
  correct: number;
  /** Intentos acumulados del alumno en la materia. */
  attempts: number;
}

export interface PredictionInput {
  subjects: SubjectPerformance[];
  /** Reactivos totales del examen real (Exam.totalQuestions). */
  totalQuestions: number;
}

export interface PredictionResult {
  /** Aciertos predichos (0..totalQuestions), truncado. */
  predictedScore: number;
  /** Promedio ponderado de acierto (0..1) antes de proyectar al total. */
  weightedHitRate: number;
  /** Proporción de materias con datos suficientes (0..1). */
  confidence: number;
  /** # de materias con datos suficientes. */
  subjectsWithData: number;
  /** # total de materias consideradas. */
  totalSubjects: number;
}

/** ¿La materia tiene datos suficientes para confiar en su tasa observada? */
export function subjectHasSufficientData(attempts: number): boolean {
  return attempts >= MIN_SUBJECT_ATTEMPTS;
}

/**
 * Tasa efectiva de una materia: la observada si tiene datos suficientes, o el
 * default pesimista (0.30) si no. Una materia sin datos suficientes NUNCA
 * eleva la predicción por encima de 0.30 aunque su hitRate observado sea alto
 * por casualidad de pocos intentos.
 */
export function effectiveSubjectHitRate(perf: SubjectPerformance): number {
  if (!subjectHasSufficientData(perf.attempts)) {
    return PESSIMISTIC_DEFAULT_HIT_RATE;
  }
  return perf.attempts === 0 ? PESSIMISTIC_DEFAULT_HIT_RATE : perf.correct / perf.attempts;
}

/**
 * Predice los aciertos del alumno en el examen real. Determinista y puro.
 *
 * Caso de referencia (Task 3): 0.70 de acierto en materia de peso 26 y 0.50 en
 * materia de peso 16, sobre examen de 120 reactivos ⇒ exactamente 74.
 *   Σ(hitRate·peso) = 0.70·26 + 0.50·16 = 26.2 ; Σpeso = 42
 *   promedio = 26.2/42 = 0.6238… ; ·120 = 74.857… ; floor = 74
 */
export function predictScore(input: PredictionInput): PredictionResult {
  const { subjects, totalQuestions } = input;
  const totalSubjects = subjects.length;

  const totalWeight = subjects.reduce((acc, s) => acc + s.weight, 0);
  const weightedSum = subjects.reduce(
    (acc, s) => acc + effectiveSubjectHitRate(s) * s.weight,
    0
  );
  const subjectsWithData = subjects.filter((s) => subjectHasSufficientData(s.attempts)).length;

  const weightedHitRate = totalWeight === 0 ? 0 : weightedSum / totalWeight;
  const predictedScore = Math.floor(weightedHitRate * totalQuestions);
  const confidence = totalSubjects === 0 ? 0 : subjectsWithData / totalSubjects;

  return {
    predictedScore,
    weightedHitRate,
    confidence,
    subjectsWithData,
    totalSubjects,
  };
}
