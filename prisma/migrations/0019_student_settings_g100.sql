-- G100 — AJUSTES DEL ALUMNO (fase 1 de la revisión de configuración).
--
--  * user_profiles: tamaño de letra, meta diaria, materias a reforzar y el
--    horario de los recordatorios. `themePref` ya era TEXT libre: el valor
--    nuevo "system" no necesita DDL.
--  * NotificationType: STUDY_REMINDER y SIMULATION_REMINDER.
--  * notification_deliveries: un correo programado por (usuario, tipo, día) —
--    candado de idempotencia del cron HORARIO de recordatorios.
--  * system_settings: ajustes del sistema con autor y fecha (latido del cron
--    horario ahora; modo mantenimiento en la fase 2).
--
-- Reglas de este repo (0012-0018): SQL plano, aplicado como `postgres`; el
-- privilegio va al rol de grupo `acierta_app` (0015), nunca a una lista de
-- roles (G73b). Idempotente: se puede reaplicar sin romper.
--
-- DDL generado con `prisma migrate diff` contra el schema anterior y envuelto
-- en IF NOT EXISTS; validar después con `prisma migrate diff` contra la base.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'STUDY_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SIMULATION_REMINDER';

ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "dailyGoalMins"   INTEGER   NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS "focusSubjectIds" TEXT[]    DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "fontScale"       TEXT      NOT NULL DEFAULT 'md',
  ADD COLUMN IF NOT EXISTS "reminderDays"    INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
  ADD COLUMN IF NOT EXISTS "reminderHour"    INTEGER   NOT NULL DEFAULT 18;

CREATE TABLE IF NOT EXISTS "notification_deliveries" (
  "id" TEXT NOT NULL,
  "userProfileId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "dayKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_deliveries_userProfileId_fkey" FOREIGN KEY ("userProfileId")
    REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_deliveries_userProfileId_type_dayKey_key"
  ON "notification_deliveries"("userProfileId", "type", "dayKey");

-- ⚠️ `updatedAt` sin DEFAULT: Prisma lo pone desde el cliente (ver 0018).
CREATE TABLE IF NOT EXISTS "system_settings" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- ── RLS ─────────────────────────────────────────────────────────────────────
--
-- Ninguna de las dos tablas se lee desde el navegador: la app las toca solo
-- por Prisma (BYPASSRLS) desde el servidor. RLS habilitada SIN políticas
-- permisivas + REVOKE explícito, porque los privilegios por defecto de un
-- proyecto Supabase conceden escritura a `anon`/`authenticated` sobre cada
-- tabla nueva (G73b). `system_settings` guardará el interruptor de
-- mantenimiento: que la anon key pudiera escribirlo sería un apagado remoto.
ALTER TABLE "notification_deliveries" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "notification_deliveries" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "notification_deliveries" TO acierta_app;

ALTER TABLE "system_settings" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "system_settings" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "system_settings" TO acierta_app;
