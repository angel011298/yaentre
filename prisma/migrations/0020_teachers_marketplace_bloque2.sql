-- Bloque 2 — MARKETPLACE DE PROFESORES: modelo de datos (spec §2).
--
-- Idempotente: se puede reaplicar sin romper.
--
-- ⚠️ MISMO CRITERIO QUE 0012-0019: SQL aplicado como `postgres` vía el
-- panel/API de Supabase — el rol de la app (`acierta_prod`) NO tiene CREATE
-- sobre `public`. NO usar `prisma db execute` (devuelve `permission denied for
-- schema public`). Ninguna lista de roles (G73b): el privilegio va al rol de
-- grupo `acierta_app` de la migración 0015.
--
-- ORDEN: aplicar DESPUÉS de 0019 (`user_profiles` ya debe tener las columnas de
-- fecha de nacimiento). Las claves foráneas de esta migración apuntan a
-- `user_profiles`.
--
-- El DDL de las secciones 1-4 lo GENERÓ Prisma (`prisma migrate diff` entre el
-- schema anterior y el actual) y se envolvió en bloques idempotentes; por eso
-- `prisma migrate diff` contra la base ya migrada debe salir VACÍO (salvo los
-- índices de rendimiento de 0012, que viven fuera de schema.prisma a
-- propósito).
--
-- 🔒 `teachers` guarda CURP, CLABE, RFC y teléfono; `class_sessions` guarda el
-- historial de clases de alumnos —a veces MENORES— y la ubicación de sus
-- grabaciones (imagen y voz). Por eso la sección 5 cierra las cuatro tablas al
-- navegador con RLS SIN política permisiva + REVOKE: la app las toca ÚNICAMENTE
-- por Prisma (rol BYPASSRLS), detrás de sus guards.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1-4. ENUMS, TABLAS, ÍNDICES Y CLAVES FORÁNEAS (generado por Prisma)
-- ═══════════════════════════════════════════════════════════════════════════

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TeacherPaymentRail" AS ENUM ('ASIMILADOS', 'COMISION_MERCANTIL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TeacherLevel" AS ENUM ('INICIAL', 'VERIFICADO', 'DESTACADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TeacherStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'SUSPENDED', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ClassStatus" AS ENUM ('PENDING_PAYMENT', 'BOOKED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW_TEACHER', 'NO_SHOW_STUDENT', 'DISPUTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CancelledBy" AS ENUM ('STUDENT', 'TEACHER', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'TRANSFERRED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "RetentionStatus" AS ENUM ('HELD', 'RELEASED', 'FORFEITED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "teachers" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "publicName" TEXT NOT NULL,
    "bio" TEXT,
    "rfc" TEXT,
    "curp" TEXT NOT NULL,
    "clabe" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "clabeUpdatedAt" TIMESTAMP(3),
    "paymentRail" "TeacherPaymentRail" NOT NULL DEFAULT 'ASIMILADOS',
    "csfDocumentUrl" TEXT,
    "availability" JSONB NOT NULL DEFAULT '[]',
    "level" "TeacherLevel" NOT NULL DEFAULT 'INICIAL',
    "levelPromotedAt" TIMESTAMP(3),
    "status" "TeacherStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "onboardedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspendReason" TEXT,
    "contractAcceptedAt" TIMESTAMP(3),
    "contractVersion" TEXT,
    "ndaAcceptedAt" TIMESTAMP(3),
    "recordingPolicyAcceptedAt" TIMESTAMP(3),
    "totalClassesGiven" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "cancellationRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthsActive" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "teacher_subjects" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "baseRate" INTEGER NOT NULL,

    CONSTRAINT "teacher_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "class_sessions" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "baseTariffCents" INTEGER NOT NULL,
    "levelMultiplier" DOUBLE PRECISION NOT NULL,
    "durationMultiplier" DOUBLE PRECISION NOT NULL,
    "advanceMultiplier" DOUBLE PRECISION NOT NULL,
    "scheduleMultiplier" DOUBLE PRECISION NOT NULL,
    "demandMultiplier" DOUBLE PRECISION NOT NULL,
    "finalTariffCents" INTEGER NOT NULL,
    "commissionCents" INTEGER NOT NULL,
    "teacherPayCents" INTEGER NOT NULL,
    "stripePaymentId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "refundDueCents" INTEGER NOT NULL DEFAULT 0,
    "refundedCents" INTEGER NOT NULL DEFAULT 0,
    "stripeRefundId" TEXT,
    "status" "ClassStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" "CancelledBy",
    "cancellationReason" TEXT,
    "confirmationRequestedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "adminAlertedAt" TIMESTAMP(3),
    "meetingLinkSentAt" TIMESTAMP(3),
    "studentRating" INTEGER,
    "studentFeedback" TEXT,
    "ratedAt" TIMESTAMP(3),
    "disputeReason" TEXT,
    "disputedAt" TIMESTAMP(3),
    "meetingUrl" TEXT,
    "meetingEventId" TEXT,
    "recordingConsent" BOOLEAN NOT NULL DEFAULT false,
    "recordingUrl" TEXT,
    "recordingExpiresAt" TIMESTAMP(3),
    "payoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "teacher_payouts" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "retentionCents" INTEGER NOT NULL,
    "netCents" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "transferredAt" TIMESTAMP(3),
    "speiReference" TEXT,
    "failedAt" TIMESTAMP(3),
    "failReason" TEXT,
    "retentionReleasedAt" TIMESTAMP(3),
    "retentionStatus" "RetentionStatus" NOT NULL DEFAULT 'HELD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "teachers_userProfileId_key" ON "teachers"("userProfileId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "teachers_curp_key" ON "teachers"("curp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "teachers_status_idx" ON "teachers"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "teachers_level_idx" ON "teachers"("level");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "teachers_paymentRail_idx" ON "teachers"("paymentRail");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "teacher_subjects_subjectKey_idx" ON "teacher_subjects"("subjectKey");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "teacher_subjects_teacherId_subjectKey_key" ON "teacher_subjects"("teacherId", "subjectKey");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "class_sessions_stripeCheckoutSessionId_key" ON "class_sessions"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "class_sessions_teacherId_scheduledAt_idx" ON "class_sessions"("teacherId", "scheduledAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "class_sessions_studentProfileId_status_idx" ON "class_sessions"("studentProfileId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "class_sessions_status_idx" ON "class_sessions"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "class_sessions_scheduledAt_idx" ON "class_sessions"("scheduledAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "class_sessions_payoutId_idx" ON "class_sessions"("payoutId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "teacher_payouts_teacherId_idx" ON "teacher_payouts"("teacherId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "teacher_payouts_status_idx" ON "teacher_payouts"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "teacher_payouts_periodEnd_idx" ON "teacher_payouts"("periodEnd");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teachers_userProfileId_fkey') THEN
    ALTER TABLE "teachers" ADD CONSTRAINT "teachers_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_subjects_teacherId_fkey') THEN
    ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_sessions_teacherId_fkey') THEN
    ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_sessions_studentProfileId_fkey') THEN
    ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_sessions_payoutId_fkey') THEN
    ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "teacher_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_payouts_teacherId_fkey') THEN
    ALTER TABLE "teacher_payouts" ADD CONSTRAINT "teacher_payouts_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. RLS DE SOLO SERVIDOR — mismo escalón que admin_audit_log / tutor_consents
-- ═══════════════════════════════════════════════════════════════════════════
--
-- RLS habilitada SIN ninguna política permisiva = denegación total para
-- `anon`/`authenticated`. El REVOKE es el segundo candado: los privilegios por
-- defecto de un proyecto Supabase conceden escritura a esos roles sobre CADA
-- tabla nueva (G73b). El GRANT va al rol de GRUPO `acierta_app` (0015), nunca a
-- una lista de roles de conexión.

ALTER TABLE "teachers"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teacher_subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "class_sessions"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teacher_payouts"  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "teachers"         FROM anon, authenticated;
REVOKE ALL ON TABLE "teacher_subjects" FROM anon, authenticated;
REVOKE ALL ON TABLE "class_sessions"   FROM anon, authenticated;
REVOKE ALL ON TABLE "teacher_payouts"  FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "teachers"         TO acierta_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "teacher_subjects" TO acierta_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "class_sessions"   TO acierta_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "teacher_payouts"  TO acierta_app;
