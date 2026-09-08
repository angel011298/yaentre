-- G73b — ELIMINAR LA CLASE DE DEFECTO QUE DESTAPÓ G73, NO SOLO SUS INSTANCIAS.
--
-- Reporte: docs/ESTADO.md §G73b. Idempotente: se puede reaplicar sin romper.
--
-- ⚠️ MISMO CRITERIO QUE 0012/0013/0014: nada de lo que toca esta migración vive
-- en `prisma/schema.prisma`. Son roles, privilegios y privilegios por defecto —
-- invisibles para el generador de migraciones de Prisma, así que no hay deriva.
--
-- ════════════════════════════════════════════════════════════════════════════
-- EL DEFECTO QUE SE CIERRA AQUÍ
-- ════════════════════════════════════════════════════════════════════════════
--
-- La migración 0013 (G65) concedió el limitador de tasa distribuido a la lista
-- ESCRITA A MANO `['acierta_ci','postgres']`. Producción conecta como
-- `acierta_prod`. Resultado: cada `consumeRateLimit` moría con `42501`, el
-- limitador fallaba abierto por diseño, y la defensa contra fuerza bruta en
-- login, recuperación de contraseña y canje del código de un MENOR estuvo
-- inerte durante meses sin que ninguna sonda lo delatara.
--
-- G73 corrigió esa instancia añadiendo `acierta_prod` a la lista. Esta
-- migración quita LA LISTA:
--
--   1. Un rol de GRUPO (`acierta_app`) concentra todos los privilegios de la
--      aplicación. Los roles de conexión no reciben privilegios propios: son
--      MIEMBROS del grupo. Conceder algo nuevo a "la app" pasa a ser una sola
--      concesión al grupo, no una por rol.
--
--   2. La pertenencia al grupo se DERIVA del catálogo (`pg_roles`), no de una
--      lista: cualquier rol de conexión del proyecto (convención `acierta_*`)
--      queda enrolado automáticamente. Un futuro `acierta_staging` nace con
--      los privilegios correctos sin que nadie recuerde editar una migración.
--
--   3. Los PRIVILEGIOS POR DEFECTO del esquema quedan alineados con el grupo,
--      así que un objeto creado mañana en `app_security` ya nace accesible.
--
-- Y, lo más importante, `pnpm security:grants` verifica el EFECTO con el rol
-- que de verdad conecta: ejecuta las operaciones reales de la app contra la
-- base real. No pregunta si el GRANT está escrito; comprueba si funciona.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. ROL DE GRUPO
-- ════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'acierta_app') THEN
    -- NOLOGIN: nadie se conecta como el grupo. Solo agrupa privilegios.
    -- No entra en conflicto con el guardrail de G69 §5 ("no introducir un
    -- TERCER rol de base de datos para la app"): ese límite es por POOL de
    -- servidor de Supavisor, y Supavisor abre pool por rol que *conecta*.
    -- Un rol NOLOGIN no abre ninguno.
    CREATE ROLE acierta_app NOLOGIN;
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. TODOS LOS PRIVILEGIOS DE LA APP, AL GRUPO
-- ════════════════════════════════════════════════════════════════════════════

GRANT USAGE ON SCHEMA app_security TO acierta_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app_security TO acierta_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app_security TO acierta_app;

-- El esquema `public` lo usa Prisma con BYPASSRLS; el grupo lo necesita igual
-- para que un rol nuevo enrolado no dependa de un GRANT suelto.
GRANT USAGE ON SCHEMA public TO acierta_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO acierta_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO acierta_app;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. ENROLAR LOS ROLES DE CONEXIÓN — DERIVADO DEL CATÁLOGO, NO DE UNA LISTA
-- ════════════════════════════════════════════════════════════════════════════
--
-- Criterio: roles con LOGIN cuyo nombre sigue la convención del proyecto
-- (`acierta_*`). `postgres` se añade aparte porque es el dueño y aplica las
-- migraciones. Los roles de Supabase (`anon`, `authenticated`, `service_role`,
-- `authenticator`, `supabase_*`, `dashboard_user`) quedan fuera por
-- construcción: ninguno cumple la convención.
--
-- Que este bloque sea un bucle sobre `pg_roles` y no un `ARRAY[...]` es
-- literalmente la corrección: la fuente de verdad de "qué roles usa la app"
-- pasa a ser la base, que no puede desincronizarse consigo misma.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT rolname FROM pg_roles
     WHERE rolcanlogin
       AND (rolname LIKE 'acierta\_%' OR rolname = 'postgres')
  LOOP
    EXECUTE format('GRANT acierta_app TO %I', r.rolname);
  END LOOP;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. PRIVILEGIOS POR DEFECTO: QUE LO DE MAÑANA NAZCA BIEN
-- ════════════════════════════════════════════════════════════════════════════
--
-- 🔴 SEGUNDO HALLAZGO DE G73b, DE LA MISMA FAMILIA.
--
-- La migración 0009 (F22) hizo un `REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON
-- ALL TABLES IN SCHEMA public FROM anon, authenticated`. Correcto — y de
-- alcance ÚNICO: `ON ALL TABLES` afecta a las tablas que existían ESE día.
--
-- Los privilegios por defecto de `public` nunca se tocaron, y en un proyecto
-- Supabase conceden `arwdDxtm` (TODO, escritura incluida) a `anon` y
-- `authenticated` sobre cada tabla NUEVA. Medido en producción antes de esta
-- migración:
--
--   defaclrole=postgres, nspname=public, objtype=r →
--     {postgres=arwdDxtm/postgres, anon=arwdDxtm/postgres,
--      authenticated=arwdDxtm/postgres, service_role=arwdDxtm/postgres, …}
--
-- O sea: la próxima tabla que se creara en `public` desde el editor SQL o
-- desde una migración aplicada como `postgres` habría nacido con INSERT,
-- UPDATE, DELETE y TRUNCATE abiertos a cualquiera con la anon key —que es
-- pública por diseño, va en el bundle del navegador— y el REVOKE de 0009 ya no
-- estaría ahí para taparlo. Hoy las 28 tablas están limpias por casualidad
-- histórica: no se ha creado ninguna tabla desde F22.
--
-- Es exactamente la firma de G73: una corrección aplicada una vez, a mano, que
-- se desincroniza sola y en silencio.
--
-- Nota sobre el alcance de lo que sí se puede arreglar: los privilegios por
-- defecto se declaran POR ROL CREADOR, y alterarlos exige el privilegio SET
-- sobre ese rol — no basta con ser MIEMBRO suyo. Comprobado aplicando esta
-- misma migración: `postgres` es miembro de `acierta_prod` y aun así
-- `ALTER DEFAULT PRIVILEGES FOR ROLE acierta_prod` devuelve
-- `42501: permission denied to change default privileges`. Y `supabase_admin`
-- está fuera de alcance por completo (mismo muro que el `GRANT … ON SCHEMA
-- auth` de G73).
--
-- Por eso cada rol va en su propio bloque con manejo de excepción: se cubre
-- todo lo alcanzable y se deja constancia de lo que no, en vez de fallar la
-- migración entera o —peor— dar por aplicado algo que no se aplicó.
--
-- Que quede claro cuál importa: el creador PELIGROSO es `postgres`, porque es
-- quien corre el editor SQL y las migraciones aplicadas por panel/API (así se
-- aplicaron 0012, 0013 y 0014). `acierta_ci` y `acierta_prod` no tienen
-- ninguna entrada de privilegios por defecto, así que una tabla creada por
-- ellos nace privada — segura por omisión. `postgres` sí se puede corregir, y
-- es el que se corrige aquí.
--
-- `pnpm security:grants` comprueba después el resultado REAL creando una tabla
-- de prueba y mirando qué privilegios nacen con ella.

DO $$
DECLARE
  r text;
  s text;
  aplicados text[] := '{}';
  saltados  text[] := '{}';
BEGIN
  FOR r IN
    SELECT rolname FROM pg_roles
     WHERE rolname LIKE 'acierta\_%' OR rolname = 'postgres'
  LOOP
    BEGIN
      FOREACH s IN ARRAY ARRAY[
        -- 4a. Nada de escritura para `anon`/`authenticated` en tablas futuras.
        'ALTER DEFAULT PRIVILEGES FOR ROLE %1$I IN SCHEMA public '
          'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon, authenticated',
        -- 4b. La app sí, vía el grupo (nunca nombrando roles de conexión).
        'ALTER DEFAULT PRIVILEGES FOR ROLE %1$I IN SCHEMA public '
          'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO acierta_app',
        'ALTER DEFAULT PRIVILEGES FOR ROLE %1$I IN SCHEMA public '
          'GRANT USAGE, SELECT ON SEQUENCES TO acierta_app',
        'ALTER DEFAULT PRIVILEGES FOR ROLE %1$I IN SCHEMA app_security '
          'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO acierta_app',
        'ALTER DEFAULT PRIVILEGES FOR ROLE %1$I IN SCHEMA app_security '
          'GRANT EXECUTE ON FUNCTIONS TO acierta_app',
        -- 4c. Y las listas viejas de roles de conexión salen de los defaults:
        --     lo que herede un rol nuevo tiene que venir del grupo, no de su
        --     nombre.
        'ALTER DEFAULT PRIVILEGES FOR ROLE %1$I IN SCHEMA public '
          'REVOKE ALL ON TABLES FROM acierta_ci, acierta_prod',
        'ALTER DEFAULT PRIVILEGES FOR ROLE %1$I IN SCHEMA public '
          'REVOKE ALL ON SEQUENCES FROM acierta_ci, acierta_prod'
      ] LOOP
        EXECUTE format(s, r);
      END LOOP;
      aplicados := aplicados || r;
    EXCEPTION WHEN insufficient_privilege THEN
      saltados := saltados || r;
    END;
  END LOOP;

  RAISE NOTICE 'privilegios por defecto — aplicados a: %; sin permiso sobre: %',
    aplicados, saltados;
END $$;

-- 4d. Y por si acaso: repetir el REVOKE de 0009 sobre lo que existe HOY. Es un
--     no-op si nada se movió, y la red de seguridad si algo se creó entre F22
--     y esta migración.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. EL ESQUEMA `app_security` SIGUE CERRADO A LOS ROLES DEL NAVEGADOR
-- ════════════════════════════════════════════════════════════════════════════
--
-- Repetido de 0013 a propósito: es la clase de REVOKE cuyo olvido no produce
-- ningún síntoma visible.

REVOKE ALL ON SCHEMA app_security FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA app_security FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app_security FROM anon, authenticated;
REVOKE ALL ON FUNCTION app_security.auth_emails_for_profiles(text[]) FROM PUBLIC;
