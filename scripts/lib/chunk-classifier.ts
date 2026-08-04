import { z } from 'zod';

/**
 * Clasificación de fragmentos fuente contra la taxonomía sembrada (F2b) — vía
 * SESIÓN de Claude Code (G2), no vía API de pago. Este módulo es PURO: solo
 * arma el lote exportable y valida/traduce la respuesta; la clasificación en
 * sí ocurre dentro de una sesión de Claude Code o de chat que lee el archivo
 * exportado por scripts/classify-chunks-export.ts.
 */

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

export interface ClassificationTopicRef {
  index: number;
  subject: string;
  topic: string;
}

export interface ClassificationChunkRef {
  chunkId: string;
  index: number;
  text: string;
}

export interface ClassificationBatch {
  topics: ClassificationTopicRef[];
  chunks: ClassificationChunkRef[];
}

/**
 * Arma el lote exportable: temas numerados (para que la sesión responda con
 * un índice corto en vez de reescribir el nombre completo) + fragmentos con
 * su `chunkId` real (ancla estable — la respuesta referencia el chunk por id,
 * no por posición, así que sigue siendo válida aunque el conjunto de
 * pendientes cambie entre exportar y aplicar).
 */
export function buildClassificationBatch(
  chunks: ClassifiableChunk[],
  topics: TaxonomyTopic[],
): ClassificationBatch {
  return {
    topics: topics.map((t, i) => ({ index: i + 1, subject: t.subject, topic: t.topic })),
    chunks: chunks.map((c, i) => ({ chunkId: c.id, index: i + 1, text: c.text.slice(0, 1500) })),
  };
}

export const ClassificationResultSchema = z.array(
  z.object({
    chunkId: z.string().min(1),
    topicIndex: z.number().int().min(1).nullable(),
  }),
);
export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

/** Traduce los resultados (chunkId + índice de tema) a `ChunkAssignment[]`
 *  contra la lista de temas VIGENTE (recargada al aplicar, ver
 *  scripts/classify-chunks-apply.ts) — `topics` debe estar en el mismo orden
 *  con el que se exportó el lote para que los índices sigan siendo válidos. */
export function applyClassificationResults(
  results: ClassificationResult,
  topics: TaxonomyTopic[],
): ChunkAssignment[] {
  return results.map((r) => {
    const topic = r.topicIndex !== null ? topics[r.topicIndex - 1] : undefined;
    return {
      chunkId: r.chunkId,
      topicId: topic?.topicId ?? null,
      subjectId: topic?.subjectId ?? null,
    };
  });
}
