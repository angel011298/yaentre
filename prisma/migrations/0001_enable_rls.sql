-- Migración SQL: Habilitar RLS en todas las tablas con datos de usuario
-- Ejecutar después de: prisma migrate deploy
--
-- NOTA (F1): las columnas del schema son camelCase (Prisma no aplica @map a
-- campos, solo @@map a tablas). Los identificadores camelCase DEBEN ir entre
-- comillas dobles en Postgres. La versión anterior de este archivo usaba
-- snake_case y nunca habría funcionado contra la DB real. Corregido en F1.

-- user_profiles: cada quien su perfil; el padre lee del alumno vinculado
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_profile" ON user_profiles
  FOR ALL USING (auth.uid()::text = "userId");

CREATE POLICY "parent_reads_student" ON user_profiles
  FOR SELECT USING (
    id IN (
      SELECT pl."studentProfileId" FROM parent_links pl
      JOIN user_profiles p ON p.id = pl."parentProfileId"
      WHERE p."userId" = auth.uid()::text
    )
  );

-- questions: autenticados leen verificadas; ADMIN ve todas
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_verified" ON questions
  FOR SELECT USING (
    "isVerified" = true
    OR EXISTS (SELECT 1 FROM user_profiles
               WHERE "userId" = auth.uid()::text AND role = 'ADMIN')
  );

-- exam_sessions: dueño + padre vinculado (solo lectura)
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_sessions" ON exam_sessions
  FOR ALL USING (
    "userProfileId" IN (SELECT id FROM user_profiles WHERE "userId" = auth.uid()::text)
  );

-- subscriptions / payments: solo el dueño
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_subscriptions" ON subscriptions
  FOR ALL USING (
    "userProfileId" IN (SELECT id FROM user_profiles WHERE "userId" = auth.uid()::text)
  );

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_payments" ON payments
  FOR ALL USING (
    "subscriptionId" IN (
      SELECT id FROM subscriptions
      WHERE "userProfileId" IN (SELECT id FROM user_profiles WHERE "userId" = auth.uid()::text)
    )
  );

-- Otras tablas con datos de usuario
ALTER TABLE learning_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_learning_profile" ON learning_profiles
  FOR ALL USING (
    "userProfileId" IN (SELECT id FROM user_profiles WHERE "userId" = auth.uid()::text)
  );

ALTER TABLE weak_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_weak_topics" ON weak_topics
  FOR ALL USING (
    "userProfileId" IN (SELECT id FROM user_profiles WHERE "userId" = auth.uid()::text)
  );

ALTER TABLE streak_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_streak" ON streak_records
  FOR ALL USING (
    "userProfileId" IN (SELECT id FROM user_profiles WHERE "userId" = auth.uid()::text)
  );

ALTER TABLE session_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_session_answers" ON session_answers
  FOR ALL USING (
    "sessionId" IN (
      SELECT id FROM exam_sessions
      WHERE "userProfileId" IN (SELECT id FROM user_profiles WHERE "userId" = auth.uid()::text)
    )
  );

ALTER TABLE parent_link_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_parent_link_codes" ON parent_link_codes
  FOR ALL USING (
    "studentProfileId" IN (SELECT id FROM user_profiles WHERE "userId" = auth.uid()::text)
  );

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_notification_preferences" ON notification_preferences
  FOR ALL USING (
    "userProfileId" IN (SELECT id FROM user_profiles WHERE "userId" = auth.uid()::text)
  );

-- parent_links: el padre o el alumno vinculado
ALTER TABLE parent_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_parent_links" ON parent_links
  FOR ALL USING (
    "parentProfileId" IN (SELECT id FROM user_profiles WHERE "userId" = auth.uid()::text)
    OR "studentProfileId" IN (SELECT id FROM user_profiles WHERE "userId" = auth.uid()::text)
  );
