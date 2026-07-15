-- Migración: Agregar procedencia y uso del contenido (CC-01c)
-- Separa contenido generado, oficial e importado
-- Marca reactivos como SERVABLE o CALIBRATION_ONLY

-- 1. Crear enums para procedencia y uso
CREATE TYPE "QuestionSource" AS ENUM ('GENERATED', 'OFFICIAL_SAMPLE', 'IMPORTED');
CREATE TYPE "QuestionUsage" AS ENUM ('SERVABLE', 'CALIBRATION_ONLY');

-- 2. Crear tabla ContentSource (catálogo de fuentes ingeridas)
CREATE TABLE "content_sources" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "institution" TEXT,
  "type" TEXT,
  "year" INTEGER,
  "fileRef" TEXT,
  "license" TEXT,
  "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Agregar columnas a Question
ALTER TABLE "questions" ADD COLUMN "source" "QuestionSource" NOT NULL DEFAULT 'GENERATED';
ALTER TABLE "questions" ADD COLUMN "usage" "QuestionUsage" NOT NULL DEFAULT 'SERVABLE';
ALTER TABLE "questions" ADD COLUMN "sourceRef" TEXT;
ALTER TABLE "questions" ADD COLUMN "contentSourceId" TEXT;

-- 4. Agregar FK a contentSource (nullable)
ALTER TABLE "questions" ADD CONSTRAINT "questions_contentSourceId_fkey"
  FOREIGN KEY ("contentSourceId") REFERENCES "content_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Agregar índice en usage (para filtrar SERVABLE en queries críticas)
CREATE INDEX "questions_usage_idx" ON "questions"("usage");

-- 6. Agregar índice parcial para queries de usuario (solo SERVABLE + verificados)
CREATE INDEX "questions_servable_verified_idx"
  ON "questions"("topic_id", "difficulty")
  WHERE "usage" = 'SERVABLE' AND "is_verified" = true;
