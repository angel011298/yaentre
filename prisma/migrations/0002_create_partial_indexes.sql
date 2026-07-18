-- Migración SQL: Crear índices parciales para optimizar queries
-- Ejecutar después de: prisma db seed
--
-- NOTA (F1): columnas en camelCase entre comillas dobles (ver 0001).
-- `idx_session_answers_by_session` se eliminó: es redundante con el índice
-- `session_answers_sessionId_idx` que ya genera Prisma desde @@index.

-- Índice parcial para reactivos publicables (solo verificados)
CREATE INDEX "idx_questions_publishable"
  ON questions("topicId", difficulty)
  WHERE "isVerified" = true;

-- Índices para selección adaptativa (temas débiles del usuario)
CREATE INDEX "idx_weak_topics_ordered"
  ON weak_topics("userProfileId", "hitRate")
  WHERE "hitRate" < 0.60;

-- Índice para conteo de simulacros FREE (muro suave)
CREATE INDEX "idx_exam_sessions_free_simulators"
  ON exam_sessions("userProfileId", mode, status)
  WHERE mode = 'FULL_SIMULATION' AND status IN ('COMPLETED', 'COMPLETED_BY_TIMEOUT');

-- Índice para verificar planes activos rápidamente
CREATE INDEX "idx_subscriptions_active"
  ON subscriptions("userProfileId", status)
  WHERE status = 'ACTIVE';

-- Índice para reactivos reportados sin resolver
CREATE INDEX "idx_question_reports_unresolved"
  ON question_reports("questionId")
  WHERE resolved = false;

-- Índice para búsqueda de sesiones abiertas por usuario
CREATE INDEX "idx_exam_sessions_open"
  ON exam_sessions("userProfileId", status)
  WHERE status = 'IN_PROGRESS';
