-- Bloque 1 (cierre legal para abrir venta) — PROTECCIÓN DE MENORES +
-- CONSENTIMIENTO DEL CHECKOUT (art. 56 LFPC).
--
-- Reporte: .md de retorno de Bloque 1. Idempotente: se puede reaplicar.
--
-- ⚠️ MISMO CRITERIO QUE 0012-0018: SQL plano escrito a mano, aplicado como
-- `postgres` vía el panel/API de Supabase — el rol de la app (`acierta_prod`)
-- NO tiene CREATE sobre `public` ni puede hacer DDL. NO usar `prisma db execute`
-- para esto (devuelve `permission denied for schema public`).
--
-- Los cambios de COLUMNA (user_profiles, subscriptions) SÍ viven en
-- `prisma/schema.prisma`, así que `prisma migrate diff` debe quedar en vacío
-- salvo los índices de rendimiento de 0012 que viven fuera del schema a
-- propósito. La tabla nueva `tutor_consents` también está en el schema.
--
-- Qué hace:
--   1. user_profiles: `birthDate` + `birthDateDeclaredAt` (declaración de edad).
--   2. subscriptions: `art56ConsentAt` + `art56ConsentVersion` (renuncia al
--      derecho de revocación, capturada en el checkout).
--   3. tutor_consents: liga de confirmación del tutor para menores de 18.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. FECHA DE NACIMIENTO EN user_profiles
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3);
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "birthDateDeclaredAt" TIMESTAMP(3);

-- ════════════════════════════════════════════════════════════════════════════
-- 2. CONSENTIMIENTO ART. 56 EN subscriptions
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "art56ConsentAt" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "art56ConsentVersion" TEXT;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. TABLA tutor_consents
-- ════════════════════════════════════════════════════════════════════════════
--
-- ⚠️ `updatedAt` NO lleva DEFAULT: Prisma gestiona `@updatedAt` desde el CLIENTE
-- (añade `SET "updatedAt" = now()` a cada `.update()`). Un DEFAULT rompería el
-- diff vacío de `prisma migrate diff` — misma lección que 0018.

CREATE TABLE IF NOT EXISTS "tutor_consents" (
  "id"               TEXT NOT NULL,
  "studentProfileId" TEXT NOT NULL,
  "tutorEmail"       TEXT NOT NULL,
  "tutorName"        TEXT,
  "relationship"     TEXT,
  "tokenHash"        TEXT NOT NULL,
  "tokenExpiresAt"   TIMESTAMP(3) NOT NULL,
  "dataConsent"      BOOLEAN NOT NULL DEFAULT false,
  "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
  "analyticsConsent" BOOLEAN NOT NULL DEFAULT false,
  "recordingConsent" BOOLEAN NOT NULL DEFAULT false,
  "consentVersion"   TEXT,
  "requestedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt"      TIMESTAMP(3),
  "confirmedIp"      TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tutor_consents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tutor_consents_studentProfileId_fkey" FOREIGN KEY ("studentProfileId")
    REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Idempotencia real (por si una aplicación previa puso el DEFAULT):
ALTER TABLE "tutor_consents" ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE UNIQUE INDEX IF NOT EXISTS "tutor_consents_studentProfileId_key"
  ON "tutor_consents"("studentProfileId");
CREATE UNIQUE INDEX IF NOT EXISTS "tutor_consents_tokenHash_key"
  ON "tutor_consents"("tokenHash");
CREATE INDEX IF NOT EXISTS "tutor_consents_tokenHash_idx"
  ON "tutor_consents"("tokenHash");

-- ── RLS: mismo escalón que las demás tablas de solo servidor (0015/0018) ──────
--
-- La app lee/escribe `tutor_consents` ÚNICAMENTE por Prisma (rol `acierta_prod`,
-- BYPASSRLS) desde Server Actions y Route Handlers guardados. Nadie la toca
-- desde el navegador. RLS habilitada SIN política permisiva = denegación total
-- para `anon`/`authenticated`; el REVOKE es el segundo candado (los privilegios
-- por defecto de un proyecto Supabase conceden escritura a esos roles sobre cada
-- tabla nueva — G73b). El GRANT va al rol de GRUPO `acierta_app` (0015), nunca a
-- una lista de roles de conexión.
--
-- ⚠️ Contiene el correo del TUTOR (dato personal de un tercero, a veces de un
-- menor por asociación): el cierre a `anon`/`authenticated` es especialmente
-- importante aquí.
ALTER TABLE "tutor_consents" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "tutor_consents" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "tutor_consents" TO acierta_app;
