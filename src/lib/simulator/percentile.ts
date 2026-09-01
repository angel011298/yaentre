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
 * Percentil rank a partir de los CONTEOS ya agregados: cuántas otras sesiones
 * quedaron por debajo (`beaten`) sobre cuántas hay en total (`total`).
 *
 * G59: esta es la forma que usa el simulador. La versión que recibe la lista
 * completa (abajo) obligaba a traer a Node el score de TODAS las sesiones
 * terminadas del examen —de todos los alumnos— solo para contar cuántas eran
 * menores; medido con 2 000 alumnos ya eran 2 176 filas por cada visita a la
 * pantalla de resultados. Contar es justo lo que Postgres hace bien.
 */
export function percentileRankFromCounts(beaten: number, total: number): number | null {
  if (total < MIN_PERCENTILE_SAMPLE) return null;
  return Math.round((beaten / total) * 100);
}

/**
 * Percentil rank estándar: porcentaje de otras sesiones con score
 * ESTRICTAMENTE menor al propio. `null` si la muestra es menor al mínimo.
 */
export function computePercentileRank(score: number, otherScores: number[]): number | null {
  return percentileRankFromCounts(
    otherScores.filter((s) => s < score).length,
    otherScores.length
  );
}
