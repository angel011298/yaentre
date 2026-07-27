-- F22: hardening de seguridad — RLS y grants directos vía PostgREST.
--
-- HALLAZGO 1 (ERROR, get_advisors): 14 tablas con RLS deshabilitado,
-- expuestas por completo a anon/authenticated vía PostgREST usando solo
-- NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY (ambas públicas
-- por diseño). Verificado: CERO código del proyecto usa `supabase.from(...)`
-- — todo el acceso a datos es vía Prisma con el rol `acierta_ci`
-- (BYPASSRLS=true), así que ninguna de estas tablas necesita lectura pública
-- vía PostgREST. Política: admin-only en las 14, mismo patrón que
-- source_chunks/question_source_chunks (migración 0007).
--
-- El más grave de los 14: `explanation_layers` sin RLS permitía leer las
-- capas 2-4 (pagadas) directamente vía PostgREST sin pasar por
-- `evaluateExplanationLayerGate` — bypass total del muro de pago. Y
-- `processed_stripe_events` sin RLS permitía a cualquiera con la anon key
-- borrar/insertar filas del ledger de idempotencia de Stripe.

ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only_institutions" ON institutions FOR ALL USING (public.is_admin());

ALTER TABLE content_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only_content_sources" ON content_sources FOR ALL USING (public.is_admin());

ALTER TABLE passages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only_passages" ON passages FOR ALL USING (public.is_admin());

ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only_levels" ON levels FOR ALL USING (public.is_admin());

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only_exams" ON exams FOR ALL USING (public.is_admin());

ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only_areas" ON areas FOR ALL USING (public.is_admin());

ALTER TABLE careers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only_careers" ON careers FOR ALL USING (public.is_admin());

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only_subjects" ON subjects FOR ALL USING (public.is_admin());

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only_topics" ON topics FOR ALL USING (public.is_admin());

ALTER TABLE explanation_layers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only_explanation_layers" ON explanation_layers FOR ALL USING (public.is_admin());

ALTER TABLE question_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only_question_reports" ON question_reports FOR ALL USING (public.is_admin());

ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only_content_items" ON content_items FOR ALL USING (public.is_admin());

ALTER TABLE professors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only_professors" ON professors FOR ALL USING (public.is_admin());

ALTER TABLE processed_stripe_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only_processed_stripe_events" ON processed_stripe_events FOR ALL USING (public.is_admin());

-- HALLAZGO 2 (WARN, get_advisors — public_bucket_allows_listing): la política
-- `avatar_public_read` (migración 0008) permitía a CUALQUIERA (incluso anon)
-- enumerar TODOS los archivos del bucket vía `.list()`/query programática
-- sobre storage.objects — revela qué userIds (carpeta = auth.uid()) subieron
-- avatar. El bucket sigue siendo público para SERVIR imágenes (la URL directa
-- /object/public/... NUNCA pasa por esta política de RLS, es un endpoint
-- distinto que Supabase expone sin auth para buckets public:true) —
-- verificado que el código solo usa `getPublicUrl` (constructor de string
-- puro, no toca RLS), cero llamadas a `.list()` en todo el proyecto.

DROP POLICY "avatar_public_read" ON storage.objects;

CREATE POLICY "avatar_owner_or_admin_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

-- HALLAZGO 3 (CRÍTICO, encontrado en auditoría manual — NO estaba en
-- get_advisors): `anon` y `authenticated` tenían GRANT INSERT/UPDATE/DELETE
-- (default de Supabase/PostgREST) sobre las 28 tablas de public, y las
-- políticas RLS "own_X" de la migración 0001 usan `FOR ALL USING(...)` SIN
-- `WITH CHECK` que restrinja qué columnas cambian. Combinado, esto permitía a
-- CUALQUIER usuario autenticado, con una llamada PostgREST directa (solo
-- necesita el anon key público + su propio JWT):
--   • PATCH user_profiles SET role='ADMIN' sobre su propia fila
--     (escalación de privilegios total)
--   • PATCH subscriptions SET status='ACTIVE' (acceso premium sin pagar,
--     bypass total de Stripe — viola CLAUDE.md regla 4)
--   • PATCH session_answers SET isCorrect=true (manipular calificación,
--     viola CLAUDE.md regla 3 "scoring siempre server-side")
--   • PATCH exam_sessions SET score=... (falsificar resultados de simulacro)
--   • INSERT/UPDATE en weak_topics/streak_records/learning_profiles
--     (racha e insignias falsas)
--
-- Verificado: CERO uso de `supabase.from(...)` en todo el código (Prisma es
-- la ÚNICA vía de escritura real, vía el rol `acierta_ci`, ajeno a este
-- REVOKE). Se conserva SELECT (ya acotado correctamente por RLS por fila, y
-- requerido por scripts/verify-rls-isolation.ts, F19, que autentica con la
-- anon key para probar el aislamiento real).

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
