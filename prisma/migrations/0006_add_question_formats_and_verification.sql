-- Migración: formatos de reactivo del examen real + verificación adversarial (F2)
--
-- 1. Amplía QuestionFormat con los formatos que aparecen en los exámenes
--    reales de UNAM/IPN/UAM/EXANI (guías oficiales): completar oración,
--    analogías, ordenamiento, series numéricas, resolución de problemas,
--    series espaciales, imaginación espacial. Los formatos "pregunta directa"
--    (MULTIPLE_CHOICE), "relación de columnas" (MATCHING) y "comprensión de
--    lectura" (READING_COMPREHENSION) ya existían.
--
-- 2. Agrega questions.verification (JSONB): el veredicto COMPLETO del pipeline
--    adversarial — modelo verificador, opción elegida, confianza, problemas
--    detectados, decisión (AUTO_APPROVED/UNPUBLISHED), y tercera pasada de
--    auditoría si aplica. Los reactivos sin publicar conservan aquí el
--    veredicto para consulta futura (F3: panel de discrepancias).
--
-- Nota: el soporte de imagen por opción NO requiere DDL — questions.options es
-- JSONB y el contrato Zod (scripts/lib/question-draft-schema.ts) acepta
-- imageUrl opcional por opción. El formato IMAGE_OPTIONS ya existía.

ALTER TYPE "QuestionFormat" ADD VALUE IF NOT EXISTS 'SENTENCE_COMPLETION';
ALTER TYPE "QuestionFormat" ADD VALUE IF NOT EXISTS 'ANALOGY';
ALTER TYPE "QuestionFormat" ADD VALUE IF NOT EXISTS 'ORDERING';
ALTER TYPE "QuestionFormat" ADD VALUE IF NOT EXISTS 'NUMERIC_SERIES';
ALTER TYPE "QuestionFormat" ADD VALUE IF NOT EXISTS 'PROBLEM_SOLVING';
ALTER TYPE "QuestionFormat" ADD VALUE IF NOT EXISTS 'SPATIAL_SERIES';
ALTER TYPE "QuestionFormat" ADD VALUE IF NOT EXISTS 'SPATIAL_IMAGINATION';

ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "verification" JSONB;
