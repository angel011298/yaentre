import { hashSeed } from './shuffle';

/**
 * Color por materia en el desglose de resultados (F13 tarea 3). Deliberadamente
 * NO reusa `Area.colorHex`: todas las materias de un mismo simulacro pertenecen
 * a la MISMA área del alumno, así que ese color sería idéntico para todas las
 * filas y no serviría para diferenciarlas visualmente. Tampoco reusa los
 * tokens semánticos `--success`/`--danger` (ya significan correcto/incorrecto
 * en toda la app — reutilizarlos aquí confundiría ambos significados).
 *
 * En vez de eso: una paleta categórica fija de 6 colores (tokens `--chart-N`
 * en globals.css), asignada de forma DETERMINISTA por hash del `subjectId`
 * (reusa el mismo hash del barajado sembrado — src/lib/simulator/shuffle.ts)
 * para que la materia "Matemáticas" tenga siempre el mismo color entre
 * sesiones y recargas, sin coordinar nada extra.
 */
const CHART_PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
] as const;

export function subjectColorFor(subjectId: string): string {
  const index = hashSeed(subjectId) % CHART_PALETTE.length;
  return CHART_PALETTE[index];
}
