import { Prisma, type DifficultyLevel, type Question } from '@prisma/client';
import { prisma } from './prisma';
import { AdminError } from '@/lib/admin/errors';
import { parseAdminOptions, withCorrectOption, withManualReview } from '@/lib/admin/verification';
import type { QuestionDraft } from '../../../scripts/lib/question-draft-schema';

/**
 * Capa de acceso a datos del panel admin de contenido (CC-06 — Etapa 3 del
 * pipeline, PRD §8; extendida en F3 para el pipeline adversarial F2/F2b).
 * Reusa `QuestionDraft` de scripts/lib/question-draft-schema (import de
 * solo-tipo + la función pura `validateDraft`, sin Prisma ni Anthropic) para
 * que la edición de un reactivo pase por las MISMAS reglas de calidad que la
 * generación automática — no hay una segunda definición de "qué es un
 * reactivo válido".
 *
 * La cola de revisión "plana" (CC-06, `isVerified=false` sin distinción de
 * causa) se retiró en F3: todo reactivo GENERATED pasa por F2 y queda con un
 * `verification` JSON adjunto (aprobado o no) — la cola relevante ahora es
 * `src/lib/db/review-queue.ts`, que clasifica por la razón real del rechazo.
 */

const REPORT_THRESHOLD = 3;

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
  passage: true, // F3: comprensión de lectura — texto compartido, una sola vez en la UI
  sourceChunks: {
    // F3/F2b: trazabilidad — fragmento(s) fuente real(es) citados, si SOURCED
    include: { sourceChunk: { include: { contentSource: { select: { name: true } } } } },
  },
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

/**
 * Aprueba un reactivo pendiente de revisión (F3) marcando `optionId` como la
 * ÚNICA opción correcta — el admin resuelve una discrepancia o baja confianza
 * eligiendo cuál de las opciones mostradas es la correcta (la del generador,
 * la del verificador, o cualquier otra si ambos se equivocaron). Anota
 * `manualReview` en el veredicto guardado para que la cola no lo vuelva a
 * mostrar, preservando el veredicto original del pipeline para auditoría.
 */
export async function approveQuestionWithOption(
  questionId: string,
  optionId: string,
): Promise<Question> {
  const existing = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, options: true, verification: true },
  });
  if (!existing) {
    throw new AdminError('NOT_FOUND', 'No encontramos este reactivo.');
  }

  const options = parseAdminOptions(existing.options);
  if (!options.some((o) => o.id === optionId)) {
    throw new AdminError('VALIDATION', `La opción "${optionId}" no existe en este reactivo.`);
  }

  const verification = withManualReview(existing.verification, {
    action: 'approved_with_option',
    optionId,
  });

  return prisma.question.update({
    where: { id: questionId },
    data: {
      options: withCorrectOption(options, optionId) as unknown as Prisma.InputJsonValue,
      isVerified: true,
      ...(verification !== undefined
        ? { verification: verification as unknown as Prisma.InputJsonValue }
        : {}),
    },
  });
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
 *
 * `markVerified` (F3): cuando la edición viene del panel de revisión, guardar
 * TAMBIÉN resuelve la cola (isVerified=true + `manualReview` en el veredicto)
 * — editar ahí es una acción de una sola vez, no dos. Default false preserva
 * el comportamiento previo (CC-06) para ediciones desde Reportes, donde
 * corregir contenido no implica aprobar.
 */
export async function updateQuestion(
  questionId: string,
  draft: QuestionDraft,
  opts: { markVerified?: boolean } = {},
): Promise<Question> {
  const existing = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, verification: true },
  });
  if (!existing) {
    throw new AdminError('NOT_FOUND', 'No encontramos este reactivo.');
  }

  const verification = opts.markVerified
    ? withManualReview(existing.verification, { action: 'edited' })
    : undefined;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.question.update({
      where: { id: questionId },
      data: {
        stem: draft.stem,
        options: draft.options as unknown as Prisma.InputJsonValue,
        difficulty: draft.difficulty,
        ...(opts.markVerified ? { isVerified: true } : {}),
        ...(verification !== undefined
          ? { verification: verification as unknown as Prisma.InputJsonValue }
          : {}),
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
