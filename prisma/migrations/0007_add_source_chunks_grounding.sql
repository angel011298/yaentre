-- Migración: anclaje en documentos fuente e ingesta continua (F2b)
--
-- 1. enum GroundingStatus + Question.groundingStatus (default TEMARIO_ONLY):
--    transparencia sobre si un reactivo se derivó de un fragmento real de un
--    documento fuente (SOURCED) o solo del temario oficial (TEMARIO_ONLY).
-- 2. source_chunks: fragmentos reales de documentos fuente, clasificados por
--    tema/materia de la taxonomía. classifiedAt null = clasificación pendiente;
--    classifiedAt set + topicId null = fuera del temario.
-- 3. question_source_chunks: trazabilidad muchos-a-muchos reactivo ↔ fragmento.
-- 4. content_sources.contentHash (SHA-256, unique): el escáner de ingesta
--    continua (scripts/scan-and-ingest.ts) detecta archivos nuevos O
--    MODIFICADOS por contenido, no por nombre.
--
-- RLS: source_chunks y question_source_chunks NUNCA son legibles por usuarios
-- finales — solo ADMIN (public.is_admin, SECURITY DEFINER de 0001). El
-- pipeline escribe con el rol de servicio (BYPASSRLS). Mismo tratamiento que
-- el contenido no-servible (CALIBRATION_ONLY).

CREATE TYPE "GroundingStatus" AS ENUM ('SOURCED', 'TEMARIO_ONLY');

ALTER TABLE "content_sources" ADD COLUMN IF NOT EXISTS "contentHash" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "content_sources_contentHash_key" ON "content_sources"("contentHash");

CREATE TABLE "source_chunks" (
  "id" TEXT NOT NULL,
  "contentSourceId" TEXT NOT NULL,
  "topicId" TEXT,
  "subjectId" TEXT,
  "text" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "locationRef" TEXT,
  "classifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "source_chunks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "source_chunks_contentSourceId_fkey" FOREIGN KEY ("contentSourceId")
    REFERENCES "content_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "source_chunks_topicId_fkey" FOREIGN KEY ("topicId")
    REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "source_chunks_subjectId_fkey" FOREIGN KEY ("subjectId")
    REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "source_chunks_topicId_idx" ON "source_chunks"("topicId");
CREATE INDEX "source_chunks_contentSourceId_idx" ON "source_chunks"("contentSourceId");
CREATE INDEX "source_chunks_classifiedAt_idx" ON "source_chunks"("classifiedAt");

CREATE TABLE "question_source_chunks" (
  "questionId" TEXT NOT NULL,
  "sourceChunkId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "question_source_chunks_pkey" PRIMARY KEY ("questionId","sourceChunkId"),
  CONSTRAINT "question_source_chunks_questionId_fkey" FOREIGN KEY ("questionId")
    REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "question_source_chunks_sourceChunkId_fkey" FOREIGN KEY ("sourceChunkId")
    REFERENCES "source_chunks"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "questions" ADD COLUMN "groundingStatus" "GroundingStatus" NOT NULL DEFAULT 'TEMARIO_ONLY';

ALTER TABLE source_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only_source_chunks" ON source_chunks
  FOR SELECT USING (public.is_admin());

ALTER TABLE question_source_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only_question_source_chunks" ON question_source_chunks
  FOR SELECT USING (public.is_admin());
