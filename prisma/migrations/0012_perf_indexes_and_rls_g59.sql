-- G59 — Auditoría y optimización de la capa de datos antes del lanzamiento.
--
-- Contexto y mediciones completas: docs/AUDITORIA_BACKEND.md
--
-- NOTA (F1): las columnas son camelCase y van entre comillas dobles — el
-- schema.prisma solo aplica @@map a las TABLAS, no @map a los campos.
--
-- Todos los índices se crean con IF NOT EXISTS: la migración es idempotente y
-- se puede reaplicar sin romper nada. En producción conviene correrla con
-- CONCURRENTLY (ver la nota al final) si la tabla ya tiene volumen.

-- ════════════════════════════════════════════════════════════════════
-- 1. ÍNDICES DEL CAMINO CRÍTICO (medidos con EXPLAIN ANALYZE a escala)
-- ════════════════════════════════════════════════════════════════════

-- ── Percentil del simulacro ──────────────────────────────────────────
-- `loadSimulatorResult` compara el score del alumno contra TODAS las sesiones
-- terminadas del mismo examen — de todos los usuarios, no solo del suyo. Es la
-- única consulta del producto cuyo costo crece con la base de usuarios
-- completa. No había NINGÚN índice con "examId" a la cabeza (ni siquiera el de
-- la llave foránea): el plan medido caía en un recorrido completo del índice
-- parcial de simulacros y filtraba después.
-- Este índice sirve además la llave foránea `exam_sessions_examId_fkey`.
CREATE INDEX IF NOT EXISTS "idx_exam_sessions_exam_score"
  ON exam_sessions("examId", mode, status, score);

-- ── Sesiones del alumno por fecha ────────────────────────────────────
-- Lo piden: la exclusión de 72 h del selector adaptativo, el límite diario del
-- muro suave, el mapa de calor de 90 días y "la sesión vigente más reciente"
-- (simulador, diagnóstico y práctica). Existían (userProfileId, mode) y
-- (userProfileId, status), pero ninguno con la fecha: cada consulta filtraba u
-- ordenaba por "startedAt" después de leer TODAS las sesiones del alumno.
CREATE INDEX IF NOT EXISTS "idx_exam_sessions_user_started"
  ON exam_sessions("userProfileId", "startedAt" DESC);

-- ── Historial de sesiones terminadas ─────────────────────────────────
-- `loadRecentSimulations` (dashboard y panel parental), `loadSimulationHistory`
-- y la reconstrucción del Entrómetro ordenan por "finishedAt". Parcial: las
-- sesiones abiertas o abandonadas nunca aparecen en esas listas.
CREATE INDEX IF NOT EXISTS "idx_exam_sessions_user_finished"
  ON exam_sessions("userProfileId", "finishedAt" DESC)
  WHERE status IN ('COMPLETED', 'COMPLETED_BY_TIMEOUT');

-- ── Barrido nocturno de sesiones colgadas ────────────────────────────
-- `abandonStaleSessions` busca por (status, startedAt) SIN userProfileId, así
-- que el índice parcial existente `idx_exam_sessions_open` no le sirve: su
-- primera columna es el usuario.
CREATE INDEX IF NOT EXISTS "idx_exam_sessions_stale_sweep"
  ON exam_sessions("startedAt")
  WHERE status = 'IN_PROGRESS';

-- ── Respuestas por reactivo ──────────────────────────────────────────
-- La llave foránea `session_answers_questionId_fkey` no tenía índice: retirar o
-- editar un reactivo desde el panel admin obligaba a recorrer la tabla más
-- grande del sistema. También sirve al chequeo de integridad que busca
-- respuestas ligadas a reactivos CALIBRATION_ONLY.
CREATE INDEX IF NOT EXISTS "idx_session_answers_question"
  ON session_answers("questionId");

-- ── Payload del simulador, ya ordenado ───────────────────────────────
-- Las 120-140 respuestas de una sesión se leen SIEMPRE con ORDER BY position.
-- Con el índice solo por "sessionId" el orden se resolvía con un Sort aparte.
CREATE INDEX IF NOT EXISTS "idx_session_answers_session_position"
  ON session_answers("sessionId", position);

-- ── Pool de reactivos servibles ──────────────────────────────────────
-- El selector adaptativo y el armado del diagnóstico/simulacro leen
-- (id, topicId) de todo el pool servible del área. Incluir "id" convierte el
-- recorrido en index-only: no toca el heap, que es donde viven `stem`,
-- `options` y `verification` (las columnas gordas que a nadie le interesan
-- aquí).
CREATE INDEX IF NOT EXISTS "idx_questions_pool_covering"
  ON questions("topicId", id)
  WHERE usage = 'SERVABLE' AND "isVerified" = true;

