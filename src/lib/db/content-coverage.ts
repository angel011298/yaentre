import { prisma } from './prisma';

/**
 * Mismo cálculo de cobertura que `scripts/content-coverage.ts` (CC-05), pero
 * usando el singleton de Prisma de la app (src/lib/db/prisma.ts) para que
 * `/admin/coverage` no abra una segunda pool de conexiones independiente del
 * resto del servidor Next.js. El script offline se deja tal cual: corre fuera
 * del proceso de la app (tsx) y ya tiene su propio ciclo de vida de conexión.
 */

export const COVERAGE_GOAL_VERIFIED = 1500;

export interface CoverageSubjectRow {
  id: string;
  name: string;
  verified: number;
  pending: number;
}

export interface CoverageAreaRow {
  id: string;
  name: string;
  subjects: CoverageSubjectRow[];
}

export interface CoverageReport {
  areas: CoverageAreaRow[];
  totalVerified: number;
  totalPending: number;
}

export async function buildCoverageReport(examId?: string): Promise<CoverageReport> {
  const areas = await prisma.area.findMany({
    where: examId ? { examId } : undefined,
    include: {
      subjects: {
        include: {
          topics: { include: { questions: { select: { isVerified: true } } } },
        },
        orderBy: { position: 'asc' },
      },
    },
    orderBy: { position: 'asc' },
  });

  let totalVerified = 0;
  let totalPending = 0;

  const areaRows: CoverageAreaRow[] = areas.map((area) => {
    const subjectRows: CoverageSubjectRow[] = area.subjects.map((subject) => {
      let verified = 0;
      let pending = 0;
      for (const topic of subject.topics) {
        for (const q of topic.questions) {
          if (q.isVerified) verified++;
          else pending++;
        }
      }
      totalVerified += verified;
      totalPending += pending;
      return { id: subject.id, name: subject.name, verified, pending };
    });
    return { id: area.id, name: area.name, subjects: subjectRows };
  });

  return { areas: areaRows, totalVerified, totalPending };
}
