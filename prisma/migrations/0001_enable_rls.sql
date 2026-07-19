-- Migración SQL: Habilitar RLS en todas las tablas con datos de usuario.
--
-- NOTAS (validado contra Supabase real en F1):
-- 1. Columnas en camelCase entre comillas dobles: el schema.prisma no aplica
--    @map a los campos (solo @@map a las tablas), así que las columnas son
--    camelCase. La versión snake_case previa nunca habría funcionado.
-- 2. Funciones SECURITY DEFINER para romper la recursión infinita: consultar
--    user_profiles/parent_links DENTRO de una política de esas mismas tablas
--    dispara "infinite recursion detected in policy". Las funciones definer
--    resuelven la identidad del usuario sin re-disparar RLS.

-- ── Helpers (SECURITY DEFINER: corren como owner, saltan RLS) ──────────
CREATE OR REPLACE FUNCTION public.current_profile_id()
  RETURNS text LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id FROM user_profiles WHERE "userId" = auth.uid()::text LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE "userId" = auth.uid()::text AND role = 'ADMIN');
$$;

-- ── user_profiles: propio perfil; el padre lee del alumno vinculado ────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile" ON user_profiles
  FOR ALL USING (auth.uid()::text = "userId");
CREATE POLICY "parent_reads_student" ON user_profiles
  FOR SELECT USING (
    id IN (SELECT pl."studentProfileId" FROM parent_links pl
           WHERE pl."parentProfileId" = public.current_profile_id())
  );

-- ── questions: autenticados leen verificadas; ADMIN ve todas ───────────
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_verified" ON questions
  FOR SELECT USING ("isVerified" = true OR public.is_admin());

-- ── exam_sessions ─────────────────────────────────────────────────────
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_sessions" ON exam_sessions
  FOR ALL USING ("userProfileId" = public.current_profile_id());

-- ── subscriptions / payments ──────────────────────────────────────────
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_subscriptions" ON subscriptions
  FOR ALL USING ("userProfileId" = public.current_profile_id());

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_payments" ON payments
  FOR ALL USING (
    "subscriptionId" IN (SELECT id FROM subscriptions WHERE "userProfileId" = public.current_profile_id())
  );

-- ── Perfil de aprendizaje y progreso ──────────────────────────────────
ALTER TABLE learning_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_learning_profile" ON learning_profiles
  FOR ALL USING ("userProfileId" = public.current_profile_id());

ALTER TABLE weak_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_weak_topics" ON weak_topics
  FOR ALL USING ("userProfileId" = public.current_profile_id());

ALTER TABLE streak_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_streak" ON streak_records
  FOR ALL USING ("userProfileId" = public.current_profile_id());

ALTER TABLE session_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_session_answers" ON session_answers
  FOR ALL USING (
    "sessionId" IN (SELECT id FROM exam_sessions WHERE "userProfileId" = public.current_profile_id())
  );

-- ── Vinculación parental y notificaciones ─────────────────────────────
ALTER TABLE parent_link_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_parent_link_codes" ON parent_link_codes
  FOR ALL USING ("studentProfileId" = public.current_profile_id());

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_notification_preferences" ON notification_preferences
  FOR ALL USING ("userProfileId" = public.current_profile_id());

ALTER TABLE parent_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_parent_links" ON parent_links
  FOR ALL USING (
    "parentProfileId" = public.current_profile_id()
    OR "studentProfileId" = public.current_profile_id()
  );
