-- G103 — TEMPORALIDAD DE ACCESO (spec horarios/cursos/temporalidad §3).
--
-- Reporte: docs/ESTADO.md §G103 y docs/RETORNO_HORARIOS_CURSOS.md.
-- Mismo camino que 0012-0018: SQL plano aplicado como `postgres` por el
-- panel/API de Supabase (el rol de la app no tiene CREATE sobre `public`).
-- Idempotente: se puede reaplicar sin romper.
--
-- 100 % ADITIVA Y RETROCOMPATIBLE: columnas nulas o con DEFAULT, un índice.
-- El código anterior a G103 no las lee ni las escribe, así que esta migración
-- puede aplicarse ANTES del despliegue del código y sobrevive a una reversa
-- del despliegue.

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "graceEndsAt" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "extendedAt" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "originalExpiresAt" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "extensionConsentAt" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "extensionConsentVersion" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "expiryNoticesSent" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS "subscriptions_status_expiresAt_idx"
  ON "subscriptions"("status", "expiresAt");

-- ── BACKFILL (documentado, idempotente, reversible) ─────────────────────────
--
-- Regla: NO se recorta ni se alarga la vigencia (`expiresAt`) de ninguna
-- suscripción existente. Las de Pase/Premium vendidas antes de G103 conservan
-- su fecha (la del examen, o el respaldo de 150 días). Lo único que se agrega
-- es la gracia de 7 días que la regla nueva da a TODOS (spec §7.3: «nunca
-- bloquear acceso sin dar el periodo de gracia»). El Mensual (`expiresAt`
-- NULL) no se toca: su ciclo es de Stripe.
--
-- Censo de producción al 2026-10-23: 1 fila afectada (PREMIUM ACTIVE, vence
-- 2027-07-25, fixture E2E). Las columnas son `timestamp without time zone` en
-- UTC; México no tiene horario de verano desde 2022, así que +7 días exactos
-- coincide con `calculateGraceEndsAt` (src/lib/subscriptions/access-duration.ts).
--
-- REVERSA del backfill (si hiciera falta) — solo las filas que existían al
-- aplicar esta migración (la hora exacta queda en docs/ESTADO.md §G103); las
-- activadas después ya nacen con su `graceEndsAt` y no se tocan:
--   UPDATE "subscriptions" SET "graceEndsAt" = NULL
--   WHERE "extendedAt" IS NULL
--     AND "graceEndsAt" = "expiresAt" + interval '7 days'
--     AND "createdAt" < TIMESTAMP '<hora de aplicación de 0019, UTC>';
UPDATE "subscriptions"
SET "graceEndsAt" = "expiresAt" + interval '7 days'
WHERE "expiresAt" IS NOT NULL AND "graceEndsAt" IS NULL;
