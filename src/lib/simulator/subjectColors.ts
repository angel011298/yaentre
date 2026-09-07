import { hashSeed } from './shuffle';

/**
 * Color por materia en el desglose de resultados (F13 tarea 3). Deliberadamente
 * NO reusa `Area.colorHex`: dentro de un simulacro ese color sería casi
 * siempre el mismo para todas las filas (el área del alumno) y no serviría
 * para diferenciarlas visualmente. Tampoco reusa los
 * tokens semánticos `--success`/`--danger` (ya significan correcto/incorrecto
 * en toda la app — reutilizarlos aquí confundiría ambos significados).
 *
 * En vez de eso: una paleta categórica fija de 6 colores (tokens `--chart-N`
 * en globals.css), asignada de forma DETERMINISTA por hash de la CLAVE
 * CANÓNICA de la materia (reusa el mismo hash del barajado sembrado —
 * src/lib/simulator/shuffle.ts) para que "Matemáticas" tenga siempre el mismo
 * color entre sesiones y recargas, sin coordinar nada extra.
 *
 * G71: esa clave es `sharedContentKey ?? subjectId`, no el id a secas — una
 * materia de pool compartido (G26) llega desde filas `Subject` distintas según
 * el simulacro, y con el id el color le cambiaría de una sesión a otra.
 */
const CHART_PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
] as const;

export function subjectColorFor(subjectKey: string): string {
  const index = hashSeed(subjectKey) % CHART_PALETTE.length;
  return CHART_PALETTE[index];
}
