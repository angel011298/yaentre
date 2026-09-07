import { canonicalSubjectKey } from '@/lib/content/shared-subjects';
import { subjectColorFor } from './subjectColors';

/**
 * Desglose por materia del resultado del simulacro (G71). Módulo PURO: sin
 * Prisma, sin red — la capa de datos le pasa las respuestas ya cargadas.
 *
 * ── Por qué existe ──
 * Hasta G71 el desglose agrupaba por `Subject.id`, y eso pinta la MISMA
 * materia dos veces. La reutilización de contenido entre áreas (G26) sirve los
 * reactivos de un pool compartido desde la fila `Subject` que más contenido
 * tenga del grupo, sin importar el área del alumno: un simulacro real de UNAM
 * Área 1 traía 11 reactivos de Química bajo la fila `Subject` de Área 1 y 12
 * bajo la de Área 2 — dos ids distintos, el mismo `sharedContentKey`
 * (`UNAM:QUIMICA`) y el mismo nombre. El alumno veía dos renglones «Química»
 * con números distintos y ninguna forma de saber por qué.
 *
 * La regla es la que ya usa `progress.ts` para el Entrómetro: dos materias con
 * el mismo `sharedContentKey` son la misma materia para el alumno. Aquí se
 * agrupa por esa clave canónica (`sharedContentKey ?? id`), que además da un
 * color estable entre sesiones aunque la mezcla de filas `Subject` cambie de
 * un simulacro al siguiente.
 */

/** Una respuesta ya puntuada, con la materia de origen de su reactivo. */
export interface BreakdownAnswer {
  isCorrect: boolean;
  subject: { id: string; name: string; sharedContentKey: string | null };
}

export interface SubjectBreakdownRow {
  /** Clave canónica de la materia: `sharedContentKey` si comparte pool, si no su id. */
  subjectKey: string;
  subjectName: string;
  correct: number;
  total: number;
  /** Color determinista para el desglose (F13 tarea 3) — ver subjectColors.ts. */
  colorHex: string;
}

/**
 * Agrupa las respuestas por materia canónica y las ordena por nombre.
 * Determinista: el orden de entrada no altera el resultado.
 */
export function aggregateSubjectBreakdown(
  answers: readonly BreakdownAnswer[]
): SubjectBreakdownRow[] {
  const keyBySubjectId = new Map<string, string | null>();
  for (const a of answers) keyBySubjectId.set(a.subject.id, a.subject.sharedContentKey);

  const byKey = new Map<string, { subjectName: string; correct: number; total: number }>();
  for (const a of answers) {
    const key = canonicalSubjectKey(a.subject.id, keyBySubjectId);
    const prev = byKey.get(key) ?? { subjectName: a.subject.name, correct: 0, total: 0 };
    byKey.set(key, {
      // El nombre se fija con el primero que se vea: dentro de un grupo
      // compartido las filas `Subject` llevan el mismo nombre por definición.
      subjectName: prev.subjectName,
      correct: prev.correct + (a.isCorrect ? 1 : 0),
      total: prev.total + 1,
    });
  }

  return [...byKey.entries()]
    .map(([subjectKey, s]) => ({ subjectKey, colorHex: subjectColorFor(subjectKey), ...s }))
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
}
