/**
 * Distribución de los 30 reactivos del diagnóstico entre las materias del
 * área elegida por el alumno, ponderada por `Subject.questionWeight` (F-01:
 * "al menos 6 materias distintas del área"). Módulo PURO y determinista —
 * sin Prisma, sin red — la capa DB (src/lib/db/diagnostic.ts) lo orquesta
 * contra el pool real de reactivos servibles.
 *
 * Estrategia en dos pasadas:
 * 1. `apportionByWeight`: reparto proporcional al peso con MÍNIMO 1 reactivo
 *    por materia (se reserva 1 asiento a cada materia antes de repartir el
 *    resto por peso, método de "mayor resto"). Garantiza cobertura máxima de
 *    materias distintas — el requisito de negocio, no solo un promedio.
 * 2. `capToAvailability`: recorta cada materia a su contenido real disponible
 *    y redistribuye el sobrante entre las que sí tienen cupo, priorizando
 *    peso. Esto hace que el algoritmo sea correcto incluso hoy, con cobertura
 *    de contenido parcial (ver docs/ESTADO.md, Notas F4) — cuando el pipeline
 *    de contenido cubra más materias, el diagnóstico las incorpora solo.
 */

export interface SubjectWeight {
  subjectId: string;
  weight: number;
}

export interface SubjectAvailability extends SubjectWeight {
  available: number;
}

/**
 * Reparto proporcional por peso con reserva de 1 asiento por materia
 * (método de mayor resto / Hamilton). Determinista: en empate de resto se
 * respeta el orden de entrada.
 *
 * Si hay más materias con peso>0 que `total` (caso extremo, no se espera con
 * total=30), no hay asientos para reservar 1 a cada una: se eligen las
 * `total` materias de mayor peso, 1 reactivo cada una.
 */
export function apportionByWeight(subjects: SubjectWeight[], total: number): Map<string, number> {
  const positive = subjects.filter((s) => s.weight > 0);
  if (positive.length === 0 || total <= 0) return new Map();

  if (positive.length >= total) {
    const top = [...positive].sort((a, b) => b.weight - a.weight).slice(0, total);
    return new Map(top.map((s) => [s.subjectId, 1]));
  }

  const remaining = total - positive.length; // ya reservamos 1 por materia
  const totalWeight = positive.reduce((sum, s) => sum + s.weight, 0);

  const shares = positive.map((s) => {
    const exact = (s.weight / totalWeight) * remaining;
    const base = Math.floor(exact);
    return { subjectId: s.subjectId, base, remainder: exact - base };
  });

  const usedByFloor = shares.reduce((sum, s) => sum + s.base, 0);
  const leftover = remaining - usedByFloor;

  const bonusIds = new Set(
    [...shares]
      .sort((a, b) => b.remainder - a.remainder)
      .slice(0, leftover)
      .map((s) => s.subjectId)
  );

  const result = new Map<string, number>();
  for (const s of shares) {
    result.set(s.subjectId, 1 + s.base + (bonusIds.has(s.subjectId) ? 1 : 0));
  }
  return result;
}

/**
 * Recorta el reparto ideal a la disponibilidad real de contenido servible y
 * redistribuye el sobrante entre materias con cupo restante, priorizando
 * peso (mayor peso primero). Las materias con `available = 0` quedan fuera
 * por completo — no reciben ningún reactivo aunque tengan peso.
 *
 * Devuelve como mucho `min(total, suma de available)` reactivos: si el pool
 * completo del área no alcanza para 30, el diagnóstico se sirve incompleto
 * en vez de fallar (mejor un diagnóstico corto que uno roto).
 */
export function capToAvailability(
  ideal: Map<string, number>,
  subjects: SubjectAvailability[]
): Map<string, number> {
  const availableById = new Map(subjects.map((s) => [s.subjectId, s.available]));

  const result = new Map<string, number>();
  let shortfall = 0;

  for (const [subjectId, count] of ideal) {
    const available = availableById.get(subjectId) ?? 0;
    const granted = Math.min(count, available);
    result.set(subjectId, granted);
    shortfall += count - granted;
  }

  // Materias con peso>0 pero ausentes del reparto ideal (caso extremo del
  // reparto top-N) también pueden tener cupo disponible para redistribución.
  for (const s of subjects) {
    if (!result.has(s.subjectId)) result.set(s.subjectId, 0);
  }

  if (shortfall <= 0) return result;

  // Redistribuye 1 asiento a la vez a la materia con más peso que aún tenga
  // cupo (available - allocated > 0), hasta agotar el sobrante o el cupo
  // total del área.
  const candidates = [...subjects].sort((a, b) => b.weight - a.weight);

  let remaining = shortfall;
  let madeProgress = true;
  while (remaining > 0 && madeProgress) {
    madeProgress = false;
    for (const s of candidates) {
      if (remaining <= 0) break;
      const allocated = result.get(s.subjectId) ?? 0;
      const cap = availableById.get(s.subjectId) ?? 0;
      if (allocated < cap) {
        result.set(s.subjectId, allocated + 1);
        remaining -= 1;
        madeProgress = true;
      }
    }
  }

  return result;
}

/**
 * Punto de entrada único: reparto ideal por peso + recorte a disponibilidad
 * real, en un solo paso.
 */
export function allocateDiagnosticQuestions(
  subjects: SubjectAvailability[],
  total: number
): Map<string, number> {
  const withContent = subjects.filter((s) => s.available > 0 && s.weight > 0);
  const ideal = apportionByWeight(withContent, total);
  return capToAvailability(ideal, subjects);
}
