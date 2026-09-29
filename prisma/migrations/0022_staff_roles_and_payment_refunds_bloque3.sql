-- Bloque 3 — ROLES DE PERSONAL Y CONTABILIDAD DE COBROS.
--
-- Idempotente: se puede reaplicar sin romper.
--
-- ⚠️ MISMO CRITERIO QUE 0012-0021: SQL aplicado como `postgres` vía el
-- panel/API de Supabase — el rol de la app (`acierta_prod`) NO tiene CREATE
-- sobre `public`. NO usar `prisma db execute` (devuelve `permission denied for
-- schema public`). Ninguna lista de roles (G73b): el privilegio va al rol de
-- grupo `acierta_app` de la migración 0015.
--
-- ORDEN: aplicar DESPUÉS de 0021 y ANTES de desplegar el código del Bloque 3:
-- el webhook y los tableros ya leen `payments.paidAt` y `payment_refunds`.
--
-- Qué agrega:
--   1. Dos valores de `UserRole`: ACCOUNTANT (contador, solo lectura fiscal) y
--      SUPPORT (soporte: ARCO y reembolsos). `public.is_admin()` (0001) sigue
--      reconociendo SOLO a ADMIN, así que ninguno de los dos puede leer nada por
--      /rest/v1 con su sesión: toda su lectura pasa por la app, detrás de la
--      matriz de capacidades (`src/lib/admin/capabilities.ts`).
--   2. `payments.paidAt`: CUÁNDO se cobró de verdad. `createdAt` es cuándo se creó
--      la fila, y para OXXO/SPEI la fila nace PENDING con la ficha y el dinero
--      llega días después, a veces en otro mes. La base fiscal es de efectivo.
--   3. `payment_refunds`: un reembolso de un pago con SU fecha. El IVA de una
--      devolución se descuenta en el mes en que se HACE, que puede no ser el del
--      cobro, así que una columna acumulada («reembolsado: $X») no alcanza.
--
-- 🔒 `payment_refunds` es de solo servidor (RLS sin política permisiva + REVOKE):
-- la app la lee y escribe ÚNICAMENTE por Prisma (rol BYPASSRLS).

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ROLES DE PERSONAL
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `ADD VALUE IF NOT EXISTS` es idempotente. Un valor nuevo de un enum NO puede
-- usarse en la MISMA transacción que lo agrega (PostgreSQL); esta migración no
-- lo usa en ninguna sentencia, así que puede correr entera en una sola.

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ACCOUNTANT';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPPORT';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. FECHA DE COBRO
-- ═══════════════════════════════════════════════════════════════════════════

-- AlterTable
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);

-- Relleno de las filas históricas: para un pago ya SUCCEEDED, lo más cercano a
-- «cuándo se cobró» que existe es cuándo se creó la fila. Solo toca filas sin
-- fecha, así que reaplicar la migración no pisa un `paidAt` real.
UPDATE "payments" SET "paidAt" = "createdAt" WHERE "status" = 'SUCCEEDED' AND "paidAt" IS NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_paidAt_idx" ON "payments"("paidAt");

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. REEMBOLSOS
-- ═══════════════════════════════════════════════════════════════════════════

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "RefundSource" AS ENUM ('WEBHOOK', 'SUPPORT', 'RECONCILIATION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "payment_refunds" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "stripeRefundId" TEXT NOT NULL,
    "amountMxn" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "source" "RefundSource" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "payment_refunds_stripeRefundId_key" ON "payment_refunds"("stripeRefundId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payment_refunds_paymentId_idx" ON "payment_refunds"("paymentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payment_refunds_occurredAt_idx" ON "payment_refunds"("occurredAt");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_refunds_paymentId_fkey') THEN
    ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. RLS DE SOLO SERVIDOR — mismo escalón que admin_audit_log / class_sessions
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "payment_refunds" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "payment_refunds" FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "payment_refunds" TO acierta_app;
