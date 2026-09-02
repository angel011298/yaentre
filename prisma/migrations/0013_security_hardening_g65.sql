-- G65 — Auditoría de seguridad de la aplicación.
--
-- Reporte completo: docs/AUDITORIA_SEGURIDAD.md
--
-- Dos bloques independientes:
--   1. Límite de tasa distribuido (esquema `app_security`) — la defensa contra
--      fuerza bruta en registro/login/recuperación/canje de código parental.
--   2. Endurecimiento de las políticas RLS: pasan de `FOR ALL` a `FOR SELECT`.
--
-- Idempotente: se puede reaplicar sin romper nada.
--
-- ⚠️ NOTA PARA `prisma migrate dev` (mismo criterio que 0012/G59): nada de lo
-- que crea esta migración vive en `prisma/schema.prisma` (guardrail de
-- CLAUDE.md: no se toca sin instrucción explícita). La tabla de límite de tasa
-- se crea A PROPÓSITO en el esquema `app_security`, NO en `public`: Prisma solo
-- diffea el esquema por defecto, así que una tabla fuera de `public` es
-- invisible para el generador de migraciones y NO produce deriva (una tabla
-- equivalente en `public` sí haría que la siguiente migración generada la
-- borrara). Se accede solo por `$queryRaw` desde `src/lib/rate-limit/store.ts`.

-- ════════════════════════════════════════════════════════════════════
-- 1. LÍMITE DE TASA DISTRIBUIDO
-- ════════════════════════════════════════════════════════════════════
--
-- Por qué en la base de datos y no en memoria: el limitador de `proxy.ts`
-- (F20) vive en el proceso Edge, y cada instancia/región de Vercel mantiene su
-- propio conteo. Medido en producción durante G65: **70 peticiones seguidas a
-- `/api/adaptive/predict` sin un solo 429**, con el límite nominal en 60/min.
-- El conteo nunca se acumula porque las peticiones aterrizan en instancias
-- distintas. Un contador en Postgres es el único almacén compartido que este
-- proyecto ya paga (Redis/Upstash sería infraestructura nueva).
--
-- Ventana fija, reclamada de forma atómica con un solo INSERT .. ON CONFLICT:
-- sin lecturas previas, sin condición de carrera entre lambdas concurrentes.

CREATE SCHEMA IF NOT EXISTS app_security;

CREATE TABLE IF NOT EXISTS app_security.rate_limit_hits (
  bucket_key        text        PRIMARY KEY,
  hits              integer     NOT NULL,
  window_started_at timestamptz NOT NULL,
  expires_at        timestamptz NOT NULL
);

-- Barrido de ventanas vencidas (lo dispara el propio limitador, muestreado).
CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_expires
  ON app_security.rate_limit_hits (expires_at);

-- El esquema NO se expone por PostgREST (no está en `db-schemas`), y aun así
-- se le niega el acceso explícitamente a los roles del navegador: este
-- contador es infraestructura del servidor, nunca dato de usuario.
REVOKE ALL ON SCHEMA app_security FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA app_security FROM anon, authenticated;

-- El rol de la app (el de `DATABASE_URL`) sí necesita escribir aquí. Es
-- BYPASSRLS pero NO es superusuario, así que los privilegios de tabla siguen
-- aplicándole. Se concede a los roles que existan — la lista cubre el rol
-- dedicado de este proyecto (`acierta_ci`, creado en F1) y el `postgres` por
-- si algún entorno conecta con él; los que no existan se saltan sin error.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['acierta_ci', 'postgres'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('GRANT USAGE ON SCHEMA app_security TO %I', r);
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON app_security.rate_limit_hits TO %I', r
      );
    END IF;
  END LOOP;
END $$;

-- ════════════════════════════════════════════════════════════════════
-- 2. RLS: DE `FOR ALL` A `FOR SELECT`
-- ════════════════════════════════════════════════════════════════════
--
-- Hallazgo de G65 §4. Las políticas de F1/G59 se escribieron `FOR ALL`, así
-- que su cláusula `WITH CHECK` autoriza ESCRITURAS además de lecturas. Como
-- están escritas, un usuario autenticado podría —si tuviera el GRANT—:
--
--   • `UPDATE user_profiles SET role='ADMIN' WHERE "userId" = auth.uid()`
--     (el WITH CHECK solo ata `userId`, no `role`) ⇒ panel de administración
--     completo, incluida la clave de los 1 143 reactivos servibles;
--   • `INSERT INTO parent_links (parentProfileId=<yo>, studentProfileId=<
--     cualquier menor>)` ⇒ el tablero de un menor SIN su código de 6 dígitos;
--   • `INSERT INTO subscriptions (status='ACTIVE')` ⇒ plan de pago gratis;
--   • `UPDATE session_answers SET "isCorrect"=true` ⇒ percentiles falseados.
--
-- Hoy NADA de eso es alcanzable —se comprobó en vivo con JWT reales, 22/22
-- intentos bloqueados— porque `anon`/`authenticated` solo tienen GRANT de
-- SELECT sobre `public`. Pero esa es una defensa IMPLÍCITA que vive en el
-- catálogo de permisos, no en la política: basta que alguien corra el
-- `GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated` que circula en
-- media documentación de Supabase para abrir las cuatro puertas a la vez.
--
-- La app NUNCA escribe estas tablas desde el navegador: todas las mutaciones
-- pasan por Server Actions con Prisma (`acierta_ci`, BYPASSRLS). El único uso
-- del cliente de navegador es subir el avatar a Storage (otro conjunto de
-- políticas, migración 0008). Por eso bajar a `FOR SELECT` no cambia ningún
-- comportamiento actual — solo deja de depender del GRANT.