-- ════════════════════════════════════════════════════════════════════
-- 2. LLAVES FORÁNEAS SIN ÍNDICE (database linter de Supabase)
-- ════════════════════════════════════════════════════════════════════
-- Sin índice, cada borrado o cambio de la fila PADRE recorre la tabla hija
-- entera. Varias de estas además sirven consultas reales del producto.

-- El tutor lee por "studentProfileId" (política RLS `own_parent_links` y
-- `loadParentDashboardData`); solo existía el índice único con
-- "parentProfileId" a la cabeza.
CREATE INDEX IF NOT EXISTS "idx_parent_links_student"
  ON parent_links("studentProfileId");

-- `generateParentLinkCode` invalida los códigos previos del alumno por aquí.
CREATE INDEX IF NOT EXISTS "idx_parent_link_codes_student"
  ON parent_link_codes("studentProfileId");

-- Política RLS `own_payments` (subconsulta por suscripción) + conciliación.
CREATE INDEX IF NOT EXISTS "idx_payments_subscription"
  ON payments("subscriptionId");

-- El cron de cuenta regresiva recorre los perfiles con examen meta.
CREATE INDEX IF NOT EXISTS "idx_user_profiles_target_exam"
  ON user_profiles("targetExamId")
  WHERE "targetExamId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_user_profiles_target_career"
  ON user_profiles("targetCareerId")
  WHERE "targetCareerId" IS NOT NULL;

-- Retirar un tema del temario recorría `weak_topics` completa.
CREATE INDEX IF NOT EXISTS "idx_weak_topics_topic"
  ON weak_topics("topicId");

-- Columnas casi siempre NULL: índice parcial (ocupa lo que de verdad usa).
CREATE INDEX IF NOT EXISTS "idx_questions_passage"
  ON questions("passageId") WHERE "passageId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_questions_content_source"
  ON questions("contentSourceId") WHERE "contentSourceId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_passages_content_source"
  ON passages("contentSourceId") WHERE "contentSourceId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_source_chunks_subject"
  ON source_chunks("subjectId") WHERE "subjectId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_question_source_chunks_chunk"
  ON question_source_chunks("sourceChunkId");

-- NO se indexan a propósito (y el linter las seguirá reportando):
--   content_items.subjectId / topicId / professorId
--   questions.videoLectureId / professorNoteId
-- Son las llaves de la Fase 2 (video, notas de profesor). `content_items` y
-- `professors` están vacías, las dos columnas de `questions` son 100 % NULL, y
-- nada de eso se borra en Fase 1 — un índice ahí solo costaría escrituras.

-- ════════════════════════════════════════════════════════════════════
-- 3. RLS: MISMAS REGLAS, EVALUADAS UNA VEZ POR CONSULTA
-- ════════════════════════════════════════════════════════════════════
-- El acceso NO cambia: las condiciones son idénticas, envueltas en un
-- subselect. Sin él, Postgres trata `auth.uid()` / `current_profile_id()` /
-- `is_admin()` como parte del filtro de cada FILA y las vuelve a evaluar una
-- vez por fila; envueltas en `(SELECT ...)` se convierten en un InitPlan que
-- corre UNA vez por consulta. Es la recomendación del propio linter de
-- Supabase (`auth_rls_initplan`).
--
-- Recordatorio: Prisma se conecta con el rol `acierta_ci`, que tiene BYPASSRLS
-- — estas políticas NO están en el camino de la app. Protegen el acceso
-- directo vía PostgREST con la anon key (que es pública por diseño). Ver
-- migración 0009.

-- ── user_profiles ────────────────────────────────────────────────────
-- Además de envolver las funciones, las DOS políticas permisivas de SELECT
-- (`own_profile` era FOR ALL y `parent_reads_student` FOR SELECT) se funden en
-- una sola con OR: con dos políticas permisivas Postgres evalúa ambas en cada
-- lectura. Las escrituras quedan en políticas por comando, ahora CON
-- `WITH CHECK` — la migración 0009 documentó que su ausencia dejaba a un
-- usuario cambiar su propio `role` a ADMIN si algún día se le devolviera el
-- GRANT de UPDATE; ahora la política también lo impediría.
DROP POLICY IF EXISTS "own_profile" ON user_profiles;
DROP POLICY IF EXISTS "parent_reads_student" ON user_profiles;

