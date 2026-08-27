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
  /** F2b: ids de SourceChunk citados. Vacío ⇒ TEMARIO_ONLY; con ids ⇒ SOURCED. */
  sourceChunkIds?: string[];
  /** G22: id del Passage compartido (comprensión de lectura). null salvo RC. */
  passageId?: string | null;
}

/**
 * Encuentra (por contenido exacto) o crea un `Passage` para el pipeline G2.
 * Idempotente: reinsertar el mismo lote no duplica el texto compartido — dos
 * reactivos con el mismo `passage.ref` en el JSON de un lote terminan
 * apuntando a la misma fila. `contentSourceId` queda null (contenido generado
 * en sesión, no ingesta de guía).
 */
export async function findOrCreatePassage(input: {
  title: string | null;
  content: string;
  sourceRef: string | null;
}): Promise<{ id: string; created: boolean }> {
  const prisma = getPrisma();
  const existing = await prisma.passage.findFirst({
    where: { content: input.content },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };
  const row = await prisma.passage.create({
    data: {
      title: input.title,
      content: input.content,
      sourceRef: input.sourceRef,
    },
    select: { id: true },
  });
  return { id: row.id, created: true };
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
  const chunkIds = draft.sourceChunkIds ?? [];
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
      // F2b: trazabilidad — SOURCED solo si cita fragmentos reales
      groundingStatus: chunkIds.length > 0 ? 'SOURCED' : 'TEMARIO_ONLY',
      // G22: estímulo compartido de comprensión de lectura (null salvo RC)
      passageId: draft.passageId ?? null,
      sourceChunks: {
        create: chunkIds.map((sourceChunkId) => ({ sourceChunkId })),
      },
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

// ── F2b: escáner de ingesta continua y anclaje en fuentes ──────────────

export interface ScannedSourceInput {
  name: string;
  fileRef: string; // ruta relativa en el repo
  contentHash: string; // SHA-256 del archivo
  institution?: string | null;
}

/**
 * Busca si un archivo YA está registrado: primero por hash de contenido
 * (detecta renombrados), luego por fileRef (adopta registros pre-F2b sin hash,
 * actualizándolos con el hash para futuras corridas). Devuelve null si es
 * material nuevo o una versión modificada de un archivo conocido.
 */
export async function findRegisteredSource(
  contentHash: string,
  fileRef: string,
): Promise<{ id: string; adopted: boolean; chunkCount: number } | null> {
  const prisma = getPrisma();
  const byHash = await prisma.contentSource.findUnique({
    where: { contentHash },
    include: { _count: { select: { chunks: true } } },
  });
  if (byHash) return { id: byHash.id, adopted: false, chunkCount: byHash._count.chunks };

  const byRef = await prisma.contentSource.findFirst({
    where: { fileRef, contentHash: null },
    include: { _count: { select: { chunks: true } } },
  });
  if (byRef) {
    await prisma.contentSource.update({
      where: { id: byRef.id },
      data: { contentHash },
    });
    return { id: byRef.id, adopted: true, chunkCount: byRef._count.chunks };
  }
  return null;
}

/** Variante por nombre base de archivo (los ContentSource de CC-09 guardan
 *  fileRef con rutas distintas). Solo adopta registros sin hash. */
export async function findSourceByBasename(
  base: string,
  contentHash: string,
): Promise<{ id: string; adopted: boolean; chunkCount: number } | null> {
  const prisma = getPrisma();
  const candidate = await prisma.contentSource.findFirst({
    where: { contentHash: null, fileRef: { contains: base } },
    include: { _count: { select: { chunks: true } } },
  });
  if (!candidate) return null;
  await prisma.contentSource.update({
    where: { id: candidate.id },
    data: { contentHash },
  });
  return { id: candidate.id, adopted: true, chunkCount: candidate._count.chunks };
}

export async function registerScannedSource(input: ScannedSourceInput): Promise<string> {
  const prisma = getPrisma();
  const created = await prisma.contentSource.create({
    data: {
      name: input.name,
      fileRef: input.fileRef,
      contentHash: input.contentHash,
      institution: input.institution ?? null,
      license: 'Material de estudio aportado por el propietario del proyecto',
    },
    select: { id: true },
  });
  return created.id;
}

export interface InsertableChunk {
  text: string;
  excerpt: string;
  locationRef: string;
}

export async function insertSourceChunks(
  contentSourceId: string,
  chunks: InsertableChunk[],
): Promise<number> {
  const prisma = getPrisma();
  const res = await prisma.sourceChunk.createMany({
    data: chunks.map((c) => ({
      contentSourceId,
      text: c.text,
      excerpt: c.excerpt,
      locationRef: c.locationRef,
    })),
  });
  return res.count;
}

/** Chunks sin clasificar (classifiedAt null) para pasarlos al clasificador. */
export async function loadUnclassifiedChunks(limit = 5000) {
  const prisma = getPrisma();
  return prisma.sourceChunk.findMany({
    where: { classifiedAt: null },
    select: { id: true, text: true },
    take: limit,
    orderBy: { createdAt: 'asc' },
  });
}

export async function applyChunkClassifications(
  assignments: { chunkId: string; topicId: string | null; subjectId: string | null }[],
): Promise<void> {
  const prisma = getPrisma();
  const now = new Date();
  for (const a of assignments) {
    await prisma.sourceChunk.update({
      where: { id: a.chunkId },
      data: { topicId: a.topicId, subjectId: a.subjectId, classifiedAt: now },
    });
  }
}

/** Taxonomía plana (tema + materia) para el prompt del clasificador. */
export async function loadTaxonomyTopics() {
  const prisma = getPrisma();
  const topics = await prisma.topic.findMany({
    include: { subject: { select: { id: true, name: true } } },
    orderBy: [{ subjectId: 'asc' }, { position: 'asc' }],
  });
  return topics.map((t) => ({
    topicId: t.id,
    subjectId: t.subject.id,
    subject: t.subject.name,
    topic: t.name,
  }));
}

/** Fragmentos clasificados de un tema, para anclar la generación (F2b). */
export async function loadTopicChunks(topicId: string, limit = 12) {
  const prisma = getPrisma();
  const chunks = await prisma.sourceChunk.findMany({
    where: { topicId },
    include: { contentSource: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
  return chunks.map((c) => ({
    id: c.id,
    text: c.text,
    locationRef: c.locationRef,
    sourceName: c.contentSource.name,
  }));
}

/** Cobertura del temario: temas con y sin fragmentos fuente. */
export async function topicChunkCoverage() {
  const prisma = getPrisma();
  const topics = await prisma.topic.findMany({
    select: { id: true, _count: { select: { sourceChunks: true } } },
  });
  const withChunks = topics.filter((t) => t._count.sourceChunks > 0).length;
  return { totalTopics: topics.length, withChunks, withoutChunks: topics.length - withChunks };
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

// ── Muestreo de auditoría 5% (tercera pasada, G17) ──

/**
 * Reactivos ya auto-aprobados (isVerified=true) cuyo veredicto TODAVÍA no
 * pasó por la tercera pasada de auditoría (`verification.audit` sigue en
 * null, tal como lo deja `content-resolve-verification.ts` en cada
 * aprobación) — el pool elegible para `sampleForAudit`
 * (scripts/lib/resolution.ts). Una vez auditado, `audit` deja de ser null
 * (queda `{ verdict, decision, reasons, degraded }`) y el reactivo sale del
 * pool, se haya degradado o no — la auditoría es una pasada, no un chequeo
 * recurrente sobre el mismo reactivo.
 */
export async function loadApprovedQuestionsForAudit(
  limit = 2000,
): Promise<{ id: string; createdAt: Date }[]> {
  const prisma = getPrisma();
  return prisma.question.findMany({
    where: {
      isVerified: true,
      verification: { not: Prisma.DbNull, path: ['audit'], equals: Prisma.JsonNull },
    },
    select: { id: true, createdAt: true },
    orderBy: { id: 'asc' },
    take: limit,
  });
}

/** Un reactivo con su registro de verificación COMPLETO (no solo las
 *  opciones) — usado por el script de resolución de auditoría para
 *  construir `verification.audit` sobre el registro existente sin perder
 *  `pipeline`/`decision`/`reasons`/`generatorOption` ya presentes. */
export async function loadQuestionForAudit(
  id: string,
): Promise<{ id: string; options: unknown; verification: unknown } | null> {
  const prisma = getPrisma();
  return prisma.question.findUnique({
    where: { id },
    select: { id: true, options: true, verification: true },
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

export interface QuestionWithBlindContext {
  id: string;
  stem: string;
  options: unknown;
  format: string;
  passageContent: string | null;
  topic: string;
  subject: string;
  institution: string;
}

function mapWithBlindContext(rows: {
  id: string;
  stem: string;
  options: unknown;
  format: string;
  passage: { content: string } | null;
  topic: { name: string; subject: { name: string; area: { exam: { level: { institution: { name: string } } } } } };
}[]): QuestionWithBlindContext[] {
  return rows.map((q) => ({
    id: q.id,
    stem: q.stem,
    options: q.options,
    format: q.format,
    passageContent: q.passage?.content ?? null,
    topic: q.topic.name,
    subject: q.topic.subject.name,
    institution: q.topic.subject.area.exam.level.institution.name,
  }));
}

const BLIND_CONTEXT_INCLUDE = {
  passage: { select: { content: true } },
  topic: {
    select: {
      name: true,
      subject: {
        select: {
          name: true,
          area: {
            select: {
              exam: { select: { level: { select: { institution: { select: { name: true } } } } } },
            },
          },
        },
      },
    },
  },
} as const;

/**
 * Reactivos GENERATED pendientes de verificación, con contexto taxonómico
 * completo por reactivo (G2) — a diferencia de `loadPendingQuestions`, no
 * asume un único tema por lote: sirve tanto a `--topic` como a `--ids`
 * (reusable para el muestreo de auditoría 5%, que apunta a ids ya aprobados
 * de temas distintos) y a `--all`.
 */
export async function loadPendingQuestionsWithContext(opts: {
  topicId?: string;
  limit?: number;
}): Promise<QuestionWithBlindContext[]> {
  const prisma = getPrisma();
  const rows = await prisma.question.findMany({
    where: {
      ...(opts.topicId ? { topicId: opts.topicId } : {}),
      source: 'GENERATED',
      isVerified: false,
      verification: { equals: Prisma.DbNull },
    },
    select: { id: true, stem: true, options: true, format: true, ...BLIND_CONTEXT_INCLUDE },
    take: opts.limit ?? 50,
    orderBy: { id: 'asc' },
  });
  return mapWithBlindContext(rows);
}

/** Reactivos por id explícito, con el mismo contexto — para lotes de
 *  verificación dirigidos a un conjunto puntual (p. ej. muestreo de
 *  auditoría 5% sobre ya-aprobados, `sampleForAudit` en resolution.ts). */
export async function loadQuestionsByIds(ids: string[]): Promise<QuestionWithBlindContext[]> {
  if (ids.length === 0) return [];
  const prisma = getPrisma();
  const rows = await prisma.question.findMany({
    where: { id: { in: ids } },
    select: { id: true, stem: true, options: true, format: true, ...BLIND_CONTEXT_INCLUDE },
  });
  return mapWithBlindContext(rows);
}

/** Un reactivo por id con sus opciones reales (incl. isCorrect) — usado por el
 *  script de resolución para comparar contra la respuesta de la sesión
 *  verificadora. `null` si no existe. */
export async function loadQuestionForResolution(
  id: string,
): Promise<{ id: string; options: unknown } | null> {
  const prisma = getPrisma();
  return prisma.question.findUnique({ where: { id }, select: { id: true, options: true } });
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
