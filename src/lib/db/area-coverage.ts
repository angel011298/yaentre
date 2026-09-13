import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';
import { DIAGNOSTIC_QUESTION_COUNT } from './diagnostic';
import {
  evaluateAreaCoverage,
  resolveEffectiveServable,
  type AreaCoverage,
  type SubjectCensusRow,
  type SubjectCoverageInput,
} from '@/lib/content/coverage';

/**
 * G74 — capa DB de la guarda de cobertura (`@/lib/content/coverage`). Calcula,
 * contra la base y sólo contra la base, cuántos reactivos SERVIBLES puede
 * recibir realmente un alumno en cada materia de cada área de un examen.
 *
 * ── Tres cosas que este módulo NO hace, a propósito ─────────────────────────
 *
 * 1. No contiene ninguna lista de áreas, materias ni instituciones. La lección
 *    de G73 es que una lista escrita a mano se desincroniza de la realidad y
 *    nadie se entera; aquí todo sale del censo real. Un lote de contenido que
 *    llene Civismo/Derecho habilita IPN SOCADM solo, sin tocar código.
 * 2. No inventa su propio filtro de «servible». Usa EXACTAMENTE el mismo que
 *    `loadAreaSubjectPools` (src/lib/db/diagnostic.ts) usa para armar el
 *    diagnóstico de verdad: `usage = SERVABLE AND isVerified = true`. Si los
 *    dos filtros se separaran, la guarda diría que un área está lista y el
 *    diagnóstico serviría otra cosa — un fallo silencioso de manual.
 * 3. No ignora la reutilización de contenido de G26. El pool efectivo de una
 *    materia con `sharedContentKey` es la SUMA del grupo dentro del mismo
 *    examen: un alumno de UNAM Área 3 sí tiene Español aunque su propia fila
 *    `Subject` esté en cero, porque el pool viene del de Área 1. Contar sólo
 *    lo propio marcaría como rotas tres áreas que funcionan.
 *
 * ── Caché ───────────────────────────────────────────────────────────────────
 *
 * Misma ventana (5 min) que el banco de reactivos (`./question-read.ts`) y la
 * taxonomía compartida (`./shared-content.ts`): el censo es idéntico para
 * todos los alumnos del examen y sólo cambia cuando el pipeline publica un
 * lote. Es una lectura de onboarding, un camino que cada alumno recorre una
 * vez — pero el paso 2 lo pinta para TODAS las áreas del examen a la vez.
 */

const COVERAGE_REVALIDATE_SECS = 300;

interface ExamSubjectCensusRow extends SubjectCensusRow {
  subjectName: string;
  areaId: string;
  weight: number;
}

/**
 * Censo crudo del examen: una fila por materia, con sus reactivos servibles
 * PROPIOS. Una sola consulta — la suma por pool compartido se hace en memoria
 * porque es aritmética sobre un puñado de filas, no trabajo de base.
 *
 * `LEFT JOIN` + `FILTER`: una materia sin temas, o con temas sin reactivos,
 * tiene que aparecer con 0, no desaparecer de la lista. Justo esas son las que
 * la guarda existe para detectar.
 */
const loadExamSubjectCensus = unstable_cache(
  async (examId: string): Promise<ExamSubjectCensusRow[]> => {
    return prisma.$queryRaw<ExamSubjectCensusRow[]>`
      SELECT s."id"               AS "subjectId",
             s."name"             AS "subjectName",
             s."areaId"           AS "areaId",
             s."questionWeight"   AS "weight",
             s."sharedContentKey" AS "sharedContentKey",
             COUNT(q."id") FILTER (
               WHERE q."isVerified" = true AND q."usage" = 'SERVABLE'
             )::int               AS "ownServable"
        FROM "subjects" s
        JOIN "areas"  a ON a."id" = s."areaId"
        LEFT JOIN "topics"    t ON t."subjectId" = s."id"
        LEFT JOIN "questions" q ON q."topicId"   = t."id"
       WHERE a."examId" = ${examId}
       GROUP BY s."id", s."name", s."areaId", s."questionWeight",
                s."sharedContentKey", s."position"
       ORDER BY s."position" ASC
    `;
  },
  ['loadExamSubjectCensus'],
  { revalidate: COVERAGE_REVALIDATE_SECS }
);

/** Cobertura de CADA área del examen, indexada por `areaId`. */
export async function loadExamAreaCoverage(examId: string): Promise<Map<string, AreaCoverage>> {
  const rows = await loadExamSubjectCensus(examId);
  const effective = resolveEffectiveServable(rows);

  const byArea = new Map<string, SubjectCoverageInput[]>();
  for (const r of rows) {
    const list = byArea.get(r.areaId);
    const entry: SubjectCoverageInput = {
      subjectId: r.subjectId,
      subjectName: r.subjectName,
      weight: r.weight,
      servable: effective.get(r.subjectId) ?? 0,
    };
    if (list) list.push(entry);
    else byArea.set(r.areaId, [entry]);
  }

  return new Map(
    [...byArea].map(([areaId, subjects]) => [
      areaId,
      evaluateAreaCoverage(subjects, DIAGNOSTIC_QUESTION_COUNT),
    ])
  );
}

/**
 * Cobertura de UN área. Devuelve `null` si el área no existe; un área que sí
 * existe pero no tiene materias sembradas devuelve un `COMING_SOON` honesto
 * (lo resuelve `evaluateAreaCoverage`), no `null`.
 */
export async function loadAreaCoverage(areaId: string): Promise<AreaCoverage | null> {
  const area = await prisma.area.findUnique({ where: { id: areaId }, select: { examId: true } });
  if (!area) return null;
  const byArea = await loadExamAreaCoverage(area.examId);
  return byArea.get(areaId) ?? evaluateAreaCoverage([], DIAGNOSTIC_QUESTION_COUNT);
}
