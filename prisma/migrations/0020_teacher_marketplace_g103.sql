-- G103 — MARKETPLACE DE PROFESORES: alta, disponibilidad, clases y liquidaciones.
--
-- Prerrequisito mínimo de la spec del marketplace (§2.1) con las extensiones
-- de la spec de horarios/cursos/temporalidad (§1, §2.10, §5). Reporte:
-- docs/ESTADO.md §G103 y docs/RETORNO_HORARIOS_CURSOS.md.
--
-- Mismo camino que 0012-0019: SQL plano aplicado como `postgres` por el
-- panel/API de Supabase. El DDL de tablas, índices y llaves foráneas es el
-- que genera `prisma migrate diff` desde schema.prisma (convertido a forma
-- idempotente), así que la validación con `prisma migrate diff` debe dar
-- vacío para estas tablas. Lo que Prisma no modela vive al final: la
-- restricción de exclusión, los CHECK y la RLS.
--
-- 100 % ADITIVA: solo tablas, tipos e índices NUEVOS. El código anterior a
-- G103 no sabe que existen.

-- btree_gist: necesario para combinar `"teacherId" WITH =` (texto) con
-- `tsrange WITH &&` en una misma restricción de exclusión.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

DO $$ BEGIN
  CREATE TYPE "ClassTrack" AS ENUM ('ADMISION', 'REGULARIZACION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TeacherPaymentRail" AS ENUM ('ASIMILADOS', 'COMISION_MERCANTIL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TeacherLevel" AS ENUM ('INICIAL', 'VERIFICADO', 'DESTACADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TeacherStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'SUSPENDED', 'INACTIVE', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ClassStatus" AS ENUM ('PENDING_PAYMENT', 'BOOKED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW_TEACHER', 'NO_SHOW_STUDENT', 'DISPUTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CancelledBy" AS ENUM ('STUDENT', 'TEACHER', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'TRANSFERRED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RetentionStatus" AS ENUM ('HELD', 'RELEASED', 'FORFEITED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "teachers" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "fullName" TEXT NOT NULL,
    "curp" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "clabe" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "rfc" TEXT,
    "canInvoice" BOOLEAN NOT NULL DEFAULT false,
    "csfDocumentPath" TEXT,
    "paymentRail" "TeacherPaymentRail" NOT NULL DEFAULT 'ASIMILADOS',
    "level" "TeacherLevel" NOT NULL DEFAULT 'INICIAL',
    "levelPromotedAt" TIMESTAMP(3),
    "status" "TeacherStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewNote" TEXT,
    "onboardedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspendReason" TEXT,
    "contractAcceptedAt" TIMESTAMP(3),
    "contractVersion" TEXT,
    "ndaAcceptedAt" TIMESTAMP(3),
    "recordingPolicyAcceptedAt" TIMESTAMP(3),
    "courseTermsAcceptedAt" TIMESTAMP(3),
    "courseTermsVersion" TEXT,
    "totalClassesGiven" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRatings" INTEGER NOT NULL DEFAULT 0,
    "cancellationRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthsActive" INTEGER NOT NULL DEFAULT 0,
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "teacher_subjects" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "track" "ClassTrack" NOT NULL DEFAULT 'ADMISION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_subjects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "teacher_availability" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_availability_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "teacher_date_blocks" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "blockedDate" DATE NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_date_blocks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "class_sessions" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "track" "ClassTrack" NOT NULL DEFAULT 'ADMISION',
    "subjectKey" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "blockedUntil" TIMESTAMP(3) NOT NULL,
    "baseTariffCents" INTEGER NOT NULL,
    "levelMultiplier" DOUBLE PRECISION NOT NULL,
    "durationMultiplier" DOUBLE PRECISION NOT NULL,
    "advanceMultiplier" DOUBLE PRECISION NOT NULL,
    "scheduleMultiplier" DOUBLE PRECISION NOT NULL,
    "demandMultiplier" DOUBLE PRECISION NOT NULL,
    "finalTariffCents" INTEGER NOT NULL,
    "capped" BOOLEAN NOT NULL DEFAULT false,
    "commissionCents" INTEGER NOT NULL,
    "teacherPayCents" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripePaymentId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "holdExpiresAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundedCents" INTEGER NOT NULL DEFAULT 0,
    "stripeRefundId" TEXT,
    "studentAdultDeclaredAt" TIMESTAMP(3),
    "adultDeclarationVersion" TEXT,
    "status" "ClassStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" "CancelledBy",
    "cancellationReason" TEXT,
    "studentRating" INTEGER,
    "studentFeedback" TEXT,
    "ratedAt" TIMESTAMP(3),
    "meetingUrl" TEXT,
    "recordingUrl" TEXT,
    "recordingExpiresAt" TIMESTAMP(3),
    "payoutId" TEXT,
    "refundAdjustedPayoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "teacher_payouts" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "classRevenueCents" INTEGER NOT NULL DEFAULT 0,
    "courseRevenueCents" INTEGER NOT NULL DEFAULT 0,
    "grossCents" INTEGER NOT NULL,
    "retentionCents" INTEGER NOT NULL,
    "adjustmentCents" INTEGER NOT NULL DEFAULT 0,
    "releasedRetentionCents" INTEGER NOT NULL DEFAULT 0,
    "netCents" INTEGER NOT NULL,
    "classCount" INTEGER NOT NULL DEFAULT 0,
    "enrollmentCount" INTEGER NOT NULL DEFAULT 0,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "transferredAt" TIMESTAMP(3),
    "speiReference" TEXT,
    "failedAt" TIMESTAMP(3),
    "failReason" TEXT,
    "retentionReleaseAt" TIMESTAMP(3) NOT NULL,
    "retentionReleasedAt" TIMESTAMP(3),
    "retentionStatus" "RetentionStatus" NOT NULL DEFAULT 'HELD',
    "retentionPaidInPayoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_payouts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "teachers_userProfileId_key" ON "teachers"("userProfileId");

CREATE INDEX IF NOT EXISTS "teachers_status_idx" ON "teachers"("status");

CREATE INDEX IF NOT EXISTS "teachers_level_idx" ON "teachers"("level");

CREATE INDEX IF NOT EXISTS "teachers_paymentRail_idx" ON "teachers"("paymentRail");

CREATE INDEX IF NOT EXISTS "teacher_subjects_subjectKey_track_idx" ON "teacher_subjects"("subjectKey", "track");

CREATE UNIQUE INDEX IF NOT EXISTS "teacher_subjects_teacherId_subjectKey_track_key" ON "teacher_subjects"("teacherId", "subjectKey", "track");

CREATE INDEX IF NOT EXISTS "teacher_availability_teacherId_idx" ON "teacher_availability"("teacherId");

CREATE INDEX IF NOT EXISTS "teacher_availability_dayOfWeek_idx" ON "teacher_availability"("dayOfWeek");

CREATE INDEX IF NOT EXISTS "teacher_date_blocks_blockedDate_idx" ON "teacher_date_blocks"("blockedDate");

CREATE UNIQUE INDEX IF NOT EXISTS "teacher_date_blocks_teacherId_blockedDate_key" ON "teacher_date_blocks"("teacherId", "blockedDate");

CREATE UNIQUE INDEX IF NOT EXISTS "class_sessions_idempotencyKey_key" ON "class_sessions"("idempotencyKey");

CREATE UNIQUE INDEX IF NOT EXISTS "class_sessions_stripePaymentId_key" ON "class_sessions"("stripePaymentId");

CREATE UNIQUE INDEX IF NOT EXISTS "class_sessions_stripeCheckoutSessionId_key" ON "class_sessions"("stripeCheckoutSessionId");

CREATE INDEX IF NOT EXISTS "class_sessions_teacherId_scheduledAt_idx" ON "class_sessions"("teacherId", "scheduledAt");

CREATE INDEX IF NOT EXISTS "class_sessions_studentProfileId_idx" ON "class_sessions"("studentProfileId");

CREATE INDEX IF NOT EXISTS "class_sessions_status_idx" ON "class_sessions"("status");

CREATE INDEX IF NOT EXISTS "class_sessions_payoutId_idx" ON "class_sessions"("payoutId");

CREATE INDEX IF NOT EXISTS "teacher_payouts_teacherId_idx" ON "teacher_payouts"("teacherId");

CREATE INDEX IF NOT EXISTS "teacher_payouts_status_idx" ON "teacher_payouts"("status");

CREATE INDEX IF NOT EXISTS "teacher_payouts_periodEnd_idx" ON "teacher_payouts"("periodEnd");

CREATE UNIQUE INDEX IF NOT EXISTS "teacher_payouts_teacherId_periodStart_key" ON "teacher_payouts"("teacherId", "periodStart");

DO $$ BEGIN
  ALTER TABLE "teachers" ADD CONSTRAINT "teachers_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "teacher_availability" ADD CONSTRAINT "teacher_availability_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "teacher_date_blocks" ADD CONSTRAINT "teacher_date_blocks_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "teacher_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "teacher_payouts" ADD CONSTRAINT "teacher_payouts_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- DOBLE RESERVA IMPOSIBLE EN LA BASE (spec §1.7, §7.2)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Dos clases del MISMO profesor no pueden ocupar rangos que se encimen.
-- `blockedUntil` = inicio + duración + 10 min de margen (lo calcula
-- `blockedUntil()` en src/lib/teachers/conflict-prevention.ts), así que el
-- margen entre clases también lo garantiza la base. Rango semiabierto `[)`:
-- una clase que empieza justo cuando termina el margen de la anterior es
-- válida.
--
-- Solo cuentan los estados que OCUPAN el horario (los mismos que
-- `SLOT_OCCUPYING_STATUSES`). Una clase CANCELLED libera su horario. Un
-- apartado PENDING_PAYMENT ocupa hasta que la reserva siguiente lo cancele al
-- caducar (lo hace la transacción de reserva antes de insertar).
--
-- Dos alumnos que reservan el mismo horario a la vez: uno inserta y el otro
-- recibe 23P01 (exclusion_violation), que la app traduce a «ese horario se
-- acaba de ocupar». Nada que dependa de que la app lo haya revisado antes.
DO $$ BEGIN
  ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_no_overlap"
    EXCLUDE USING gist (
      "teacherId" WITH =,
      tsrange("scheduledAt", "blockedUntil", '[)') WITH &&
    )
    WHERE ("status" IN (
      'PENDING_PAYMENT', 'BOOKED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED',
      'NO_SHOW_TEACHER', 'NO_SHOW_STUDENT', 'DISPUTED'
    ));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;

-- ── Invariantes que no dependen de la app ──────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_duration_chk"
    CHECK ("durationMinutes" IN (50, 80));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_range_chk"
    CHECK ("blockedUntil" > "scheduledAt");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_money_chk"
    CHECK (
      "finalTariffCents" > 0
      AND "commissionCents" >= 0
      AND "teacherPayCents" >= 0
      AND "commissionCents" + "teacherPayCents" = "finalTariffCents"
      AND "refundedCents" >= 0
      AND "refundedCents" <= "finalTariffCents"
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "teacher_availability" ADD CONSTRAINT "teacher_availability_day_chk"
    CHECK ("dayOfWeek" BETWEEN 0 AND 6 AND "startTime" < "endTime");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "teacher_payouts" ADD CONSTRAINT "teacher_payouts_money_chk"
    CHECK ("grossCents" >= 0 AND "retentionCents" >= 0 AND "adjustmentCents" <= 0 AND "releasedRetentionCents" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- RLS — mismo escalón que admin_audit_log / admin_files / admin_notes
-- ════════════════════════════════════════════════════════════════════════════
--
-- Nadie lee ni escribe estas tablas desde el navegador: la app las consulta
-- ÚNICAMENTE por Prisma (rol de grupo `acierta_app`, BYPASSRLS), detrás de
-- sus guards. RLS habilitada SIN políticas permisivas = denegación total
-- para `anon`/`authenticated`; el REVOKE es el segundo candado (los
-- privilegios por defecto de Supabase conceden escritura a esos roles sobre
-- cada tabla nueva, G73b). `teachers` guarda CLABE, CURP y RFC: con la anon
-- key —pública, viaja en el bundle— no se puede leer ni una fila.
ALTER TABLE "teachers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teacher_subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teacher_availability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teacher_date_blocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "class_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teacher_payouts" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "teachers", "teacher_subjects", "teacher_availability",
  "teacher_date_blocks", "class_sessions", "teacher_payouts" FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "teachers", "teacher_subjects",
  "teacher_availability", "teacher_date_blocks", "class_sessions", "teacher_payouts"
  TO acierta_app;
