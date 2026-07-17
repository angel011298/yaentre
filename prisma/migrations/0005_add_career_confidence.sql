-- Migración: Confianza y fuentes de Career.minAciertos (CC-13)
-- Arranque en frío del Aciertómetro: minAciertos se puebla por triangulación
-- multi-fuente (oficial/transparencia + compilaciones públicas). Estos campos
-- registran CUÁNTO confiar en cada valor y de dónde salió, para que el
-- Aciertómetro nunca presente la meta como verdad absoluta.

CREATE TYPE "ConfidenceLevel" AS ENUM ('HIGH', 'MED', 'LOW');

ALTER TABLE "careers" ADD COLUMN "minAciertosConfidence" "ConfidenceLevel";
ALTER TABLE "careers" ADD COLUMN "sources" JSONB;
