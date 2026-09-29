-- Bloque 3 — PROGRAMA DE REFERIDOS (ESPECIFICACION_QR_COMISIONES §3.1).
--
-- Idempotente: se puede reaplicar sin romper.
--
-- ⚠️ MISMO CRITERIO QUE 0012-0022: SQL aplicado como `postgres` vía el
-- panel/API de Supabase — el rol de la app (`acierta_prod`) NO tiene CREATE
-- sobre `public`. NO usar `prisma db execute` (devuelve `permission denied for
-- schema public`). Ninguna lista de roles (G73b): el privilegio va al rol de
-- grupo `acierta_app` de la migración 0015.
--
-- ORDEN: aplicar DESPUÉS de 0022 y ANTES de desplegar el código del Bloque 3:
-- el registro (`signUpAction`), el checkout y el webhook ya leen y escriben
-- estas tablas. Con la migración sin aplicar, el registro y el pago siguen
-- funcionando (cada uso del programa degrada con `reportSilentDegradation`), pero
-- ningún código de referido se crea ni se atribuye.
--
-- Qué agrega:
--   1. `referral_codes`      — un código por persona y tipo.
--   2. `referral_sales`      — una venta atribuida por compra (`purchaseId` ÚNICO).
--   3. `referral_credit_lots`— el crédito ganado (un lote por venta acreditada).
--   4. `referral_credit_redemptions` — el crédito apartado por un checkout.
--   5. `user_profiles.referredByCodeId` — a qué código se debe un registro.
--
-- 🔒 Las cuatro tablas son de SOLO SERVIDOR (RLS habilitada SIN política + REVOKE
-- a anon/authenticated): la app las lee y escribe ÚNICAMENTE por Prisma (rol
-- BYPASSRLS). Mismo escalón que `admin_audit_log` y `payment_refunds`.
--
-- Solo el Nivel 1 (Referido, en CRÉDITO) está activo. Los campos de Embajador y
-- Aliado (`holder*`, `paymentRail`) y `CommissionType.CASH` existen porque el
-- modelo de la spec los pide; ningún código los escribe (espera al contador).

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ENUMS
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE "ReferralType" AS ENUM ('REFERIDO', 'EMBAJADOR', 'ALIADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommissionType" AS ENUM ('CREDIT', 'CASH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'ACCRUED', 'PAID', 'REVERSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CreditRedemptionStatus" AS ENUM ('RESERVED', 'CONSUMED', 'RELEASED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. TABLAS
-- ═══════════════════════════════════════════════════════════════════════════

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "referredByCodeId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "referral_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userProfileId" TEXT,
    "type" "ReferralType" NOT NULL DEFAULT 'REFERIDO',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "holderName" TEXT,
    "holderRfc" TEXT,
    "holderClabe" TEXT,
    "paymentRail" "TeacherPaymentRail",

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "referral_sales" (
    "id" TEXT NOT NULL,
    "referralCodeId" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "buyerProfileId" TEXT NOT NULL,
    "saleAmount" INTEGER NOT NULL,
    "commissionAmount" INTEGER NOT NULL,
    "commissionType" "CommissionType" NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accrueAfter" TIMESTAMP(3) NOT NULL,
    "accruedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "reverseReason" TEXT,
    "fraudFlag" TEXT,
    "fraudClearedAt" TIMESTAMP(3),

    CONSTRAINT "referral_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "referral_credit_lots" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "remainingCents" INTEGER NOT NULL,
    "accruedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_credit_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "referral_credit_redemptions" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "allocations" JSONB NOT NULL,
    "status" "CreditRedemptionStatus" NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,

    CONSTRAINT "referral_credit_redemptions_pkey" PRIMARY KEY ("id")
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ÍNDICES
-- ═══════════════════════════════════════════════════════════════════════════

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "referral_codes_code_key" ON "referral_codes"("code");
CREATE INDEX IF NOT EXISTS "referral_codes_userProfileId_idx" ON "referral_codes"("userProfileId");
-- Una persona, un código por tipo: cierra la carrera de dos clics que lo generan a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS "referral_codes_userProfileId_type_key" ON "referral_codes"("userProfileId", "type");

-- Una compra, a lo sumo una venta atribuida: reprocesar el webhook o correr el
-- respaldo diario dos veces jamás duplica una comisión.
CREATE UNIQUE INDEX IF NOT EXISTS "referral_sales_purchaseId_key" ON "referral_sales"("purchaseId");
CREATE INDEX IF NOT EXISTS "referral_sales_referralCodeId_createdAt_idx" ON "referral_sales"("referralCodeId", "createdAt");
CREATE INDEX IF NOT EXISTS "referral_sales_buyerProfileId_idx" ON "referral_sales"("buyerProfileId");
CREATE INDEX IF NOT EXISTS "referral_sales_status_accrueAfter_idx" ON "referral_sales"("status", "accrueAfter");
CREATE INDEX IF NOT EXISTS "referral_sales_fraudFlag_idx" ON "referral_sales"("fraudFlag");

CREATE UNIQUE INDEX IF NOT EXISTS "referral_credit_lots_saleId_key" ON "referral_credit_lots"("saleId");
CREATE INDEX IF NOT EXISTS "referral_credit_lots_userProfileId_expiresAt_idx" ON "referral_credit_lots"("userProfileId", "expiresAt");

CREATE UNIQUE INDEX IF NOT EXISTS "referral_credit_redemptions_subscriptionId_key" ON "referral_credit_redemptions"("subscriptionId");
CREATE INDEX IF NOT EXISTS "referral_credit_redemptions_userProfileId_status_idx" ON "referral_credit_redemptions"("userProfileId", "status");
CREATE INDEX IF NOT EXISTS "referral_credit_redemptions_status_createdAt_idx" ON "referral_credit_redemptions"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "user_profiles_referredByCodeId_idx" ON "user_profiles"("referredByCodeId");

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. CLAVES FORÁNEAS
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `referral_sales.buyerProfileId` y `referral_credit_redemptions.subscriptionId`
-- NO llevan clave foránea a propósito: son registros de lo que pasó y deben
-- sobrevivir aunque la cuenta o la suscripción se eliminen.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_referredByCodeId_fkey') THEN
    ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_referredByCodeId_fkey" FOREIGN KEY ("referredByCodeId") REFERENCES "referral_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_codes_userProfileId_fkey') THEN
    ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_sales_referralCodeId_fkey') THEN
    ALTER TABLE "referral_sales" ADD CONSTRAINT "referral_sales_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "referral_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_credit_lots_userProfileId_fkey') THEN
    ALTER TABLE "referral_credit_lots" ADD CONSTRAINT "referral_credit_lots_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_credit_lots_saleId_fkey') THEN
    ALTER TABLE "referral_credit_lots" ADD CONSTRAINT "referral_credit_lots_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "referral_sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_credit_redemptions_userProfileId_fkey') THEN
    ALTER TABLE "referral_credit_redemptions" ADD CONSTRAINT "referral_credit_redemptions_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. RLS DE SOLO SERVIDOR — mismo escalón que admin_audit_log / payment_refunds
-- ═══════════════════════════════════════════════════════════════════════════
--
-- RLS habilitada SIN política permisiva + REVOKE: ni anon ni authenticated leen
-- ni escriben por /rest/v1. Un `FOR ALL` aquí lo detendría solo el GRANT
-- (guardrail G65 §7); sin política no hay nada que un GRANT pueda abrir.

ALTER TABLE "referral_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "referral_sales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "referral_credit_lots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "referral_credit_redemptions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "referral_codes" FROM anon, authenticated;
REVOKE ALL ON TABLE "referral_sales" FROM anon, authenticated;
REVOKE ALL ON TABLE "referral_credit_lots" FROM anon, authenticated;
REVOKE ALL ON TABLE "referral_credit_redemptions" FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "referral_codes" TO acierta_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "referral_sales" TO acierta_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "referral_credit_lots" TO acierta_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "referral_credit_redemptions" TO acierta_app;