CREATE POLICY "profile_read" ON user_profiles
  FOR SELECT USING (
    "userId" = (SELECT auth.uid())::text
    OR id IN (
      SELECT pl."studentProfileId" FROM parent_links pl
       WHERE pl."parentProfileId" = (SELECT public.current_profile_id())
    )
  );

CREATE POLICY "profile_insert" ON user_profiles
  FOR INSERT WITH CHECK ("userId" = (SELECT auth.uid())::text);

CREATE POLICY "profile_update" ON user_profiles
  FOR UPDATE USING ("userId" = (SELECT auth.uid())::text)
          WITH CHECK ("userId" = (SELECT auth.uid())::text);

CREATE POLICY "profile_delete" ON user_profiles
  FOR DELETE USING ("userId" = (SELECT auth.uid())::text);

-- ── Tablas "propias del alumno" ──────────────────────────────────────
DROP POLICY IF EXISTS "own_sessions" ON exam_sessions;
CREATE POLICY "own_sessions" ON exam_sessions
  FOR ALL USING ("userProfileId" = (SELECT public.current_profile_id()))
      WITH CHECK ("userProfileId" = (SELECT public.current_profile_id()));

DROP POLICY IF EXISTS "own_subscriptions" ON subscriptions;
CREATE POLICY "own_subscriptions" ON subscriptions
  FOR ALL USING ("userProfileId" = (SELECT public.current_profile_id()))
      WITH CHECK ("userProfileId" = (SELECT public.current_profile_id()));

DROP POLICY IF EXISTS "own_learning_profile" ON learning_profiles;
CREATE POLICY "own_learning_profile" ON learning_profiles
  FOR ALL USING ("userProfileId" = (SELECT public.current_profile_id()))
      WITH CHECK ("userProfileId" = (SELECT public.current_profile_id()));

DROP POLICY IF EXISTS "own_weak_topics" ON weak_topics;
CREATE POLICY "own_weak_topics" ON weak_topics
  FOR ALL USING ("userProfileId" = (SELECT public.current_profile_id()))
      WITH CHECK ("userProfileId" = (SELECT public.current_profile_id()));

DROP POLICY IF EXISTS "own_streak" ON streak_records;
CREATE POLICY "own_streak" ON streak_records
  FOR ALL USING ("userProfileId" = (SELECT public.current_profile_id()))
      WITH CHECK ("userProfileId" = (SELECT public.current_profile_id()));

DROP POLICY IF EXISTS "own_notification_preferences" ON notification_preferences;
CREATE POLICY "own_notification_preferences" ON notification_preferences
  FOR ALL USING ("userProfileId" = (SELECT public.current_profile_id()))
      WITH CHECK ("userProfileId" = (SELECT public.current_profile_id()));

DROP POLICY IF EXISTS "own_parent_link_codes" ON parent_link_codes;
CREATE POLICY "own_parent_link_codes" ON parent_link_codes
  FOR ALL USING ("studentProfileId" = (SELECT public.current_profile_id()))
      WITH CHECK ("studentProfileId" = (SELECT public.current_profile_id()));

DROP POLICY IF EXISTS "own_parent_links" ON parent_links;
CREATE POLICY "own_parent_links" ON parent_links
  FOR ALL USING (
        "parentProfileId"  = (SELECT public.current_profile_id())
     OR "studentProfileId" = (SELECT public.current_profile_id())
  ) WITH CHECK (
        "parentProfileId"  = (SELECT public.current_profile_id())
     OR "studentProfileId" = (SELECT public.current_profile_id())
  );

-- Subconsultas anidadas: el `IN (...)` ya se evalúa una vez, pero la llamada a
-- la función dentro de él no — de ahí el subselect interior.
DROP POLICY IF EXISTS "own_payments" ON payments;
CREATE POLICY "own_payments" ON payments
  FOR ALL USING (
    "subscriptionId" IN (
      SELECT id FROM subscriptions
       WHERE "userProfileId" = (SELECT public.current_profile_id())
    )
  );

DROP POLICY IF EXISTS "own_session_answers" ON session_answers;
CREATE POLICY "own_session_answers" ON session_answers
  FOR ALL USING (
    "sessionId" IN (
      SELECT id FROM exam_sessions
       WHERE "userProfileId" = (SELECT public.current_profile_id())
    )
  );

