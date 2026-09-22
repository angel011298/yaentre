-- G99 (continuación) — NOTAS DEL PANEL DE ADMINISTRACIÓN.
--
-- Apartado dentro de /admin/boveda: notas de texto que cualquier ADMIN puede
-- crear, ver y borrar, persistidas en Postgres para que sean las MISMAS sin
-- importar en qué dispositivo o sesión se abra el panel — el requisito
-- explícito del encargo descarta localStorage por diseño (es por-navegador,
-- no sobrevive a un dispositivo nuevo).
--
-- Reglas de este repo (0012-0017): SQL plano escrito a mano, aplicado como
-- `postgres` vía el panel/API de Supabase — el rol de la app no tiene CREATE
-- sobre `public`. Ninguna lista de roles (G73b): el privilegio va al rol de
-- grupo `acierta_app` de la migración 0015.
--
-- Idempotente: se puede reaplicar sin romper.

-- ⚠️ `updatedAt` NO lleva DEFAULT: Prisma gestiona `@updatedAt` desde el
-- CLIENTE (añade `SET "updatedAt" = now()` a cada `.update()`), no con un
-- trigger ni un default de Postgres. Un DEFAULT aquí no rompe nada en
-- runtime, pero `prisma migrate diff` deja de dar el diff vacío que este
-- repo usa como validación fuerte — se detectó y se corrigió antes de que
-- quedara como una discrepancia más "aceptada".
CREATE TABLE IF NOT EXISTS "admin_notes" (
  "id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "authorId" TEXT,
  "authorEmail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "admin_notes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admin_notes_authorId_fkey" FOREIGN KEY ("authorId")
    REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Compatibilidad con una aplicación previa de esta migración que sí puso el
-- DEFAULT (idempotencia real, no solo de la creación de la tabla):
ALTER TABLE "admin_notes" ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE INDEX IF NOT EXISTS "admin_notes_createdAt_idx" ON "admin_notes"("createdAt");

-- ── RLS: mismo escalón que admin_audit_log / admin_files ───────────────────
--
-- Nadie lee ni escribe esta tabla desde el navegador: el panel la consulta
-- ÚNICAMENTE por Prisma (rol `acierta_prod`, BYPASSRLS), detrás de
-- `requireRole('ADMIN')`. RLS habilitada SIN ninguna política permisiva =
-- denegación total para `anon`/`authenticated`; el REVOKE es el segundo
-- candado, porque los privilegios por defecto de un proyecto Supabase
-- conceden escritura a `anon`/`authenticated` sobre CADA tabla nueva (G73b).
ALTER TABLE "admin_notes" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "admin_notes" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "admin_notes" TO acierta_app;
