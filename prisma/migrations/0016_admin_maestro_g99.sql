-- G99 — ADMIN MAESTRO: bitácora persistente, cortesías, y acceso a `auth`
-- para las acciones de cuenta.
--
-- Reporte: docs/ESTADO.md §G99. Idempotente: se puede reaplicar sin romper.
--
-- ⚠️ CRITERIO DE ESTE REPO (0012-0015): las migraciones son SQL PLANO escrito
-- a mano; `prisma migrate` NO se ejecuta nunca (no reconocería ninguna de
-- estas y ofrecería resetear la base). Lo que SÍ vive en `schema.prisma` —la
-- tabla `admin_audit_log` y la columna `subscriptions."isComp"`—
-- se edita a mano en el schema para que coincida EXACTO, y se valida con
-- `prisma migrate diff` vacío. Lo que cuelga de `app_security` es invisible
-- para Prisma y no produce deriva.
--
-- ⚠️ NINGUNA LISTA DE ROLES (guardrail G73b). Todo privilegio va al rol de
-- grupo `acierta_app` de la migración 0015, cuya pertenencia se deriva de
-- `pg_roles`. Producción es `acierta_prod`, no `acierta_ci`, y esa es
-- exactamente la clase de dato que no se vuelve a escribir a mano aquí.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. BITÁCORA PERSISTENTE DE ADMINISTRACIÓN
-- ════════════════════════════════════════════════════════════════════════════
--
-- `src/lib/admin/audit-log.ts` registraba con `console.log` y su propio
-- comentario decía que un historial consultable exigía un ALTER explícito.
-- Este es ese ALTER: la plataforma trata datos de personas de 15 a 17 años y
-- las acciones de administración (alta de cortesía, baja de plan, cambio de
-- rol, cierre de sesiones, subida y borrado de archivos) necesitan rastro.
--
-- DECISIONES DE INTEGRIDAD REFERENCIAL — leer antes de "arreglar" las FKs:
--
--  · `actorUserProfileId` es NULABLE con ON DELETE SET NULL, no CASCADE. Una
--    bitácora que se borra sola cuando se elimina la cuenta del actor no es
--    una bitácora: es justo el rastro que más importa conservar. `actorEmail`
--    guarda una instantánea legible para que la fila siga diciendo QUIÉN aun
--    cuando el perfil ya no exista.
--
--  · `targetUserProfileId` NO tiene clave foránea, a propósito. La bitácora
--    registra lo que PASÓ, incluido lo que le pasó a una cuenta que después
--    se eliminó (LFPDPPP: el usuario puede borrar su cuenta). Una FK aquí
--    obligaría a elegir entre bloquear ese borrado o perder el registro.

