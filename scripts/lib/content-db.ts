import { PrismaClient, Prisma } from '@prisma/client';
import type { PromptContext } from './prompt-loader';

/**
 * Cliente Prisma dedicado para los scripts offline. Separado del singleton de
 * la app (src/lib/db/prisma.ts) porque los scripts corren fuera del ciclo de
 * Next.js. Usa las mismas variables de entorno (DATABASE_URL / DIRECT_URL).
 */
let client: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!client) {
    client = new PrismaClient();
  }
  return client;
}

export async function disconnect(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = null;
  }
}

export interface TopicContext extends PromptContext {
  topicId: string;
}

/**
 * Carga el contexto taxonómico completo de un tema:
 * Topic → Subject → Area → Exam → Level → Institution.
 * Devuelve null si el tema no existe.
 */
export async function loadTopicContext(
  topicId: string,
): Promise<TopicContext | null> {
  const prisma = getPrisma();
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
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
  });

  if (!topic) return null;

  const subject = topic.subject;
  const area = subject.area;
  const exam = area.exam;
  const level = exam.level;
  const institution = level.institution;

  return {
    topicId: topic.id,
    topic: topic.name,
    subject: subject.name,
    area: area.name,
    level: level.name,
    institution: institution.name,
  };
}

/**
 * Devuelve los stems ya existentes (normalizados por el caller) de un tema,
 * para deduplicar antes de insertar.
 */
export async function loadExistingStems(topicId: string): Promise<string[]> {
  const prisma = getPrisma();
  const questions = await prisma.question.findMany({
    where: { topicId },
    select: { stem: true },
  });
  return questions.map((q) => q.stem);
}

export interface InsertableDraft {
  stem: string;
  options: unknown;
  difficulty:
    | 'BEGINNER'
    | 'BASIC'
    | 'INTERMEDIATE'
    | 'ADVANCED'
    | 'EXPERT';
  explanations: {
    layer: number;
    title: string;
    content: string;
    latexContent: string | null;
  }[];
  format?: string;
}

/**
 * Inserta un reactivo válido con isVerified=false (Etapa 1 → cola de
 * verificación adversarial). Crea las ExplanationLayer en la misma transacción.
 * Siempre GENERATED: la verificación (F2) es el único camino a isVerified=true.
 */
export async function insertQuestion(
  topicId: string,
  draft: InsertableDraft,
): Promise<string> {
  const prisma = getPrisma();
  const created = await prisma.question.create({
    data: {
      topicId,
      stem: draft.stem,
      options: draft.options as object,
      difficulty: draft.difficulty,
      isVerified: false, // ← guardrail: nunca visible sin verificación adversarial
      source: 'GENERATED',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      format: (draft.format ?? 'MULTIPLE_CHOICE') as any,
      explanations: {
        create: draft.explanations.map((e) => ({
          layer: e.layer,
          title: e.title,
          content: e.content,
          latexContent: e.latexContent,
        })),
      },
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * Persiste el resultado del pipeline adversarial (F2): el veredicto completo
 * SIEMPRE se adjunta (publicado o no); isVerified solo si AUTO_APPROVED.
 */
export async function applyVerification(
  questionId: string,
  record: unknown,
  approved: boolean,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.question.update({
    where: { id: questionId },
    data: {
      verification: record as object,
      isVerified: approved,
    },
  });
}

/** Reactivos GENERATED pendientes de verificación adversarial de un tema. */
export async function loadPendingQuestions(topicId: string, limit = 50) {
  const prisma = getPrisma();
  return prisma.question.findMany({
    where: {
      topicId,
      source: 'GENERATED',
      isVerified: false,
      verification: { equals: Prisma.DbNull },
    },
    select: { id: true, stem: true, options: true, format: true },
    take: limit,
  });
}

/**
 * Borra reactivos por id SOLO si no tienen respuestas históricas (guardrail:
 * nunca borrar reactivos con SessionAnswer). Para limpieza de corridas mock.
 */
export async function deleteQuestionsWithoutAnswers(ids: string[]): Promise<number> {
  const prisma = getPrisma();
  const deletable = await prisma.question.findMany({
    where: { id: { in: ids }, answers: { none: {} } },
    select: { id: true },
  });
  const deletableIds = deletable.map((q) => q.id);
  if (deletableIds.length === 0) return 0;
  await prisma.question.deleteMany({ where: { id: { in: deletableIds } } });
  return deletableIds.length;
}