-- ── Banco de reactivos — HALLAZGO CRÍTICO DE G59 ─────────────────────
-- La política anterior era:
--     read_verified: FOR SELECT USING ("isVerified" = true OR is_admin())
-- es decir, CUALQUIERA podía leer la tabla `questions` completa vía PostgREST
-- con solo la anon key (que es pública por diseño: va en el bundle del
-- cliente). Y `questions.options` es el JSON `[{ id, text, isCorrect }]`.
--
-- Comprobado en vivo antes de este cambio, con `SET ROLE anon`:
--   SELECT jsonb_path_query_first(options::jsonb,
--            '$[*] ? (@.isCorrect == true).id') FROM questions WHERE "isVerified";
--   → devolvía la letra correcta de los 1 143 reactivos servibles.
--
-- Eso tira por la borda el simulador entero y contradice el guardrail de
-- CLAUDE.md ("no enviar isCorrect ni la respuesta correcta al cliente"). El
-- scoring server-side estaba bien; la fuga era por la puerta de atrás.
--
-- Se alinea con TODO el resto del contenido (migración 0009): admin-only.
-- Verificado que ningún código del proyecto usa `supabase.from('questions')`
-- — el único acceso es Prisma con el rol `acierta_ci` (BYPASSRLS), igual que
-- para `explanation_layers`, `topics`, `subjects` y demás.
DROP POLICY IF EXISTS "read_verified" ON questions;
CREATE POLICY "admin_only_questions" ON questions
  FOR ALL USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

-- ── Tablas solo-admin (migraciones 0007 y 0009) ──────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'institutions', 'content_sources', 'passages', 'levels', 'exams', 'areas',
    'careers', 'subjects', 'topics', 'explanation_layers', 'question_reports',
    'content_items', 'professors', 'processed_stripe_events'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'admin_only_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()))',
      'admin_only_' || t, t
    );
  END LOOP;

  -- Estas dos son FOR SELECT (migración 0007): nunca son escribibles vía
  -- PostgREST, ni siquiera por un admin.
  FOREACH t IN ARRAY ARRAY['source_chunks', 'question_source_chunks'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'admin_only_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING ((SELECT public.is_admin()))',
      'admin_only_' || t, t
    );
  END LOOP;
END $$;

-- ════════════════════════════════════════════════════════════════════
-- 4. ESTADÍSTICAS
-- ════════════════════════════════════════════════════════════════════
-- Sin esto el planificador puede seguir usando los conteos viejos y no elegir
-- los índices recién creados.
ANALYZE exam_sessions, session_answers, questions, topics, subjects,
        user_profiles, weak_topics, parent_links, parent_link_codes, payments;

-- ════════════════════════════════════════════════════════════════════
-- 5. PENDIENTE QUE ESTA MIGRACIÓN **NO** PUEDE APLICAR
-- ════════════════════════════════════════════════════════════════════
-- `src/lib/db/auth-users.ts` lee correos con
--     SELECT id, email FROM auth.users WHERE id = ANY(...)
-- y el rol `acierta_ci` NO tiene acceso al esquema `auth`. Comprobado:
--     has_schema_privilege('acierta_ci','auth','USAGE') = false
-- Consecuencia real: los TRES correos programados (racha en riesgo, cuenta
-- regresiva del examen, resumen semanal al tutor) fallan con
-- `42501 permission denied for schema auth`. Como el runner los corre con
-- `Promise.allSettled`, no truena el cron: simplemente reporta 0 enviados y
-- deja el error en el log. Por eso nadie lo había notado.
--
-- El GRANT no se puede hacer desde aquí: el esquema `auth` es de
-- `supabase_admin` y el rol `postgres` solo tiene USAGE **sin** grant option
-- (`nspacl` = ...postgres=U/supabase_admin), así que su GRANT es un no-op
-- silencioso. Lo tiene que correr el dueño del proyecto con un rol con
-- privilegio suficiente:
--
--     GRANT USAGE ON SCHEMA auth TO acierta_ci;
--     GRANT SELECT (id, email) ON auth.users TO acierta_ci;
--
-- El grant por COLUMNA es deliberado: `acierta_ci` no necesita —y no debe
-- poder leer— `encrypted_password` ni el resto de `auth.users`.
--
-- Alternativa si se prefiere no tocar el esquema `auth`: reescribir
-- `getAuthEmails` sobre la API admin de Supabase, que necesita una
-- SUPABASE_SERVICE_ROLE_KEY real (hoy `.env.local` trae un marcador de 22
-- caracteres, no una llave).

-- ────────────────────────────────────────────────────────────────────
-- Nota operativa: `CREATE INDEX` toma un lock de escritura sobre la tabla.
-- Con el volumen actual (857 k filas en la tabla más grande de la prueba de
-- carga) tarda segundos, pero si se aplica con usuarios en línea conviene
-- reescribir los CREATE como `CREATE INDEX CONCURRENTLY` y correrlos FUERA de
-- una transacción, uno por uno.
