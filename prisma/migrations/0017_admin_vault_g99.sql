-- G99 parte A2 — BÓVEDA DE ARCHIVOS DEL ADMINISTRADOR.
--
-- Reporte: docs/ESTADO.md §G99. Idempotente: se puede reaplicar sin romper.
--
-- ⚠️ Mismo criterio que 0016: `admin_files` SÍ vive en `schema.prisma` y se
-- edita a mano para que coincida EXACTO (validado con `prisma migrate diff`).
-- El bucket y sus políticas viven en `storage`, invisibles para Prisma.
--
-- ⚠️ DDL aplicado como `postgres` por el panel/API de Supabase: el rol de la
-- app no tiene CREATE sobre `public` ni sobre `storage`.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. EL BUCKET — PRIVADO, Y SIN NADA QUE CADUQUE
-- ════════════════════════════════════════════════════════════════════════════
--
-- `public = false`, a diferencia de `avatars` (0008) y `guias-oficiales`: el
-- contenido de la bóveda es material de administración, no fotos de perfil.
-- Con el bucket privado, `getPublicUrl` devuelve una URL que **no sirve**: la
-- única forma de leer un objeto es con una sesión autorizada. Eso se verifica
-- por EFECTO en `pnpm admin:vault`, no se da por hecho.
--
-- 🔒 REQUISITO EXPLÍCITO DEL DUEÑO (G99): **los archivos subidos se guardan
-- hasta que el admin maestro los elimine.** En consecuencia, y a propósito:
--   · el bucket NO lleva `file_size_limit` ni `allowed_mime_types` que puedan
--     rechazar algo en silencio más tarde — la lista blanca y el tope de
--     tamaño se aplican en la Server Action, donde producen un mensaje que el
--     administrador puede leer;
--   · NO se define ninguna regla de ciclo de vida, expiración ni TTL;
--   · NO hay ningún cron, job ni sonda que borre objetos de este bucket.
--     `pnpm verify:cleanup` NO lo toca (comprobado: solo borra perfiles de
--     sondeo, consentimientos MARKETING y suscripciones de E2E).
--   · el ÚNICO camino de borrado es `deleteVaultFileAction`, que exige admin
--     maestro y deja fila en la bitácora.

INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-vault', 'admin-vault', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ── Políticas: SOLO perfiles con role = 'ADMIN' ─────────────────────────────
--
-- Se reutiliza `public.is_admin()` (migración 0001): función SECURITY DEFINER
-- propiedad de `postgres` que resuelve el rol sin re-disparar RLS sobre
-- `user_profiles` (la recursión infinita que documentó F1). Escribir el JOIN a
-- mano aquí repetiría esa trampa y duplicaría la definición de "quién es
-- admin" en dos sitios que podrían desincronizarse.
--
-- Nombres reales comprobados en la base ANTES de escribir esto: la tabla es
-- `public.user_profiles`, y sus columnas conservan el camelCase de Prisma
-- (`"userId"`, `role`, `id`) — pero nada de eso se toca aquí precisamente
-- porque `is_admin()` ya lo encapsula.

DROP POLICY IF EXISTS "admin_vault_select" ON storage.objects;
CREATE POLICY "admin_vault_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'admin-vault' AND (SELECT public.is_admin()));

DROP POLICY IF EXISTS "admin_vault_insert" ON storage.objects;
CREATE POLICY "admin_vault_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'admin-vault' AND (SELECT public.is_admin()));

DROP POLICY IF EXISTS "admin_vault_update" ON storage.objects;
CREATE POLICY "admin_vault_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'admin-vault' AND (SELECT public.is_admin()));

DROP POLICY IF EXISTS "admin_vault_delete" ON storage.objects;
CREATE POLICY "admin_vault_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'admin-vault' AND (SELECT public.is_admin()));

-- ════════════════════════════════════════════════════════════════════════════
-- 2. EL ÍNDICE DE LA BÓVEDA
-- ════════════════════════════════════════════════════════════════════════════
--
-- El listado se sirve de ESTA tabla, no de listar el bucket. Dos razones:
-- listar un bucket es una llamada de red por página, y el nombre ORIGINAL del
-- archivo no puede vivir en el path (ver la Server Action: el path se deriva
-- de `crypto.randomUUID()` y la extensión del TIPO declarado, nunca del nombre
-- que mandó el cliente).
--
-- 🔒 INTEGRIDAD REFERENCIAL, misma regla que la bitácora: `uploadedById` es
-- NULABLE con ON DELETE **SET NULL**, jamás CASCADE. El requisito es que el
-- archivo se guarde hasta que el admin maestro lo elimine — si la fila
-- desapareciera al borrarse la cuenta de quien lo subió, el objeto quedaría
-- huérfano en el bucket y fuera del listado: ni accesible ni borrable.
-- `uploadedByEmail` guarda la instantánea legible que sobrevive a ese borrado.

CREATE TABLE IF NOT EXISTS "admin_files" (
  "id" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "uploadedById" TEXT,
  "uploadedByEmail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "admin_files_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admin_files_uploadedById_fkey" FOREIGN KEY ("uploadedById")
    REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "admin_files_path_key" ON "admin_files"("path");
CREATE INDEX IF NOT EXISTS "admin_files_deletedAt_createdAt_idx"
  ON "admin_files"("deletedAt", "createdAt");

-- ── RLS: mismo escalón que la bitácora ──────────────────────────────────────
-- Nadie lee esta tabla desde el navegador: el listado lo sirve un RSC detrás
-- de `requireRole('ADMIN')`, vía Prisma (BYPASSRLS). RLS habilitada SIN
-- política permisiva = denegación total para `anon`/`authenticated`, y el
-- REVOKE es el segundo candado (los privilegios por defecto de un proyecto
-- Supabase conceden escritura sobre CADA tabla nueva — G73b).
ALTER TABLE "admin_files" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "admin_files" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE "admin_files" TO acierta_app;
