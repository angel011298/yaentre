import { PrismaClient } from '@prisma/client';
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
}

/**
 * Inserta un reactivo válido con isVerified=false (Etapa 1 → cola de revisión
 * humana). Crea las ExplanationLayer en la misma transacción.
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
      isVerified: false, // ← guardrail: nunca visible hasta revisión humana
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