-- ── Tablas de datos del alumno ──────────────────────────────────────
DROP POLICY IF EXISTS own_sessions ON exam_sessions;
CREATE POLICY own_sessions ON exam_sessions
  FOR SELECT USING ("userProfileId" = (SELECT current_profile_id()));

DROP POLICY IF EXISTS own_session_answers ON session_answers;
CREATE POLICY own_session_answers ON session_answers
  FOR SELECT USING (
    "sessionId" IN (
      SELECT id FROM exam_sessions WHERE "userProfileId" = (SELECT current_profile_id())
    )
  );

DROP POLICY IF EXISTS own_learning_profile ON learning_profiles;
CREATE POLICY own_learning_profile ON learning_profiles
  FOR SELECT USING ("userProfileId" = (SELECT current_profile_id()));

DROP POLICY IF EXISTS own_weak_topics ON weak_topics;
CREATE POLICY own_weak_topics ON weak_topics
  FOR SELECT USING ("userProfileId" = (SELECT current_profile_id()));

DROP POLICY IF EXISTS own_streak ON streak_records;
CREATE POLICY own_streak ON streak_records
  FOR SELECT USING ("userProfileId" = (SELECT current_profile_id()));

DROP POLICY IF EXISTS own_notification_preferences ON notification_preferences;
CREATE POLICY own_notification_preferences ON notification_preferences
  FOR SELECT USING ("userProfileId" = (SELECT current_profile_id()));

-- ── Comercial ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS own_subscriptions ON subscriptions;
CREATE POLICY own_subscriptions ON subscriptions
  FOR SELECT USING ("userProfileId" = (SELECT current_profile_id()));

DROP POLICY IF EXISTS own_payments ON payments;
CREATE POLICY own_payments ON payments
  FOR SELECT USING (
    "subscriptionId" IN (
      SELECT id FROM subscriptions WHERE "userProfileId" = (SELECT current_profile_id())
    )
  );

-- ── Vinculación parental (datos de MENORES) ─────────────────────────
-- Lectura para ambos lados del vínculo; la creación y el borrado del vínculo
-- solo por el canje del código / la desvinculación, ambos server-side.
DROP POLICY IF EXISTS own_parent_links ON parent_links;
CREATE POLICY own_parent_links ON parent_links
  FOR SELECT USING (
    "parentProfileId" = (SELECT current_profile_id())
    OR "studentProfileId" = (SELECT current_profile_id())
  );

DROP POLICY IF EXISTS own_parent_link_codes ON parent_link_codes;
CREATE POLICY own_parent_link_codes ON parent_link_codes
  FOR SELECT USING ("studentProfileId" = (SELECT current_profile_id()));

-- ── Perfil ──────────────────────────────────────────────────────────
-- `profile_read` se conserva tal cual (ya era FOR SELECT). Se retiran las tres
-- políticas de escritura: el perfil se crea en `signUpAction` y se actualiza
-- en las Server Actions de perfil, siempre con Prisma. `profile_delete`
-- tampoco hace falta — eliminar la cuenta anonimiza vía servidor (F17).
DROP POLICY IF EXISTS profile_insert ON user_profiles;
DROP POLICY IF EXISTS profile_update ON user_profiles;
DROP POLICY IF EXISTS profile_delete ON user_profiles;

-- ── Contenido: sin cambios ──────────────────────────────────────────
-- `questions`, `explanation_layers`, `question_reports`, `passages`, etc.
-- siguen `FOR ALL` con `is_admin()`: ahí la escritura por un admin autenticado
-- SÍ es un camino previsto (panel de contenido). Y ahora que `role` ya no se
-- puede auto-asignar por la API, `is_admin()` vuelve a ser una afirmación
-- fuerte en vez de una que el propio atacante podría fabricarse.
