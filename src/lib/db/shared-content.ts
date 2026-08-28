import { prisma } from './prisma';
import {
  resolveSharedSubjectGroups,
  expandToSharedSubjectIds,
  type SubjectSharing,
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
 */

/** Materias de un examen con su `sharedContentKey` (una fila por materia). */
export async function loadExamSubjectSharing(examId: string): Promise<SubjectSharing[]> {
  const rows = await prisma.subject.findMany({
    where: { area: { examId } },
    select: { id: true, sharedContentKey: true },
  });
  return rows.map((r) => ({ subjectId: r.id, sharedContentKey: r.sharedContentKey }));
}

export interface AreaSharedContent {
  /** Materias propias del área (id, peso, clave), en orden de `position`. */
  areaSubjects: { subjectId: string; weight: number; sharedContentKey: string | null }[];
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
  const area = await prisma.area.findUnique({ where: { id: areaId }, select: { examId: true } });
  if (!area) return EMPTY_AREA_SHARED_CONTENT;

  const [areaRows, examSharing] = await Promise.all([
    prisma.subject.findMany({
      where: { areaId },
      orderBy: { position: 'asc' },
      select: { id: true, questionWeight: true, sharedContentKey: true },
    }),
    loadExamSubjectSharing(area.examId),
  ]);

  const groups = resolveSharedSubjectGroups(examSharing);

  const equivalentsBySubjectId = new Map<string, string[]>();
  for (const s of areaRows) {
    equivalentsBySubjectId.set(s.id, [...(groups.get(s.id) ?? new Set([s.id]))]);
  }

  return {
    areaSubjects: areaRows.map((s) => ({
      subjectId: s.id,
      weight: s.questionWeight,
      sharedContentKey: s.sharedContentKey,
    })),
    equivalentsBySubjectId,
    poolSubjectIds: [...expandToSharedSubjectIds(areaRows.map((s) => s.id), groups)],
    keyBySubjectId: new Map(examSharing.map((s) => [s.subjectId, s.sharedContentKey])),
  };
}

/**
 * Ids de las materias con contenido equivalente a `subjectId` (incluido él
 * mismo), dentro de su propio examen. Para práctica acotada a una materia.
 */
export async function loadEquivalentSubjectIds(subjectId: string): Promise<string[]> {
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
}
