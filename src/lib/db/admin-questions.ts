import { Prisma, type DifficultyLevel, type Question } from '@prisma/client';
import { prisma } from './prisma';
import { AdminError } from '@/lib/admin/errors';
import type { QuestionDraft } from '../../../scripts/lib/question-draft-schema';

/**
 * Capa de acceso a datos del panel admin de contenido (CC-06 — Etapa 3 del
 * pipeline, PRD §8). Reusa `QuestionDraft` de scripts/lib/question-draft-schema
 * (import de solo-tipo + la función pura `validateDraft`, sin Prisma ni
 * Anthropic) para que la edición de un reactivo pase por las MISMAS reglas de
 * calidad que la generación automática — no hay una segunda definición de
 * "qué es un reactivo válido".
 */

const REPORT_THRESHOLD = 3;
const DEFAULT_PAGE_SIZE = 20;

// ─────────────────────────── Cola de revisión ───────────────────────────

export interface QueueFilters {
  areaId?: string;
  subjectId?: string;
  topicId?: string;
  difficulty?: DifficultyLevel;
  page?: number;
  pageSize?: number;
}

const queueItemInclude = {
  topic: { include: { subject: { include: { area: true } } } },
} satisfies Prisma.QuestionInclude;

export type QueueItem = Prisma.QuestionGetPayload<{ include: typeof queueItemInclude }>;

export interface QueueResult {
  items: QueueItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Lista reactivos con isVerified=false (cola de la Etapa 3), paginada y filtrable. */
export async function listPendingQuestions(filters: QueueFilters): Promise<QueueResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

  const where: Prisma.QuestionWhereInput = {
    isVerified: false,
    ...(filters.topicId ? { topicId: filters.topicId } : {}),
    ...(filters.difficulty ? { difficulty: filters.difficulty } : {}),
    ...(filters.subjectId || filters.areaId
      ? {
          topic: {
            ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
            ...(filters.areaId ? { subject: { areaId: filters.areaId } } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: queueItemInclude,
      orderBy: { createdAt: 'asc' }, // FIFO: el más antiguo primero
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.question.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export interface FilterTaxonomyArea {
  id: string;
  name: string;
  subjects: {
    id: string;
    name: string;
    topics: { id: string; name: string }[];
  }[];
}

/** Taxonomía completa (Área → Materia → Tema) para poblar los filtros de la cola. */
export async function loadFilterTaxonomy(): Promise<FilterTaxonomyArea[]> {
  const areas = await prisma.area.findMany({
    include: {
      subjects: {
        include: {
          topics: { select: { id: true, name: true }, orderBy: { position: 'asc' } },
        },
        orderBy: { position: 'asc' },
      },
    },
    orderBy: { position: 'asc' },
  });

  return areas.map((area) => ({
    id: area.id,
    name: area.name,
    subjects: area.subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      topics: subject.topics,
    })),
  }));
}

// ─────────────────────────── Detalle de reactivo ───────────────────────────

const questionDetailInclude = {
  topic: {
    include: {
      subject: {
        include: {
          area: {
            include: {
              exam: { include: { level: { include: { institution: true } } } },
            },
          },
        },
      },
    },
  },
  explanations: { orderBy: { layer: 'asc' as const } },
  reports: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.QuestionInclude;

export type QuestionDetail = Prisma.QuestionGetPayload<{
  include: typeof questionDetailInclude;
}>;

export async function getQuestionDetail(questionId: string): Promise<QuestionDetail> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: questionDetailInclude,
  });
  if (!question) {
    throw new AdminError('NOT_FOUND', 'No encontramos este reactivo.');
  }
  return question;
}

// ─────────────────────────── Acciones de revisión ───────────────────────────

/** Aprueba un reactivo: isVerified=false → true. Sale de la cola. */
export async function approveQuestion(questionId: string): Promise<Question> {
  const existing = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true },
  });
  if (!existing) {
    throw new AdminError('NOT_FOUND', 'No encontramos este reactivo.');
  }
  return prisma.question.update({ where: { id: questionId }, data: { isVerified: true } });
}

export interface RejectedSnapshot {
  id: string;
  stem: string;
  topicId: string;
  difficulty: DifficultyLevel;
}

/**
 * Rechaza (elimina) un reactivo de la cola. El schema no tiene un campo de
 * soft-delete y esta sesión tiene prohibido modificarlo, así que un rechazo
 * es una eliminación real (cascada a ExplanationLayer y QuestionReport por
 * `onDelete: Cascade`). El caller (Server Action) registra un snapshot del
 * contenido en el log de auditoría ANTES de perderlo, como mitigación.
 */
export async function rejectQuestion(questionId: string): Promise<RejectedSnapshot> {
  const existing = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, stem: true, topicId: true, difficulty: true },
  });
  if (!existing) {
    throw new AdminError('NOT_FOUND', 'No encontramos este reactivo.');
  }
  await prisma.question.delete({ where: { id: questionId } });
  return existing;
}

/**
 * Persiste una edición de stem/opciones/dificultad/explicaciones. `draft` ya
 * viene validado por `validateDraft` (mismas reglas que la Etapa 2 del
 * pipeline) — esta función asume que es válido.
 */
export async function updateQuestion(
  questionId: string,
  draft: QuestionDraft,
): Promise<Question> {
  const existing = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true },
  });
  if (!existing) {
    throw new AdminError('NOT_FOUND', 'No encontramos este reactivo.');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.question.update({
      where: { id: questionId },
      data: {
        stem: draft.stem,
        options: draft.options as unknown as Prisma.InputJsonValue,
        difficulty: draft.difficulty,
      },
    });

    for (const layer of draft.explanations) {
      await tx.explanationLayer.upsert({
        where: { questionId_layer: { questionId, layer: layer.layer } },
        create: {
          questionId,
          layer: layer.layer,
          title: layer.title,
          content: layer.content,
          latexContent: layer.latexContent ?? null,
        },
        update: {
          title: layer.title,
          content: layer.content,
          latexContent: layer.latexContent ?? null,
        },
      });
    }

    return updated;
  });
}

// ─────────────────────────── Reportes de usuarios ───────────────────────────

export interface ReportedQuestion {
  id: string;
  stem: string;
  unresolvedCount: number;
  topic: { name: string; subject: { name: string; area: { name: string } } };
}

/** Reactivos con >= 3 QuestionReport sin resolver (umbral del PRD §8, Etapa 4). */
export async function listUnresolvedReportedQuestions(): Promise<ReportedQuestion[]> {
  const questions = await prisma.question.findMany({
    where: { reports: { some: { resolved: false } } },
    include: {
      topic: { include: { subject: { include: { area: true } } } },
      reports: { where: { resolved: false } },
    },
  });

  return questions
    .map((q) => ({
      id: q.id,
      stem: q.stem,
      unresolvedCount: q.reports.length,
      topic: {
        name: q.topic.name,
        subject: { name: q.topic.subject.name, area: { name: q.topic.subject.area.name } },
      },
    }))
    .filter((q) => q.unresolvedCount >= REPORT_THRESHOLD)
    .sort((a, b) => b.unresolvedCount - a.unresolvedCount);
}

/** Marca como resueltos todos los reportes pendientes de un reactivo. */
export async function resolveReportsForQuestion(questionId: string): Promise<number> {
  const result = await prisma.questionReport.updateMany({
    where: { questionId, resolved: false },
    data: { resolved: true },
  });
  return result.count;
}

export { REPORT_THRESHOLD };
