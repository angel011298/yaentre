import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import {
  parseVerificationRecord,
  classifyReviewQueue,
  type ReviewQueueKind,
  type VerificationRecord,
} from '@/lib/admin/verification';

/**
 * Cola de revisión del panel admin (F3): reactivos que el pipeline
 * adversarial (F2) NO auto-aprobó, separados en 3 colas según por qué. Ver
 * `classifyReviewQueue` en src/lib/admin/verification.ts para las reglas.
 *
 * No es obligatorio revisar nada de esto para que el producto funcione — es
 * una herramienta de consulta opcional (sin revisión humana en el camino de
 * publicación normal, ver CLAUDE.md).
 */

export interface ReviewQueueFilters {
  areaId?: string;
  subjectId?: string;
  topicId?: string;
  page?: number;
  pageSize?: number;
}

const reviewItemInclude = {
  topic: { include: { subject: { include: { area: true } } } },
} satisfies Prisma.QuestionInclude;

type ReviewRow = Prisma.QuestionGetPayload<{ include: typeof reviewItemInclude }>;

export interface ReviewQueueItem extends ReviewRow {
  verificationRecord: VerificationRecord;
}

export type ReviewQueueCounts = Record<ReviewQueueKind, number>;

export interface ReviewQueueResult {
  items: ReviewQueueItem[];
  counts: ReviewQueueCounts;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 20;
// Tope defensivo: el pool de "no publicado por el pipeline" está acotado por
// diseño (crece con reactivos rechazados, no con el banco verificado
// completo) — cargarlo entero para clasificar en memoria es seguro a esta
// escala. Si algún día se vuelve un cuello de botella real, la vía es un
// filtro JSON a nivel SQL sobre `verification->>'decision'`.
const MAX_SCAN = 3000;

export async function listReviewQueue(
  kind: ReviewQueueKind,
  filters: ReviewQueueFilters,
): Promise<ReviewQueueResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

  const where: Prisma.QuestionWhereInput = {
    isVerified: false,
    verification: { not: Prisma.DbNull },
    ...(filters.topicId ? { topicId: filters.topicId } : {}),
    ...(filters.subjectId || filters.areaId
      ? {
          topic: {
            ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
            ...(filters.areaId ? { subject: { areaId: filters.areaId } } : {}),
          },
        }
      : {}),
  };

  const rows = await prisma.question.findMany({
    where,
    include: reviewItemInclude,
    orderBy: { createdAt: 'asc' }, // FIFO: el más antiguo sin resolver primero
    take: MAX_SCAN,
  });

  const counts: ReviewQueueCounts = { discrepancy: 0, low_confidence: 0, degraded_audit: 0 };
  const buckets: Record<ReviewQueueKind, ReviewQueueItem[]> = {
    discrepancy: [],
    low_confidence: [],
    degraded_audit: [],
  };

  for (const row of rows) {
    const record = parseVerificationRecord(row.verification);
    if (!record) continue; // veredicto corrupto/ausente: se omite, no rompe el panel
    const bucket = classifyReviewQueue(record);
    if (!bucket) continue;
    counts[bucket]++;
    buckets[bucket].push({ ...row, verificationRecord: record });
  }

  const all = buckets[kind];
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const items = all.slice((page - 1) * pageSize, page * pageSize);

  return { items, counts, total, page, pageSize, totalPages };
}
