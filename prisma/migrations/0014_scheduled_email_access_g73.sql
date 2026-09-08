-- G73 — Acceso a los correos de `auth.users` para los 3 correos programados,
-- y corrección del rol del limitador distribuido.
--
-- Reporte: docs/ESTADO.md §G73. Idempotente: se puede reaplicar sin romper.
--
-- ⚠️ MISMO CRITERIO QUE 0012/0013: nada de lo que crea esta migración vive en
-- `prisma/schema.prisma`. Todo cuelga del esquema `app_security`, invisible
-- para el generador de migraciones de Prisma, así que no produce deriva.
--
-- ════════════════════════════════════════════════════════════════════
-- 0. EL ROL DE LA APP EN PRODUCCIÓN ES `acierta_prod`, NO `acierta_ci`
-- ════════════════════════════════════════════════════════════════════
--
-- La migración 0013 (G65) concedió el limitador distribuido a la lista
-- codificada `['acierta_ci', 'postgres']`. Pero el `DATABASE_URL` de
-- producción en Vercel conecta como **`acierta_prod`** — verificado en G73
-- leyendo la variable real, no la documentación. Consecuencia medida:
--
--   * `acierta_prod` no tenía USAGE sobre `app_security`, así que CADA
--     llamada a `consumeRateLimit` reventaba con `42501 permission denied`.
--   * `consumeRateLimit` atrapa el error y **falla abierto** a propósito
--     ("la base caída no debe convertir un login legítimo en un 500"), así
--     que devolvía `allowed: true` siempre, sin un solo 429.
--   * Resultado: el limitador distribuido —la corrección central de G65
--     contra fuerza bruta en login, recuperación y canje del código
--     parental de un MENOR— **nunca funcionó en producción**, y su propio
--     diseño a prueba de fallos garantizaba que nadie lo notara.
--
-- Las sondas `pnpm security:*` no lo delataron porque corren con las
-- credenciales locales (`acierta_ci`), que sí tenían el grant.
--
-- Lección: una lista de roles codificada en una migración es una bomba de
-- tiempo. Aquí se enumeran los tres roles reales del proyecto y se salta sin
-- error el que no exista en el entorno donde se aplique.

DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['acierta_ci', 'acierta_prod', 'postgres'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('GRANT USAGE ON SCHEMA app_security TO %I', r);
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON app_security.rate_limit_hits TO %I', r
      );
    END IF;
  END LOOP;
END $$;

-- ════════════════════════════════════════════════════════════════════
-- 1. CORREOS DE `auth.users` SIN ABRIR EL ESQUEMA `auth`
-- ════════════════════════════════════════════════════════════════════
--
-- Los 3 correos programados (resumen semanal al tutor, racha en riesgo,
-- countdown al examen) resuelven a quién escribirle con
-- `src/lib/db/auth-users.ts`, que lee `auth.users`. Desde G59 fallaba en
-- silencio. En G73 se encontró que eran DOS defectos encadenados:
--
--   A. FALTA DE PRIVILEGIO. El remedio que documentaba el veredicto —
--      `GRANT USAGE ON SCHEMA auth TO acierta_ci` — **no se puede ejecutar**
--      en este proyecto: el esquema `auth` lo posee `supabase_admin` y el rol
--      `postgres` (el máximo al que llega el dueño, tanto por el editor SQL
--      del panel como por la API) sólo tiene `U` sobre él, SIN opción de
--      concesión (`nspacl` = `postgres=U/supabase_admin`, no `U*`). El GRANT
--      no falla: Postgres lo acepta como no-op y `has_schema_privilege`
--      sigue en `false`. Sí se puede conceder `SELECT (id, email)` sobre la
--      tabla, porque ahí `postgres` sí trae la opción de concesión
--      (`postgres=ar*wdDxtm`) — pero sin USAGE sobre el esquema la columna
--      es inalcanzable de todos modos.
--
--   B. EL JOIN ESTABA ROTO POR TIPOS. `auth.users.id` es `uuid` y
--      `public.user_profiles."userId"` es `text`. La consulta de G60 comparaba
--      `u."id" = p."userId"` sin cast: `ERROR 42883: operator does not exist:
--      uuid = text`. O sea que incluso concediendo el privilegio, los tres
--      correos habrían seguido en cero. El privilegio faltante tapaba al
--      segundo bug.
--
-- Solución: una función `SECURITY DEFINER` propiedad de `postgres` —que sí
-- alcanza `auth.users`— dentro del esquema que la app ya usa. No abre `auth`
-- al rol de la app: expone EXACTAMENTE el par (perfil, correo) que los correos
-- programados necesitan, para los ids que se le pasen, y nada más. Ni el hash
-- de contraseña, ni los tokens de recuperación, ni el resto de la tabla.

CREATE OR REPLACE FUNCTION app_security.auth_emails_for_profiles(profile_ids text[])
RETURNS TABLE ("profileId" text, "email" text)
LANGUAGE sql
SECURITY DEFINER
STABLE
-- `search_path` fijo: sin esto, un rol que pudiera crear objetos podría
-- anteponer un esquema propio y secuestrar la resolución de nombres dentro de
-- una función que corre con los privilegios de `postgres`.
SET search_path = pg_catalog, public, auth
AS $$
  SELECT p."id", u."email"::text
    FROM public.user_profiles p
    JOIN auth.users u ON u."id"::text = p."userId"
   WHERE p."id" = ANY(profile_ids)
     AND u."email" IS NOT NULL
$$;

ALTER FUNCTION app_security.auth_emails_for_profiles(text[]) OWNER TO postgres;

-- Nadie por defecto; sólo los roles de la app.
REVOKE ALL ON FUNCTION app_security.auth_emails_for_profiles(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_security.auth_emails_for_profiles(text[]) FROM anon, authenticated;

DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['acierta_ci', 'acierta_prod'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION app_security.auth_emails_for_profiles(text[]) TO %I', r
      );
    END IF;
  END LOOP;
END $$;
