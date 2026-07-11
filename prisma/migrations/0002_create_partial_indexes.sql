-- Migración SQL: Crear índices parciales para optimizar queries
-- Ejecutar después de: prisma db seed

-- Índice parcial para reactivos publicables (solo verificados)
CREATE INDEX idx_questions_publishable
  ON questions(topic_id, difficulty)
  WHERE is_verified = true;

-- Índices para selección adaptativa (temas débiles del usuario)
CREATE INDEX idx_weak_topics_ordered
  ON weak_topics(user_profile_id, hit_rate)
  WHERE hit_rate < 0.60;

-- Índice para conteo de simulacros FREE (muro suave)
CREATE INDEX idx_exam_sessions_free_simulators
  ON exam_sessions(user_profile_id, mode, status)
  WHERE mode = 'FULL_SIMULATION' AND status IN ('COMPLETED', 'COMPLETED_BY_TIMEOUT');

-- Índice para verificar planes activos rápidamente
CREATE INDEX idx_subscriptions_active
  ON subscriptions(user_profile_id, status)
  WHERE status = 'ACTIVE';

-- Índice para reactivos reportados sin resolver
CREATE INDEX idx_question_reports_unresolved
  ON question_reports(question_id)
  WHERE resolved = false;

-- Índice para session_answers por sesión
CREATE INDEX idx_session_answers_by_session
  ON session_answers(session_id);

-- Índice para búsqueda de sesiones abiertas por usuario
CREATE INDEX idx_exam_sessions_open
  ON exam_sessions(user_profile_id, status)
  WHERE status = 'IN_PROGRESS';
