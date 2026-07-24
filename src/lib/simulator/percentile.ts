/**
 * Percentil del simulacro (F13 tarea 6). Módulo PURO: compara el score de esta
 * sesión contra los de otras sesiones YA terminadas del MISMO examen (mismo
 * `examId` — Exam ya está acotado a institución+nivel+año, así que "mismo
 * ciclo" equivale directamente a "mismo examId").
 *
 * Con una muestra chica, un percentil es ruido disfrazado de dato ("le ganaste
 * al 100% de 1 persona" no significa nada) — por eso se oculta con elegancia
 * en vez de mostrar un número sin sentido (tarea 6).
 */
export const MIN_PERCENTILE_SAMPLE = 5;

/**
 * Percentil rank estándar: porcentaje de otras sesiones con score
 * ESTRICTAMENTE menor al propio. `null` si la muestra es menor al mínimo.
 */
export function computePercentileRank(score: number, otherScores: number[]): number | null {
  if (otherScores.length < MIN_PERCENTILE_SAMPLE) return null;
  const beaten = otherScores.filter((s) => s < score).length;
  return Math.round((beaten / otherScores.length) * 100);
}
