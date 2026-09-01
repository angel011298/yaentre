import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';
import {
  resolveSharedSubjectGroups,
  expandToSharedSubjectIds,
} from '@/lib/content/shared-subjects';

/**
 * Capa DB de la reutilización de contenido entre áreas (G26): resuelve, contra
 * Prisma, los grupos de materias con contenido equivalente que el módulo puro
 * `@/lib/content/shared-subjects` define. Todo se resuelve DENTRO del mismo
 * examen — la clave `Subject.sharedContentKey` nunca cruza instituciones.
 *
 * La usan el selector adaptativo (`./adaptive`), el diagnóstico (`./diagnostic`,
 * que también alimenta el simulador completo) y la pantalla de progreso
 * (`./progress`).
 *
 * ── G59: por qué esto está cacheado ──
 * `loadAreaSharedContent` costaba TRES consultas y la medición mostró que un
 * solo render del dashboard la invocaba ocho veces (el Entrómetro, el delta
 * semanal, la estrategia de carrera y el selector la piden por separado): 24
 * viajes de red para leer taxonomía que es idéntica para todos los alumnos del
 * área y que solo cambia con un seed o el panel admin. Ahora es UNA consulta
 * (las materias del examen se traen de un jalón, con su área) y va cacheada
 * con la misma ventana que el banco de reactivos.
 *
 * Lo que se cachea es SIEMPRE una estructura serializable: el `Map` se
 * reconstruye fuera del caché (un `Map` no sobrevive a la serialización de la
 * data cache de Next — devolvería `{}` sin avisar).
 */

/** Misma ventana que el banco de reactivos (`./question-read.ts`). */
const TAXONOMY_REVALIDATE_SECS = 300;

interface ExamSubjectRow {
  subjectId: string;
  subjectName: string;
  areaId: string;
  weight: number;
  sharedContentKey: string | null;
}

/**
 * Todas las materias del EXAMEN al que pertenece un área, en orden de
 * `position`, con su área, su peso y su clave de contenido compartido.
 * Una sola consulta: el examen se resuelve con un JOIN, no con un viaje extra.
 */
const loadExamSubjectsForArea = unstable_cache(
  async (areaId: string): Promise<ExamSubjectRow[]> => {
    return prisma.$queryRaw<ExamSubjectRow[]>`
      SELECT s."id"               AS "subjectId",
             s."name"             AS "subjectName",
             s."areaId"           AS "areaId",
             s."questionWeight"   AS "weight",
             s."sharedContentKey" AS "sharedContentKey"
        FROM "subjects" s
        JOIN "areas" a ON a."id" = s."areaId"
       WHERE a."examId" = (SELECT "examId" FROM "areas" WHERE "id" = ${areaId})
       ORDER BY s."position" ASC
    `;
  },
  ['loadExamSubjectsForArea'],
  { revalidate: TAXONOMY_REVALIDATE_SECS }
);

export interface AreaSharedContent {
  /** Materias propias del área (id, nombre, peso, clave), en orden de `position`. */
  areaSubjects: {
    subjectId: string;
    subjectName: string;
    weight: number;
    sharedContentKey: string | null;
  }[];
  /** subjectId propio del área → subjectIds con contenido equivalente (incl. sí mismo). */
  equivalentsBySubjectId: Map<string, string[]>;
  /** Unión de todos los subjectIds de los que el área puede leer reactivos servibles. */
  poolSubjectIds: string[];
  /** subjectId (de TODO el examen) → `sharedContentKey` | null. Para el Entrómetro. */
  keyBySubjectId: Map<string, string | null>;
}

const EMPTY_AREA_SHARED_CONTENT: AreaSharedContent = {
  areaSubjects: [],
  equivalentsBySubjectId: new Map(),
  poolSubjectIds: [],
  keyBySubjectId: new Map(),
};

/**
 * Contexto de contenido compartido de un área: sus materias, el grupo de
 * materias equivalentes de cada una, y el pool de materias del que puede leer
 * reactivos servibles. Devuelve estructuras vacías si el área no existe.
 */
export async function loadAreaSharedContent(areaId: string): Promise<AreaSharedContent> {
  const examSubjects = await loadExamSubjectsForArea(areaId);
  if (examSubjects.length === 0) return EMPTY_AREA_SHARED_CONTENT;

  const areaRows = examSubjects.filter((s) => s.areaId === areaId);
  if (areaRows.length === 0) return EMPTY_AREA_SHARED_CONTENT;

  const groups = resolveSharedSubjectGroups(
    examSubjects.map((s) => ({ subjectId: s.subjectId, sharedContentKey: s.sharedContentKey }))
  );

  const equivalentsBySubjectId = new Map<string, string[]>();
  for (const s of areaRows) {
    equivalentsBySubjectId.set(s.subjectId, [...(groups.get(s.subjectId) ?? new Set([s.subjectId]))]);
  }

  return {
    areaSubjects: areaRows.map((s) => ({
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      weight: s.weight,
      sharedContentKey: s.sharedContentKey,
    })),
    equivalentsBySubjectId,
    poolSubjectIds: [...expandToSharedSubjectIds(areaRows.map((s) => s.subjectId), groups)],
    keyBySubjectId: new Map(examSubjects.map((s) => [s.subjectId, s.sharedContentKey])),
  };
}

/**
 * Ids de las materias con contenido equivalente a `subjectId` (incluido él
 * mismo), dentro de su propio examen. Para práctica acotada a una materia.
 */
export const loadEquivalentSubjectIds = unstable_cache(
  async (subjectId: string): Promise<string[]> => {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { sharedContentKey: true, area: { select: { examId: true } } },
    });
    if (!subject || subject.sharedContentKey === null) return [subjectId];

    const rows = await prisma.subject.findMany({
      where: {
        sharedContentKey: subject.sharedContentKey,
        area: { examId: subject.area.examId },
      },
      select: { id: true },
    });
    return rows.length > 0 ? rows.map((r) => r.id) : [subjectId];
  },
  ['loadEquivalentSubjectIds'],
  { revalidate: TAXONOMY_REVALIDATE_SECS }
);
