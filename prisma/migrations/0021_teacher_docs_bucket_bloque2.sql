-- Bloque 2 — BUCKET PRIVADO PARA LA CONSTANCIA DE SITUACIÓN FISCAL (CSF) DEL
-- PROFESOR (spec §3.1: «Si Carril A: subir CSF»).
--
-- Idempotente: se puede reaplicar sin romper.
--
-- ⚠️ Mismo criterio que 0017 (bóveda de admin): el bucket y sus políticas viven
-- en `storage`, invisibles para Prisma, y este DDL se aplica como `postgres` por
-- el panel/API de Supabase — el rol de la app no tiene CREATE sobre `storage`.
--
-- ════════════════════════════════════════════════════════════════════════════
-- 1. EL BUCKET — PRIVADO
-- ════════════════════════════════════════════════════════════════════════════
--
-- `public = false`. Con el bucket privado, `getPublicUrl` devuelve una URL que
-- NO sirve: la única forma de leer un objeto es con una sesión autorizada (o
-- una URL firmada de vida corta que genera una Server Action). Se verifica por
-- EFECTO, no se da por hecho.
--
-- Igual que la bóveda: el bucket NO lleva `file_size_limit` ni
-- `allowed_mime_types`. La lista blanca (solo PDF, ≤ 5 MB, firma `%PDF-`) se
-- aplica en la Server Action, donde produce un mensaje que la persona puede
-- leer, en vez de un rechazo silencioso del proveedor.
--
-- 🔒 Retención: la CSF es un documento fiscal. NO hay TTL, ciclo de vida, ni
-- job que borre objetos de este bucket; tampoco política de DELETE ni UPDATE
-- para nadie desde el navegador.

INSERT INTO storage.buckets (id, name, public)
VALUES ('teacher-docs', 'teacher-docs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. POLÍTICAS — POR CARPETA: cada profesor solo toca la SUYA
-- ════════════════════════════════════════════════════════════════════════════
--
-- La ruta del objeto es `<auth.uid()>/<uuid>.pdf`: la primera carpeta ES el UID
-- de Supabase Auth de quien sube. `storage.foldername(name)[1]` la extrae y se
-- compara contra `auth.uid()` — así un profesor no puede escribir en la carpeta
-- de otro ni leer sus archivos, aunque conozca el nombre.
--
-- `(SELECT auth.uid())` con SELECT envolvente: Postgres lo evalúa UNA vez por
-- consulta en lugar de una por fila (recomendación de Supabase para RLS).

DROP POLICY IF EXISTS "teacher_docs_insert_own" ON storage.objects;
CREATE POLICY "teacher_docs_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'teacher-docs'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "teacher_docs_select_own" ON storage.objects;
CREATE POLICY "teacher_docs_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'teacher-docs'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- El admin lee TODAS las carpetas para revisar la constancia (spec §3.1 paso 4).
-- Reutiliza `public.is_admin()` (0001): función SECURITY DEFINER que resuelve el
-- rol sin re-disparar RLS sobre `user_profiles` (la recursión infinita que
-- documentó F1). Escribir el JOIN a mano repetiría esa trampa.
DROP POLICY IF EXISTS "teacher_docs_select_admin" ON storage.objects;
CREATE POLICY "teacher_docs_select_admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'teacher-docs' AND (SELECT public.is_admin()));

-- Deliberadamente NO hay políticas de UPDATE ni DELETE: nadie desde el navegador
-- reemplaza ni borra una constancia ya subida.
