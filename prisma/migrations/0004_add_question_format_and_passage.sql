-- Migración: Formato de reactivo, pasajes de comprensión lectora e idempotencia de ingesta (CC-09 / CC-01b)
-- Habilita clasificar reactivos oficiales por formato, agrupar comprensión de lectura
-- bajo un Passage compartido, y re-ejecutar la ingesta de guías sin duplicar.

-- 1. Enum de formato de reactivo
CREATE TYPE "QuestionFormat" AS ENUM (
  'MULTIPLE_CHOICE',
  'READING_COMPREHENSION',
  'IMAGE_OPTIONS',
  'CHART_TABLE',
  'MATCHING'
);

-- 2. Tabla de pasajes (texto compartido por varios reactivos de comprensión lectora)
CREATE TABLE "passages" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT,
  "content" TEXT NOT NULL,
  "sourceRef" TEXT,
  "contentSourceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "passages_contentSourceId_fkey" FOREIGN KEY ("contentSourceId")
    REFERENCES "content_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 3. Idempotencia de ingesta por fuente
ALTER TABLE "content_sources" ADD COLUMN "externalRef" TEXT;
CREATE UNIQUE INDEX "content_sources_externalRef_key" ON "content_sources"("externalRef");

-- 4. Formato, pasaje e idempotencia en Question
ALTER TABLE "questions" ADD COLUMN "format" "QuestionFormat" NOT NULL DEFAULT 'MULTIPLE_CHOICE';
ALTER TABLE "questions" ADD COLUMN "passageId" TEXT;
ALTER TABLE "questions" ADD COLUMN "externalRef" TEXT;
CREATE UNIQUE INDEX "questions_externalRef_key" ON "questions"("externalRef");
ALTER TABLE "questions" ADD CONSTRAINT "questions_passageId_fkey" FOREIGN KEY ("passageId")
  REFERENCES "passages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