CREATE TABLE IF NOT EXISTS "admin_audit_log" (
  "id" TEXT NOT NULL,
  "actorUserProfileId" TEXT,
  "actorEmail" TEXT,
  "action" TEXT NOT NULL,
  "targetUserProfileId" TEXT,
  "targetKind" TEXT NOT NULL,
  "reason" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admin_audit_log_actorUserProfileId_fkey" FOREIGN KEY ("actorUserProfileId")
    REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "admin_audit_log_actorUserProfileId_createdAt_idx"
  ON "admin_audit_log"("actorUserProfileId", "createdAt");
CREATE INDEX IF NOT EXISTS "admin_audit_log_targetUserProfileId_createdAt_idx"
  ON "admin_audit_log"("targetUserProfileId", "createdAt");
CREATE INDEX IF NOT EXISTS "admin_audit_log_action_createdAt_idx"
  ON "admin_audit_log"("action", "createdAt");
CREATE INDEX IF NOT EXISTS "admin_audit_log_createdAt_idx"
  ON "admin_audit_log"("createdAt");

-- ── RLS: la bitácora NO se lee nunca desde el navegador ─────────────────────
--
-- Convención de las tablas de solo servidor de este repo (0007/0009/0012),
-- pero un escalón MÁS cerrado y a propósito: allí el patrón es
-- `FOR ALL USING (is_admin())`, que dejaría a un ADMIN leer la bitácora por
-- PostgREST con la anon key. La app lee esta tabla ÚNICAMENTE por Prisma
-- (rol `acierta_prod`, BYPASSRLS), así que no existe ningún caso de uso
-- legítimo desde el navegador y la política permisiva sobra.
--
-- RLS habilitada SIN NINGUNA política permisiva = denegación total para
-- cualquier rol sin BYPASSRLS (`anon`, `authenticated`). El REVOKE de abajo
-- es el segundo candado: RLS solo se evalúa si el GRANT deja pasar, y G73b
-- documenta que los privilegios por defecto de un proyecto Supabase conceden
-- escritura a `anon`/`authenticated` sobre CADA tabla nueva. Esta tabla es
-- nueva, así que ese default la alcanzaría de no revocarlo aquí.
ALTER TABLE "admin_audit_log" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "admin_audit_log" FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE "admin_audit_log" TO acierta_app;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. CORTESÍAS: DISTINGUIR UN REGALO DE UNA VENTA
-- ════════════════════════════════════════════════════════════════════════════
--
-- Decisión de producto de esta fase: una cortesía NO consume licencia Early
-- Bird y se excluye del contador público «quedan X de 500». Sin esta columna
-- no hay forma de distinguirlas, porque para el paywall una cortesía tiene
-- que ser INDISTINGUIBLE de una compra (mismo `status`, mismo `expiresAt`,
-- misma insignia) — esa es justamente la razón por la que hace falta el
-- marcador explícito.
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "isComp" BOOLEAN NOT NULL DEFAULT false;

-- El contador de Early Bird filtra por `isComp = false`; este índice parcial
-- lo sirve sin recorrer la tabla.
CREATE INDEX IF NOT EXISTS "idx_subscriptions_early_bird_sold"
  ON "subscriptions"("season", "status") WHERE "isComp" = false;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. IDENTIDAD DE `auth.users` PARA EL PANEL — MISMO CAMINO QUE G73
-- ════════════════════════════════════════════════════════════════════════════
--
-- El panel de usuarios necesita, además del correo que ya resuelve
-- `app_security.auth_emails_for_profiles` (migración 0014), si la cuenta está
-- VERIFICADA y cuándo entró por última vez.
--
-- Esto NO es un segundo camino al esquema `auth`: es el MISMO — una función
-- `SECURITY DEFINER` propiedad de `postgres` dentro de `app_security`, con
-- `search_path` fijo — ampliada a las tres columnas que el panel muestra.
-- El `GRANT USAGE ON SCHEMA auth` sigue siendo inejecutable en este proyecto
-- (lo posee `supabase_admin`; Postgres lo acepta como no-op sin error), así
-- que la función definer es la única vía que de verdad funciona.
--
-- 🔒 LO QUE ESTA FUNCIÓN NO EXPONE, Y NUNCA DEBE EXPONER: `encrypted_password`,
-- `recovery_token`, `confirmation_token`, `email_change_token_*` ni ninguna
-- otra columna de material de credenciales. El panel de esta fase no lee, no
-- deriva y no muestra contraseñas — el requisito se sustituyó por forzar
-- restablecimiento y cerrar sesiones. La lista de columnas de abajo es la
-- superficie completa.

CREATE OR REPLACE FUNCTION app_security.auth_identities_for_profiles(profile_ids text[])
RETURNS TABLE (
  "profileId" text,
  "email" text,
  "emailConfirmedAt" timestamptz,
  "lastSignInAt" timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public, auth
AS $fn$
  SELECT p."id", u."email"::text, u."email_confirmed_at", u."last_sign_in_at"
    FROM public.user_profiles p
    JOIN auth.users u ON u."id"::text = p."userId"
   WHERE p."id" = ANY(profile_ids)
$fn$;

ALTER FUNCTION app_security.auth_identities_for_profiles(text[]) OWNER TO postgres;
REVOKE ALL ON FUNCTION app_security.auth_identities_for_profiles(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_security.auth_identities_for_profiles(text[]) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION app_security.auth_identities_for_profiles(text[]) TO acierta_app;

-- ── Búsqueda por correo, resuelta EN EL SERVIDOR ────────────────────────────
--
-- El panel busca "por correo o nombre". El nombre vive en `user_profiles`
-- (Prisma lo consulta directo), pero el correo vive en `auth.users`: sin esta
-- función habría que traerse TODOS los perfiles a memoria para filtrar, que es
-- exactamente el anti-patrón que revienta a escala (G69).
--
-- Devuelve solo ids de perfil — el correo se resuelve después con la función
-- de arriba, para los ids de la página que se va a pintar.

CREATE OR REPLACE FUNCTION app_security.profile_ids_by_email_search(term text)
RETURNS TABLE ("profileId" text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public, auth
AS $fn$
  SELECT p."id"
    FROM public.user_profiles p
    JOIN auth.users u ON u."id"::text = p."userId"
   WHERE u."email" ILIKE ('%' || term || '%')
   LIMIT 500
$fn$;

ALTER FUNCTION app_security.profile_ids_by_email_search(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION app_security.profile_ids_by_email_search(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_security.profile_ids_by_email_search(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION app_security.profile_ids_by_email_search(text) TO acierta_app;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. CERRAR TODAS LAS SESIONES DE UNA CUENTA
-- ════════════════════════════════════════════════════════════════════════════
--
-- Por qué NO se usa `supabase.auth.admin.signOut()`: exige
-- `SUPABASE_SERVICE_ROLE_KEY`, que NO está cargada en Vercel producción
-- (medido en G99 con `vercel env ls production`: 26 variables, no está) y
-- localmente vale un placeholder. Una acción de administración que depende de
-- un secreto ausente es una acción que nace muerta en producción — la firma
-- exacta de los fallos silenciosos de G73b.
--
-- `postgres` SÍ tiene DELETE sobre `auth.sessions` y `auth.refresh_tokens`
-- (verificado: `relacl` = `postgres=ar*wdDxtm/supabase_auth_admin` en ambas),
-- así que la misma función definer de G73 resuelve esto sin secretos nuevos.
--
-- ⚠️ ALCANCE HONESTO, y así se dice en la interfaz: borrar la sesión revoca el
-- REFRESH token de inmediato, pero un ACCESS token ya emitido sigue siendo
-- válido hasta que expire por su cuenta (1 h por omisión en Supabase). No
-- existe revocación instantánea de un JWT ya firmado; prometerla sería
-- mentir. La ventana máxima es esa hora.

CREATE OR REPLACE FUNCTION app_security.revoke_auth_sessions(profile_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = pg_catalog, public, auth
AS $fn$
DECLARE
  uid text;
  removed integer := 0;
BEGIN
  SELECT p."userId" INTO uid FROM public.user_profiles p WHERE p."id" = profile_id;
  IF uid IS NULL THEN
    RETURN 0;
  END IF;

  DELETE FROM auth.refresh_tokens WHERE user_id = uid;
  DELETE FROM auth.sessions WHERE user_id = uid::uuid;
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$fn$;

ALTER FUNCTION app_security.revoke_auth_sessions(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION app_security.revoke_auth_sessions(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_security.revoke_auth_sessions(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION app_security.revoke_auth_sessions(text) TO acierta_app;
