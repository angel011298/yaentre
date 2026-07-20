import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

/**
 * Clasificación de fragmentos fuente contra la taxonomía sembrada (F2b).
 * Una llamada al modelo por lote de fragmentos decide a qué TEMA del temario
 * corresponde cada uno, o "ninguno" si no aplica. Modelo económico (Sonnet):
 * es una tarea de clasificación, no de generación.
 *
 * GUARDRAIL: solo offline (scripts/). Nunca en runtime.
 */

export const CLASSIFIER_MODEL = 'claude-sonnet-4-6';
const PRICE_IN_PER_MTOK = 3;
const PRICE_OUT_PER_MTOK = 15;
const BATCH_SIZE = 18;

export interface TaxonomyTopic {
  topicId: string;
  subjectId: string;
  subject: string;
  topic: string;
}

export interface ClassifiableChunk {
  id: string; // id del SourceChunk ya insertado (classifiedAt null)
  text: string;
}

export interface ChunkAssignment {
  chunkId: string;
  topicId: string | null; // null = fuera del temario ("ninguno")
  subjectId: string | null;
}

const BatchResultSchema = z.array(
  z.object({
    chunk: z.number().int().min(1),
    topicIndex: z.number().int().min(1).nullable(),
  }),
);

function buildSystem(topics: TaxonomyTopic[]): string {
  const lines = topics.map((t, i) => `${i + 1}. [${t.subject}] ${t.topic}`);
  return [
    'Clasificas fragmentos de guías y materiales de estudio contra el temario',
    'oficial de un examen de admisión (UNAM/IPN). Lista de temas:',
    '',
    ...lines,
    '',
    'Para cada fragmento numerado, decide el tema MÁS específico al que',
    'corresponde su contenido, o null si no corresponde a ninguno (páginas',
    'administrativas, convocatoria, trámites, publicidad, contenido de otra',
    'materia no listada).',
    '',
    'Responde ÚNICAMENTE con un array JSON:',
    '[{ "chunk": <n>, "topicIndex": <índice de la lista o null> }, ...]',
  ].join('\n');
}

function extractJsonArray(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('[');
  const end = candidate.lastIndexOf(']');
  if (start === -1 || end <= start) throw new Error('Sin array JSON en la respuesta');
  return JSON.parse(candidate.slice(start, end + 1));
}

/** Estimación de costo ANTES de llamar (para reportar si no hay saldo). */
export function estimateClassificationCostUsd(
  chunks: { text: string }[],
  topicCount: number,
): number {
  const chunkTokens = chunks.reduce((n, c) => n + Math.ceil(c.text.length / 3.6), 0);
  const batches = Math.ceil(chunks.length / BATCH_SIZE);
  const systemTokens = batches * (topicCount * 12 + 180); // lista de temas por lote
  const outputTokens = chunks.length * 14; // {"chunk":n,"topicIndex":m}
  return (
    ((chunkTokens + systemTokens) * PRICE_IN_PER_MTOK + outputTokens * PRICE_OUT_PER_MTOK) /
    1_000_000
  );
}

export interface ClassificationRun {
  assignments: ChunkAssignment[];
  costUsd: number;
}

export async function classifyChunks(
  chunks: ClassifiableChunk[],
  topics: TaxonomyTopic[],
  apiKey: string,
): Promise<ClassificationRun> {
  const client = new Anthropic({ apiKey });
  const system = buildSystem(topics);
  const assignments: ChunkAssignment[] = [];
  let costUsd = 0;

  for (let offset = 0; offset < chunks.length; offset += BATCH_SIZE) {
    const batch = chunks.slice(offset, offset + BATCH_SIZE);
    const user = batch
      .map((c, i) => `FRAGMENTO ${i + 1}:\n${c.text.slice(0, 1500)}`)
      .join('\n\n---\n\n');

    const response = await client.messages.create({
      model: CLASSIFIER_MODEL,
      max_tokens: 2000,
      system,
      messages: [{ role: 'user', content: user }],
    });
    costUsd +=
      (response.usage.input_tokens * PRICE_IN_PER_MTOK +
        response.usage.output_tokens * PRICE_OUT_PER_MTOK) /
      1_000_000;

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    const parsed = BatchResultSchema.parse(extractJsonArray(text));

    for (const row of parsed) {
      const chunk = batch[row.chunk - 1];
      if (!chunk) continue;
      const topic =
        row.topicIndex !== null && topics[row.topicIndex - 1]
          ? topics[row.topicIndex - 1]
          : null;
      assignments.push({
        chunkId: chunk.id,
        topicId: topic?.topicId ?? null,
        subjectId: topic?.subjectId ?? null,
      });
    }
  }

  return { assignments, costUsd };
}
