import type { TeacherLevelKey } from './tariff';

/**
 * SISTEMA DE NIVELES POR MÉRITO — Bloque 2 (spec §4). Módulo PURO.
 *
 * ── Las tres reglas que no se negocian (spec §4.3 y §13) ───────────────────
 *
 *  1. SOLO por mérito automático. El nivel no se autoselecciona en el
 *     onboarding, no lo asigna un admin y no hay un campo editable: la única
 *     escritura de `Teacher.level` es la que sale de `evaluateTeacherLevel`.
 *  2. Solo SUBE. Un profesor Destacado que empieza a cancelar mucho se suspende
 *     a mano si hace falta, pero no se le baja de nivel: es un reconocimiento
 *     ganado, no una calificación en tiempo real.
 *  3. Las clases ya reservadas NO cambian de tarifa al subir de nivel: el
 *     multiplicador se sella en la fila al reservar.
 *
 * Cuándo evaluar (spec §4.2): tras cada clase completada y tras cada
 * calificación — ver `recordClassCompleted` / `rateClass` en `src/lib/db/classes.ts`.
 */

export interface LevelCriteria {
  minClasses: number;
  /** Sobre 5.0. */
  minRating: number;
  /** Porcentaje 0–100. */
  maxCancellationRate: number;
  minMonthsActive?: number;
}

export const LEVEL_ORDER: readonly TeacherLevelKey[] = ['INICIAL', 'VERIFICADO', 'DESTACADO'];

export const LEVEL_CRITERIA: Record<TeacherLevelKey, LevelCriteria | null> = {
  INICIAL: null, // todos arrancan aquí
  VERIFICADO: { minClasses: 15, minRating: 4.2, maxCancellationRate: 10 },
  DESTACADO: { minClasses: 50, minRating: 4.5, maxCancellationRate: 5, minMonthsActive: 3 },
};

export interface TeacherMetrics {
  totalClassesGiven: number;
  averageRating: number;
  cancellationRate: number;
  monthsActive: number;
  level: TeacherLevelKey;
}

function meetsCriteria(t: TeacherMetrics, c: LevelCriteria): boolean {
  return (
    t.totalClassesGiven >= c.minClasses &&
    t.averageRating >= c.minRating &&
    t.cancellationRate <= c.maxCancellationRate &&
    (c.minMonthsActive === undefined || t.monthsActive >= c.minMonthsActive)
  );
}

/**
 * Nivel al que debe promoverse el profesor, o `null` si no hay cambio. Se
 * promueve al nivel MÁS ALTO alcanzable (uno puede saltar de Inicial a
 * Destacado si ya cumple todo). Nunca devuelve un nivel igual o inferior al
 * actual.
 */
export function evaluateTeacherLevel(teacher: TeacherMetrics): TeacherLevelKey | null {
  const currentIdx = LEVEL_ORDER.indexOf(teacher.level);
  for (let i = LEVEL_ORDER.length - 1; i > currentIdx; i--) {
    const criteria = LEVEL_CRITERIA[LEVEL_ORDER[i]!];
    if (criteria && meetsCriteria(teacher, criteria)) return LEVEL_ORDER[i]!;
  }
  return null;
}

// ───────────────────────── Métricas derivadas ─────────────────────────

export interface ClassOutcomeCounts {
  completed: number;
  /** El alumno no se presentó: el profesor SÍ cumplió, así que cuenta a su favor. */
  studentNoShow: number;
  teacherCancelled: number;
  teacherNoShow: number;
}

/**
 * Tasa de cancelación del PROFESOR, en porcentaje 0–100 con dos decimales.
 *
 * Solo cuentan los resultados atribuibles al profesor: el numerador son las
 * cancelaciones suyas y los no-show suyos (spec §6.7: «cuenta como
 * cancelación»); el denominador, todas las clases que estaba comprometido a
 * dar. Las cancelaciones del alumno y las del sistema por un pago que no se
 * confirmó NO entran — no dependen de él y castigarlas sería injusto.
 */
export function computeCancellationRate(counts: ClassOutcomeCounts): number {
  const numerator = counts.teacherCancelled + counts.teacherNoShow;
  const denominator = counts.completed + counts.studentNoShow + numerator;
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 10_000) / 100;
}

/**
 * Meses COMPLETOS entre dos instantes (calendario UTC). Un profesor aprobado el
 * 31 de enero no cumple un mes el 28 de febrero: cumple cuando llega el día del
 * mes (o el último del mes, si ese día no existe) — un «mes» no son 30 días.
 */
export function wholeMonthsBetween(from: Date, to: Date): number {
  if (to.getTime() <= from.getTime()) return 0;
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  const daysInTargetMonth = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() + 1, 0)).getUTCDate();
  const anchorDay = Math.min(from.getUTCDate(), daysInTargetMonth);
  const reached =
    to.getUTCDate() > anchorDay ||
    (to.getUTCDate() === anchorDay &&
      to.getUTCHours() * 3_600_000 + to.getUTCMinutes() * 60_000 + to.getUTCSeconds() * 1000 >=
        from.getUTCHours() * 3_600_000 + from.getUTCMinutes() * 60_000 + from.getUTCSeconds() * 1000);
  if (!reached) months -= 1;
  return Math.max(0, months);
}

// ───────────────────── Progreso hacia el siguiente nivel ─────────────────────

export interface LevelProgressCriterion {
  key: 'classes' | 'rating' | 'cancellations' | 'months';
  label: string;
  current: number;
  required: number;
  /** `min`: hay que llegar a `required`; `max`: hay que quedarse por debajo. */
  kind: 'min' | 'max';
  met: boolean;
}

export interface LevelProgress {
  nextLevel: TeacherLevelKey | null;
  criteria: LevelProgressCriterion[];
}

/** Para el tablero del profesor (spec §8, «Progreso a Verificado»). */
export function levelProgress(teacher: TeacherMetrics): LevelProgress {
  const nextLevel = LEVEL_ORDER[LEVEL_ORDER.indexOf(teacher.level) + 1] ?? null;
  const c = nextLevel ? LEVEL_CRITERIA[nextLevel] : null;
  if (!nextLevel || !c) return { nextLevel: null, criteria: [] };

  const criteria: LevelProgressCriterion[] = [
    {
      key: 'classes',
      label: 'Clases impartidas',
      current: teacher.totalClassesGiven,
      required: c.minClasses,
      kind: 'min',
      met: teacher.totalClassesGiven >= c.minClasses,
    },
    {
      key: 'rating',
      label: 'Calificación promedio',
      current: teacher.averageRating,
      required: c.minRating,
      kind: 'min',
      met: teacher.averageRating >= c.minRating,
    },
    {
      key: 'cancellations',
      label: 'Cancelaciones (máximo)',
      current: teacher.cancellationRate,
      required: c.maxCancellationRate,
      kind: 'max',
      met: teacher.cancellationRate <= c.maxCancellationRate,
    },
  ];
  if (c.minMonthsActive !== undefined) {
    criteria.push({
      key: 'months',
      label: 'Meses activo',
      current: teacher.monthsActive,
      required: c.minMonthsActive,
      kind: 'min',
      met: teacher.monthsActive >= c.minMonthsActive,
    });
  }
  return { nextLevel, criteria };
}
