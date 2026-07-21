import type { QuestionFormat } from '@prisma/client';
import { prisma } from './prisma';
import { parseVerificationRecord } from '@/lib/admin/verification';

/**
 * Mismo cálculo de cobertura que `scripts/content-coverage.ts` (CC-05/F2b),
 * pero usando el singleton de Prisma de la app (src/lib/db/prisma.ts) para
 * que `/admin/coverage` no abra una segunda pool de conexiones independiente
 * del resto del servidor Next.js. El script offline se deja tal cual.
 *
 * F3 agrega: tasa de auto-aprobación por materia y por FORMATO de reactivo
 * (salud del pipeline adversarial — si cae <75%, el problema está en el
 * GENERADOR, no en revisar a mano en volumen), y el desglose de anclaje
 * SOURCED vs TEMARIO_ONLY (F2b) por materia y global.
 *
 * `autoApproved`/`unpublished` reflejan el veredicto ORIGINAL del pipeline
 * (`verification.decision`), sin importar si un admin lo resolvió después a
 * mano — la tasa mide la salud del PIPELINE, no el backlog de revisión
 * pendiente (para eso ver /admin/questions/queue, que sí excluye lo resuelto
 * manualmente vía `manualReview`).
 */

export const COVERAGE_GOAL_VERIFIED = 1500;
export const HEALTHY_AUTO_APPROVAL_RATE = 0.75;

export interface CoverageSubjectRow {
  id: string;
  name: string;
  verified: number;
  pending: number;
  autoApproved: number;
  unpublished: number;
  sourced: number;
  temarioOnly: number;
  topicsWithChunks: number;
  topicsTotal: number;
}

export interface CoverageAreaRow {
  id: string;
  name: string;
  subjects: CoverageSubjectRow[];
}

export interface CoverageFormatRow {
  format: QuestionFormat;
  autoApproved: number;
  unpublished: number;
}

export interface CoverageReport {
  areas: CoverageAreaRow[];
  totalVerified: number;
  totalPending: number;
  totalAutoApproved: number;
  totalUnpublished: number;
  totalSourced: number;
  totalTemarioOnly: number;
  totalTopicsWithChunks: number;
  totalTopics: number;
  byFormat: CoverageFormatRow[];
}

export async function buildCoverageReport(examId?: string): Promise<CoverageReport> {
  const areas = await prisma.area.findMany({
    where: examId ? { examId } : undefined,
    include: {
      subjects: {
        include: {
          topics: {
            include: {
              questions: {
                select: {
                  isVerified: true,
                  verification: true,
                  groundingStatus: true,
                  format: true,
                },
              },
              _count: { select: { sourceChunks: true } },
            },
          },
        },
        orderBy: { position: 'asc' },
      },
    },
    orderBy: { position: 'asc' },
  });

  let totalVerified = 0;
  let totalPending = 0;
  let totalAutoApproved = 0;
  let totalUnpublished = 0;
  let totalSourced = 0;
  let totalTemarioOnly = 0;
  let totalTopicsWithChunks = 0;
  let totalTopics = 0;

  const formatCounts = new Map<QuestionFormat, { autoApproved: number; unpublished: number }>();
  function bumpFormat(format: QuestionFormat, key: 'autoApproved' | 'unpublished') {
    const row = formatCounts.get(format) ?? { autoApproved: 0, unpublished: 0 };
    row[key]++;
    formatCounts.set(format, row);
  }

  const areaRows: CoverageAreaRow[] = areas.map((area) => {
    const subjectRows: CoverageSubjectRow[] = area.subjects.map((subject) => {
      const row: CoverageSubjectRow = {
        id: subject.id,
        name: subject.name,
        verified: 0,
        pending: 0,
        autoApproved: 0,
        unpublished: 0,
        sourced: 0,
        temarioOnly: 0,
        topicsWithChunks: 0,
        topicsTotal: subject.topics.length,
      };

      for (const topic of subject.topics) {
        if (topic._count.sourceChunks > 0) row.topicsWithChunks++;

        for (const q of topic.questions) {
          if (q.isVerified) row.verified++;
          if (q.groundingStatus === 'SOURCED') row.sourced++;
          else row.temarioOnly++;

          const record = parseVerificationRecord(q.verification);
          if (!record) {
            row.pending++;
          } else if (record.decision === 'AUTO_APPROVED') {
            row.autoApproved++;
            bumpFormat(q.format, 'autoApproved');
          } else {
            row.unpublished++;
            bumpFormat(q.format, 'unpublished');
          }
        }
      }

      totalVerified += row.verified;
      totalPending += row.pending;
      totalAutoApproved += row.autoApproved;
      totalUnpublished += row.unpublished;
      totalSourced += row.sourced;
      totalTemarioOnly += row.temarioOnly;
      totalTopicsWithChunks += row.topicsWithChunks;
      totalTopics += row.topicsTotal;

      return row;
    });
    return { id: area.id, name: area.name, subjects: subjectRows };
  });

  const byFormat: CoverageFormatRow[] = [...formatCounts.entries()]
    .map(([format, c]) => ({ format, ...c }))
    .sort((a, b) => b.autoApproved + b.unpublished - (a.autoApproved + a.unpublished));

  return {
    areas: areaRows,
    totalVerified,
    totalPending,
    totalAutoApproved,
    totalUnpublished,
    totalSourced,
    totalTemarioOnly,
    totalTopicsWithChunks,
    totalTopics,
    byFormat,
  };
}
