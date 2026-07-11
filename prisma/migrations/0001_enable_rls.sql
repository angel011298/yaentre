-- Migración SQL: Habilitar RLS en todas las tablas con datos de usuario
-- Ejecutar después de: prisma migrate deploy

-- user_profiles: cada quien su perfil; el padre lee del alumno vinculado
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_profile" ON user_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "parent_reads_student" ON user_profiles
  FOR SELECT USING (
    id IN (
      SELECT student_profile_id FROM parent_links pl
      JOIN user_profiles p ON p.id = pl.parent_profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- questions: autenticados leen verificadas; ADMIN ve todas
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_verified" ON questions
  FOR SELECT USING (
    is_verified = true
    OR EXISTS (SELECT 1 FROM user_profiles
               WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

-- exam_sessions: dueño + padre vinculado (solo lectura)
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_sessions" ON exam_sessions
  FOR ALL USING (
    user_profile_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
  );

-- subscriptions / payments: solo el dueño
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_subscriptions" ON subscriptions
  FOR ALL USING (
    user_profile_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
  );

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_payments" ON payments
  FOR ALL USING (
    subscription_id IN (
      SELECT id FROM subscriptions
      WHERE user_profile_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
    )
  );

-- Otras tablas con datos de usuario
ALTER TABLE learning_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_learning_profile" ON learning_profiles
  FOR ALL USING (
    user_profile_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
  );

ALTER TABLE weak_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_weak_topics" ON weak_topics
  FOR ALL USING (
    user_profile_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
  );

ALTER TABLE streak_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_streak" ON streak_records
  FOR ALL USING (
    user_profile_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
  );

ALTER TABLE session_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_session_answers" ON session_answers
  FOR ALL USING (
    session_id IN (
      SELECT id FROM exam_sessions
      WHERE user_profile_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
    )
  );

ALTER TABLE parent_link_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_parent_link_codes" ON parent_link_codes
  FOR ALL USING (
    student_profile_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
  );

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_notification_preferences" ON notification_preferences
  FOR ALL USING (
    user_profile_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
  );
