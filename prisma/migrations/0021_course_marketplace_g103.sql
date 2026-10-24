-- G103 — COURSE MARKETPLACE: cursos pregrabados, inscripciones y progreso,
-- más los buckets PRIVADOS de videos de cursos y de documentos de profesores.
--
-- Reporte: docs/ESTADO.md §G103 y docs/RETORNO_HORARIOS_CURSOS.md.
-- Mismo camino que 0012-0020: SQL plano aplicado como `postgres` por el
-- panel/API de Supabase. Tablas, índices y llaves foráneas = DDL de
-- `prisma migrate diff` en forma idempotente; al final, lo que Prisma no
-- modela (CHECK, RLS, Storage).
--
-- 100 % ADITIVA: tablas, tipos, buckets, funciones y políticas NUEVOS.

DO $$ BEGIN
  CREATE TYPE "CourseCategory" AS ENUM ('REGULARIZACION', 'IDIOMAS', 'HABILIDADES', 'TECNOLOGIA', 'OTRO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CourseLevel" AS ENUM ('BASICO', 'INTERMEDIO', 'AVANZADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LessonType" AS ENUM ('VIDEO', 'TEXT', 'QUIZ', 'RESOURCE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PayoutAdjustmentKind" AS ENUM ('REFUND', 'CANCEL_REVERSAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PayoutSourceKind" AS ENUM ('CLASS', 'COURSE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "courses" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "learningOutcomes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" "CourseCategory" NOT NULL,
    "subjectArea" TEXT NOT NULL,
    "level" "CourseLevel" NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totalDurationMinutes" INTEGER NOT NULL DEFAULT 0,
    "totalLessons" INTEGER NOT NULL DEFAULT 0,
    "priceCents" INTEGER NOT NULL,
    "originalPriceCents" INTEGER,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "thumbnailPath" TEXT,
    "previewVideoPath" TEXT,
    "totalEnrollments" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRatings" INTEGER NOT NULL DEFAULT 0,
    "totalRevenueCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "course_modules" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_modules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "course_lessons" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "LessonType" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "videoPath" TEXT,
    "videoDurationSeconds" INTEGER,
    "videoSizeBytes" INTEGER,
    "content" TEXT,
    "resourcePath" TEXT,
    "resourceSizeBytes" INTEGER,
    "quizData" JSONB,
    "isFreePreview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_lessons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "course_enrollments" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "pricePaidCents" INTEGER NOT NULL,
    "teacherPayCents" INTEGER NOT NULL DEFAULT 0,
    "commissionCents" INTEGER NOT NULL DEFAULT 0,
    "stripePaymentId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "stripeCustomerId" TEXT,
    "paidAt" TIMESTAMP(3),
    "consentAt" TIMESTAMP(3),
    "consentVersion" TEXT,
    "completedLessons" INTEGER NOT NULL DEFAULT 0,
    "totalLessons" INTEGER NOT NULL,
    "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3),
    "lastLessonId" TEXT,
    "rating" INTEGER,
    "review" TEXT,
    "ratedAt" TIMESTAMP(3),
    "reviewHidden" BOOLEAN NOT NULL DEFAULT false,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "refundedAt" TIMESTAMP(3),
    "payoutId" TEXT,
    "payoutTeacherCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "course_lesson_progress" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "videoProgressSeconds" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_lesson_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "courses_slug_key" ON "courses"("slug");

CREATE INDEX IF NOT EXISTS "courses_teacherId_idx" ON "courses"("teacherId");

CREATE INDEX IF NOT EXISTS "courses_status_idx" ON "courses"("status");

CREATE INDEX IF NOT EXISTS "courses_category_idx" ON "courses"("category");

CREATE INDEX IF NOT EXISTS "courses_subjectArea_idx" ON "courses"("subjectArea");

CREATE INDEX IF NOT EXISTS "courses_priceCents_idx" ON "courses"("priceCents");

CREATE INDEX IF NOT EXISTS "course_modules_courseId_sortOrder_idx" ON "course_modules"("courseId", "sortOrder");

CREATE INDEX IF NOT EXISTS "course_lessons_moduleId_sortOrder_idx" ON "course_lessons"("moduleId", "sortOrder");

CREATE UNIQUE INDEX IF NOT EXISTS "course_enrollments_stripePaymentId_key" ON "course_enrollments"("stripePaymentId");

CREATE UNIQUE INDEX IF NOT EXISTS "course_enrollments_stripeCheckoutSessionId_key" ON "course_enrollments"("stripeCheckoutSessionId");

CREATE INDEX IF NOT EXISTS "course_enrollments_userProfileId_idx" ON "course_enrollments"("userProfileId");

CREATE INDEX IF NOT EXISTS "course_enrollments_status_idx" ON "course_enrollments"("status");

CREATE INDEX IF NOT EXISTS "course_enrollments_payoutId_idx" ON "course_enrollments"("payoutId");

CREATE UNIQUE INDEX IF NOT EXISTS "course_enrollments_courseId_userProfileId_key" ON "course_enrollments"("courseId", "userProfileId");

-- Libro de ajustes de las liquidaciones (reembolsos posteriores a un pago).
CREATE TABLE IF NOT EXISTS "teacher_payout_adjustments" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "kind" "PayoutAdjustmentKind" NOT NULL,
    "sourceKind" "PayoutSourceKind" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourcePayoutId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "note" TEXT,
    "appliedInPayoutId" TEXT,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_payout_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "teacher_payout_adjustments_teacherId_appliedInPayoutId_idx" ON "teacher_payout_adjustments"("teacherId", "appliedInPayoutId");

CREATE INDEX IF NOT EXISTS "teacher_payout_adjustments_sourceKind_sourceId_sourcePayout_idx" ON "teacher_payout_adjustments"("sourceKind", "sourceId", "sourcePayoutId");

CREATE INDEX IF NOT EXISTS "course_lesson_progress_lessonId_idx" ON "course_lesson_progress"("lessonId");

CREATE UNIQUE INDEX IF NOT EXISTS "course_lesson_progress_enrollmentId_lessonId_key" ON "course_lesson_progress"("enrollmentId", "lessonId");

DO $$ BEGIN
  ALTER TABLE "courses" ADD CONSTRAINT "courses_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "course_lessons" ADD CONSTRAINT "course_lessons_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "course_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "teacher_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "course_lesson_progress" ADD CONSTRAINT "course_lesson_progress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "course_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "course_lesson_progress" ADD CONSTRAINT "course_lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "course_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "teacher_payout_adjustments" ADD CONSTRAINT "teacher_payout_adjustments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "teacher_payout_adjustments" ADD CONSTRAINT "teacher_payout_adjustments_appliedInPayoutId_fkey" FOREIGN KEY ("appliedInPayoutId") REFERENCES "teacher_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Invariantes de dinero y de calificación ────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "teacher_payout_adjustments" ADD CONSTRAINT "teacher_payout_adjustments_amount_chk"
    CHECK ("amountCents" <> 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "courses" ADD CONSTRAINT "courses_price_chk"
    CHECK (("isFree" AND "priceCents" = 0) OR (NOT "isFree" AND "priceCents" BETWEEN 9900 AND 999900));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_money_chk"
    CHECK ("pricePaidCents" >= 0 AND "teacherPayCents" + "commissionCents" = "pricePaidCents");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_rating_chk"
    CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- RLS DE LAS TABLAS — mismo escalón que las de 0020
-- ════════════════════════════════════════════════════════════════════════════
-- Solo Prisma (rol de grupo `acierta_app`) las lee y escribe, detrás de sus
-- guards. RLS sin políticas permisivas + REVOKE: con la anon key no se lee ni
-- se escribe una fila.
ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "course_modules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "course_lessons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "course_enrollments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "course_lesson_progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teacher_payout_adjustments" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "courses", "course_modules", "course_lessons", "course_enrollments",
  "course_lesson_progress", "teacher_payout_adjustments" FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "courses", "course_modules", "course_lessons",
  "course_enrollments", "course_lesson_progress", "teacher_payout_adjustments" TO acierta_app;

-- ════════════════════════════════════════════════════════════════════════════
-- STORAGE — BUCKETS PRIVADOS
-- ════════════════════════════════════════════════════════════════════════════
--
-- `course-videos`: videos, portadas, previews y PDF de los cursos, en
-- `courses/<courseId>/...` con nombres que genera el SERVIDOR
-- (`crypto.randomUUID()` + la extensión del tipo validado). Privado: no hay
-- URL pública; se lee con URLs firmadas de vida corta que el servidor emite
-- DESPUÉS de verificar la inscripción. `allowed_mime_types` es una segunda
-- barrera (la primera es la acción, que además valida la FIRMA real del
-- archivo tras subirlo). Sin `file_size_limit` propio: el tope de 500 MB por
-- video y 5 GB por curso lo aplica la acción con un mensaje legible, y el
-- límite global del plan de Supabase manda por encima (50 MB en el plan
-- gratuito — ver el checklist de despliegue).
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES (
  'course-videos', 'course-videos', false,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET public = false, allowed_mime_types = EXCLUDED.allowed_mime_types;

-- `teacher-documents`: constancias de situación fiscal (Carril A). Solo PDF.
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES ('teacher-documents', 'teacher-documents', false, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── Funciones de autorización (patrón de `is_admin()`, migración 0001) ─────
--
-- SECURITY DEFINER propiedad de `postgres`, con `search_path` fijo: resuelven
-- quién es el profesor o si hay inscripción SIN re-disparar RLS sobre las
-- tablas (que además están cerradas a `anon`/`authenticated`). Adaptación de
-- las políticas de ejemplo de la spec (§2.5), que consultaban `"Course"` y
-- `"Teacher"` directamente: esos nombres no existen aquí (`courses`,
-- `teachers`), el usuario es `user_profiles."userId"` = `auth.uid()`, y una
-- consulta directa desde la política fallaría por los REVOKE de arriba.

CREATE OR REPLACE FUNCTION public.current_teacher_id()
  RETURNS text LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT t.id FROM teachers t WHERE t."userProfileId" = public.current_profile_id() LIMIT 1;
$$;

-- Escribir (subir o borrar) dentro de `courses/<id>/`: SOLO el profesor dueño,
-- ACTIVO, y solo mientras el curso se edita (borrador o rechazado). Un curso
-- en revisión o publicado no cambia su contenido por debajo del admin.
CREATE OR REPLACE FUNCTION public.can_write_course_object(object_name text)
  RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT split_part(object_name, '/', 1) = 'courses' AND EXISTS (
    SELECT 1 FROM courses c
    JOIN teachers t ON t.id = c."teacherId"
    WHERE c.id = split_part(object_name, '/', 2)
      AND t."userProfileId" = public.current_profile_id()
      AND t.status = 'ACTIVE'
      AND c.status IN ('DRAFT', 'REJECTED')
  );
$$;

-- Leer un objeto de `courses/<id>/`:
--   · el profesor dueño, siempre;
--   · un ADMIN (revisión de contenido);
--   · un alumno con inscripción ACTIVA o COMPLETADA (no reembolsada) — el
--     acceso es permanente aunque el curso se archive;
--   · cualquiera (incluido `anon`), SOLO la portada y el video de preview de
--     un curso PUBLICADO, y los archivos de una lección marcada como preview
--     gratuito de un curso PUBLICADO.
CREATE OR REPLACE FUNCTION public.can_read_course_object(object_name text)
  RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT split_part(object_name, '/', 1) = 'courses' AND (
    EXISTS (
      SELECT 1 FROM courses c JOIN teachers t ON t.id = c."teacherId"
      WHERE c.id = split_part(object_name, '/', 2) AND t."userProfileId" = public.current_profile_id()
    )
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM course_enrollments e
      WHERE e."courseId" = split_part(object_name, '/', 2)
        AND e."userProfileId" = public.current_profile_id()
        AND e.status IN ('ACTIVE', 'COMPLETED')
    )
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = split_part(object_name, '/', 2) AND c.status = 'PUBLISHED'
        AND (c."thumbnailPath" = object_name OR c."previewVideoPath" = object_name)
    )
    OR EXISTS (
      SELECT 1 FROM course_lessons l
      JOIN course_modules m ON m.id = l."moduleId"
      JOIN courses c ON c.id = m."courseId"
      WHERE c.id = split_part(object_name, '/', 2) AND c.status = 'PUBLISHED' AND l."isFreePreview"
        AND (l."videoPath" = object_name OR l."resourcePath" = object_name)
    )
  );
$$;

REVOKE ALL ON FUNCTION public.current_teacher_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_write_course_object(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_read_course_object(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_teacher_id() TO anon, authenticated, acierta_app;
GRANT EXECUTE ON FUNCTION public.can_write_course_object(text) TO anon, authenticated, acierta_app;
GRANT EXECUTE ON FUNCTION public.can_read_course_object(text) TO anon, authenticated, acierta_app;

-- ── Políticas de `storage.objects` ──────────────────────────────────────────
DROP POLICY IF EXISTS "course_videos_select" ON storage.objects;
CREATE POLICY "course_videos_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'course-videos' AND public.can_read_course_object(name));

DROP POLICY IF EXISTS "course_videos_insert" ON storage.objects;
CREATE POLICY "course_videos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-videos' AND public.can_write_course_object(name));

DROP POLICY IF EXISTS "course_videos_delete" ON storage.objects;
CREATE POLICY "course_videos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'course-videos' AND public.can_write_course_object(name));
-- Sin política de UPDATE: un objeto subido no se reemplaza en sitio (las
-- rutas son únicas por subida). Sin UPDATE nadie puede sobrescribir.

DROP POLICY IF EXISTS "teacher_documents_insert" ON storage.objects;
CREATE POLICY "teacher_documents_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'teacher-documents'
    AND split_part(name, '/', 1) = 'teachers'
    AND split_part(name, '/', 2) = public.current_teacher_id()
  );

DROP POLICY IF EXISTS "teacher_documents_select" ON storage.objects;
CREATE POLICY "teacher_documents_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'teacher-documents'
    AND (public.is_admin() OR split_part(name, '/', 2) = public.current_teacher_id())
  );
