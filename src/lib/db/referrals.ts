import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { getAuthEmails } from './auth-users';
import {
  REVERSAL_WINDOW_DAYS,
  VELOCITY_WINDOW_HOURS,
  detectFraud,
  isHardFlag,
  parseFlags,
  serializeFlags,
  type FraudFlag,
} from '@/lib/referrals/antifraud';
import { generateReferralCode } from '@/lib/referrals/code';
import {
  accrueAfterDate,
  creditExpiry,
  decideCommission,
  REFERRAL_ELIGIBLE_PLANS,
} from '@/lib/referrals/commission';
import {
  availableCreditCents,
  nextExpiry,
  parseAllocations,
  planAllocation,
} from '@/lib/referrals/credit';
import { reportControlFailure } from '@/lib/observability/report';

/**
 * CAPA DE DATOS DEL PROGRAMA DE REFERIDOS — Bloque 3 (Nivel 1, en CRÉDITO).
 *
 * Toda la aritmética y las reglas viven en `src/lib/referrals/*` (puras y
 * probadas); aquí solo se consulta y se escribe. Tres reglas de diseño que
 * conviene tener presentes al tocar este archivo:
 *
 *  1. IDEMPOTENCIA POR RESTRICCIÓN, no por código. `referral_sales.purchaseId` es
 *     ÚNICO: reprocesar el webhook, o correr el respaldo diario dos veces, no
 *     puede duplicar una comisión porque la base no lo deja.
 *  2. EL CRÉDITO SE APARTA CON ACTUALIZACIONES CONDICIONALES. `remainingCents`
 *     baja con `updateMany … WHERE remainingCents >= x`: dos checkouts
 *     simultáneos de la misma persona no pueden gastar el mismo saldo.
 *  3. NADA AQUÍ ACTIVA ACCESO NI TOCA DINERO REAL. El crédito es un descuento;
 *     el efectivo (Nivel 2) espera al contador y no existe en este archivo.
 */

type Tx = Prisma.TransactionClient;

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

// ═══════════════════════════ CÓDIGOS ═══════════════════════════

export interface OwnCode {
  id: string;
  code: string;
  active: boolean;
}

const CODE_SELECT = { id: true, code: true, active: true } as const;

/**
 * El código REFERIDO de una persona; lo crea si no existe. Seguro ante dos clics
 * a la vez: el único `(userProfileId, type)` hace que el segundo INSERT falle y
 * se lea el ya creado. Una colisión REAL de código (31^8 combinaciones: casi
 * imposible) reintenta con otro sorteo.
 */
export async function ensureReferralCode(userProfileId: string): Promise<OwnCode> {
  const find = () =>
    prisma.referralCode.findUnique({
      where: { userProfileId_type: { userProfileId, type: 'REFERIDO' } },
      select: CODE_SELECT,
    });

  const existing = await find();
  if (existing) return existing;

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await prisma.referralCode.create({
        data: { code: generateReferralCode(), userProfileId, type: 'REFERIDO' },
        select: CODE_SELECT,
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      const raced = await find();
      if (raced) return raced;
      // Ni carrera de dos clics ni código propio: fue una colisión de `code`. Otro sorteo.
    }
  }
  throw new Error('No se pudo asignar un código de referido único.');
}

/** El código propio, sin crearlo. */
export async function getOwnReferralCode(userProfileId: string): Promise<OwnCode | null> {
  return prisma.referralCode.findUnique({
    where: { userProfileId_type: { userProfileId, type: 'REFERIDO' } },
    select: CODE_SELECT,
  });
}

/**
 * ¿A qué código se atribuye un registro nuevo? Solo códigos REFERIDO, activos y
 * con dueño: los de Embajador y Aliado (Nivel 2 y 3) NO atribuyen nada mientras
 * no exista el contrato y el contador (ver retorno).
 */
export async function resolveCodeForAttribution(code: string): Promise<{ id: string } | null> {
  const row = await prisma.referralCode.findUnique({
    where: { code },
    select: { id: true, active: true, type: true, userProfileId: true },
  });
  if (!row || !row.active || row.type !== 'REFERIDO' || !row.userProfileId) return null;
  return { id: row.id };
}

/**
 * ¿Este comprador viene de un referidor? Lo usa el checkout para saber si su
 * compra va a generar comisión y, por tanto, cuánto crédito cabe (tope de $500).
 */
export async function buyerIsAttributed(userProfileId: string): Promise<boolean> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: { referredByCode: { select: { active: true, type: true, userProfileId: true } } },
  });
  const code = profile?.referredByCode;
  return !!code && code.type === 'REFERIDO' && code.userProfileId !== null && code.userProfileId !== userProfileId;
}

// ═══════════════════════════ VENTAS ═══════════════════════════

export type RecordSaleOutcome =
  | { status: 'recorded'; saleId: string; blocked: boolean; flags: FraudFlag[] }
  | { status: 'exists' }
  | { status: 'not_found' }
  | { status: 'not_attributed' }
  | { status: 'no_code' }
  | { status: 'not_active' }
  | { status: 'not_eligible'; reason: string };

/**
 * Registra la venta atribuida de UNA compra (`Subscription.id`). Idempotente.
 *
 * Se llama DESPUÉS de que el pago ya activó el plan (nunca dentro de esa
 * transacción: un fallo aquí no puede revertir un acceso que el alumno pagó) y
 * otra vez, para lo que se haya quedado atrás, desde el respaldo diario.
 *
 * Deja que las excepciones suban: quien llama decide si es un reporte (webhook)
 * o un reintento mañana (respaldo). En particular, si NO se pueden leer los
 * correos no se registra nada: sin poder comprobar la autocompra no se abre un
 * camino a crédito (fail-closed).
 */
export async function recordReferralSale(subscriptionId: string, now: Date = new Date()): Promise<RecordSaleOutcome> {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    select: {
      id: true,
      plan: true,
      status: true,
      isComp: true,
      userProfileId: true,
      payments: { where: { status: 'SUCCEEDED' }, select: { amountMxn: true, paidAt: true } },
      userProfile: { select: { referredByCodeId: true } },
    },
  });
  if (!sub) return { status: 'not_found' };
  if (!sub.userProfile.referredByCodeId) return { status: 'not_attributed' };
  if (sub.status !== 'ACTIVE' && sub.status !== 'EXPIRED') return { status: 'not_active' };

  const paidCents = sub.payments.reduce((sum, p) => sum + p.amountMxn, 0);
  const decision = decideCommission({ plan: sub.plan, paidCents, isComp: sub.isComp });
  if (!decision.eligible) return { status: 'not_eligible', reason: decision.reason };

  const code = await prisma.referralCode.findUnique({
    where: { id: sub.userProfile.referredByCodeId },
    select: { id: true, type: true, userProfileId: true },
  });
  if (!code || code.type !== 'REFERIDO' || !code.userProfileId) return { status: 'no_code' };

  const emails = await getAuthEmails([sub.userProfileId, code.userProfileId]);

  const [salesInLast24h, reversalsInLast90d] = await Promise.all([
    prisma.referralSale.count({
      where: { referralCodeId: code.id, createdAt: { gte: new Date(now.getTime() - VELOCITY_WINDOW_HOURS * HOUR_MS) } },
    }),
    prisma.referralSale.count({
      where: {
        referralCodeId: code.id,
        status: 'REVERSED',
        reversedAt: { gte: new Date(now.getTime() - REVERSAL_WINDOW_DAYS * DAY_MS) },
      },
    }),
  ]);

  const verdict = detectFraud({
    referrerProfileId: code.userProfileId,
    buyerProfileId: sub.userProfileId,
    referrerEmail: emails.get(code.userProfileId) ?? null,
    buyerEmail: emails.get(sub.userProfileId) ?? null,
    salesInLast24h,
    reversalsInLast90d,
  });

  // El cobro más antiguo marca el inicio del periodo antifraude.
  const paidAt = sub.payments.map((p) => p.paidAt).filter((d): d is Date => d !== null).sort((a, b) => a.getTime() - b.getTime())[0] ?? now;

  try {
    const sale = await prisma.referralSale.create({
      data: {
        referralCodeId: code.id,
        purchaseId: sub.id,
        buyerProfileId: sub.userProfileId,
        saleAmount: paidCents,
        commissionAmount: verdict.blocked ? 0 : decision.commissionCents,
        commissionType: 'CREDIT',
        status: verdict.blocked ? 'REVERSED' : 'PENDING',
        accrueAfter: accrueAfterDate(paidAt),
        fraudFlag: serializeFlags(verdict.flags),
        ...(verdict.blocked
          ? { reversedAt: now, reverseReason: verdict.flags.find(isHardFlag) ?? 'fraud' }
          : {}),
      },
      select: { id: true },
    });
    return { status: 'recorded', saleId: sale.id, blocked: verdict.blocked, flags: verdict.flags };
  } catch (err) {
    if (isUniqueViolation(err)) return { status: 'exists' };
    throw err;
  }
}

/**
 * El mismo registro pero para el camino caliente del webhook: NUNCA lanza. Un
 * fallo aquí no puede volver un 200 en 500 (Stripe reintentaría una activación
 * que ya aplicó), pero tampoco puede quedar en silencio: el comprador ya pagó y
 * el referidor se queda sin su crédito hasta que el respaldo diario lo recoja.
 */
export async function recordReferralSaleSafely(subscriptionId: string, now: Date = new Date()): Promise<void> {
  try {
    await recordReferralSale(subscriptionId, now);
  } catch (err) {
    reportControlFailure('referral_sale', 'degraded', err, { subscriptionId });
  }
}

// ═══════════════════════════ REVERSIÓN ═══════════════════════════

export type ReverseReason = 'refund' | 'fraud' | 'subscription_canceled' | 'support_refund';

export interface ReverseOutcome {
  reversed: boolean;
  wasAccrued: boolean;
  /** Crédito que el referidor ya había GASTADO antes de la reversión (no se puede recuperar). */
  consumedBeforeReversalCents: number;
}

const NOT_REVERSED: ReverseOutcome = { reversed: false, wasAccrued: false, consumedBeforeReversalCents: 0 };

/**
 * Revierte una venta. PENDING → REVERSED. ACCRUED → REVERSED y el lote de
 * crédito se REVOCA (saldo a cero): un reembolso posterior al periodo antifraude
 * (solo lo hace un admin maestro) no deja crédito vivo. Lo que el referidor ya
 * gastó no se reclama — se informa en `consumedBeforeReversalCents`.
 */
export async function reverseSale(
  saleId: string,
  reason: ReverseReason,
  now: Date = new Date()
): Promise<ReverseOutcome> {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.referralSale.findUnique({
      where: { id: saleId },
      select: { id: true, status: true, creditLot: { select: { amountCents: true, remainingCents: true } } },
    });
    if (!sale || (sale.status !== 'PENDING' && sale.status !== 'ACCRUED')) return NOT_REVERSED;

    const changed = await tx.referralSale.updateMany({
      where: { id: saleId, status: { in: ['PENDING', 'ACCRUED'] } },
      data: { status: 'REVERSED', reversedAt: now, reverseReason: reason },
    });
    if (changed.count === 0) return NOT_REVERSED;

    const wasAccrued = sale.status === 'ACCRUED';
    if (wasAccrued) {
      await tx.referralCreditLot.updateMany({
        where: { saleId, revokedAt: null },
        data: { revokedAt: now, remainingCents: 0 },
      });
    }
    return {
      reversed: true,
      wasAccrued,
      consumedBeforeReversalCents: sale.creditLot ? sale.creditLot.amountCents - sale.creditLot.remainingCents : 0,
    };
  });
}

/** Revierte la venta de una compra, si tiene una. Lo llaman el reembolso de soporte y el de Stripe. */
export async function reverseSaleForSubscription(
  subscriptionId: string,
  reason: ReverseReason,
  now: Date = new Date()
): Promise<ReverseOutcome> {
  const sale = await prisma.referralSale.findUnique({ where: { purchaseId: subscriptionId }, select: { id: true } });
  if (!sale) return NOT_REVERSED;
  return reverseSale(sale.id, reason, now);
}

// ═══════════════════════════ ACREDITACIÓN ═══════════════════════════

export interface AccrualDeps {
  /** Centavos ya reembolsados de un PaymentIntent, según STRIPE (no según nuestra copia). */
  getRefundedCents(paymentIntentId: string): Promise<number>;
}

export interface AccrualSummary {
  examined: number;
  accrued: number;
  reversed: number;
  /** Retenidas: código suspendido. Las de marca blanda ni entran a la consulta. */
  held: number;
  /** No se pudo verificar: no se acreditó, se reintenta mañana. */
  failed: number;
}

const ACCRUAL_BATCH = 200;

/**
 * Acredita las ventas cuyo periodo antifraude ya terminó (spec §3.2, punto 4).
 *
 * Solo acredita lo que pudo COMPROBAR: sin reembolso local (`payment_refunds`),
 * sin reembolso en Stripe y con la suscripción no cancelada. Ante cualquier duda
 * —Stripe inalcanzable, un error de base— NO acredita y lo reporta: un crédito
 * de más es un descuento regalado; uno que llega un día tarde no cuesta nada.
 */
export async function accrueDueSales(now: Date, deps: AccrualDeps): Promise<AccrualSummary> {
  const summary: AccrualSummary = { examined: 0, accrued: 0, reversed: 0, held: 0, failed: 0 };

  const due = await prisma.referralSale.findMany({
    where: {
      status: 'PENDING',
      commissionType: 'CREDIT',
      accrueAfter: { lte: now },
      // Una marca blanda RETIENE hasta que un admin la resuelve.
      OR: [{ fraudFlag: null }, { fraudClearedAt: { not: null } }],
    },
    orderBy: { accrueAfter: 'asc' },
    take: ACCRUAL_BATCH,
    select: { id: true, referralCodeId: true, purchaseId: true, commissionAmount: true },
  });
  summary.examined = due.length;
  if (due.length === 0) return summary;

  const codes = await prisma.referralCode.findMany({
    where: { id: { in: [...new Set(due.map((s) => s.referralCodeId))] } },
    select: { id: true, active: true, userProfileId: true },
  });
  const codeById = new Map(codes.map((c) => [c.id, c]));

  for (const sale of due) {
    const code = codeById.get(sale.referralCodeId);
    if (!code || !code.active || !code.userProfileId) {
      summary.held++;
      continue;
    }

    try {
      const sub = await prisma.subscription.findUnique({
        where: { id: sale.purchaseId },
        select: { status: true, payments: { where: { status: 'SUCCEEDED' }, select: { id: true, stripePaymentIntentId: true } } },
      });

      if (!sub || sub.status === 'CANCELED' || sub.status === 'FAILED') {
        const r = await reverseSale(sale.id, 'subscription_canceled', now);
        if (r.reversed) summary.reversed++;
        continue;
      }

      const localRefunds = await prisma.paymentRefund.count({
        where: { paymentId: { in: sub.payments.map((p) => p.id) } },
      });
      let refunded = localRefunds > 0;

      if (!refunded) {
        for (const payment of sub.payments) {
          if (!payment.stripePaymentIntentId) continue;
          if ((await deps.getRefundedCents(payment.stripePaymentIntentId)) > 0) {
            refunded = true;
            break;
          }
        }
      }

      if (refunded) {
        const r = await reverseSale(sale.id, 'refund', now);
        if (r.reversed) summary.reversed++;
        continue;
      }

      const accrued = await prisma.$transaction(async (tx) => {
        const claimed = await tx.referralSale.updateMany({
          where: { id: sale.id, status: 'PENDING' },
          data: { status: 'ACCRUED', accruedAt: now },
        });
        if (claimed.count === 0) return false;
        await tx.referralCreditLot.create({
          data: {
            userProfileId: code.userProfileId!,
            saleId: sale.id,
            amountCents: sale.commissionAmount,
            remainingCents: sale.commissionAmount,
            accruedAt: now,
            expiresAt: creditExpiry(now),
          },
        });
        return true;
      });
      if (accrued) summary.accrued++;
    } catch (err) {
      summary.failed++;
      reportControlFailure('referral_accrual', 'fail-closed', err, { saleId: sale.id });
    }
  }

  return summary;
}

// ═══════════════════════════ CRÉDITO: APARTAR, CONSUMIR, LIBERAR ═══════════════════════════

const LOT_FIELDS = { id: true, remainingCents: true, expiresAt: true, revokedAt: true } as const;

/** Crédito vigente y aplicable de una persona. */
export async function getAvailableCreditCents(userProfileId: string, now: Date = new Date()): Promise<number> {
  const lots = await prisma.referralCreditLot.findMany({
    where: { userProfileId, revokedAt: null, remainingCents: { gt: 0 }, expiresAt: { gt: now } },
    select: LOT_FIELDS,
  });
  return availableCreditCents(lots, now);
}

class ReserveRetry extends Error {}

/**
 * Aparta hasta `amountCents` de crédito para UN checkout. Devuelve lo que
 * realmente quedó apartado (puede ser menos si otro checkout se llevó saldo
 * entre la consulta y aquí) o `null` si no quedó nada.
 *
 * El saldo baja con `updateMany … WHERE remainingCents >= x`: es atómico por lote.
 * Si otro checkout se adelanta a media asignación, se deshace TODA la transacción
 * y se recalcula (hasta 3 veces), nunca se deja un apartado parcial inconsistente.
 */
export async function reserveCredit(
  userProfileId: string,
  amountCents: number,
  now: Date = new Date()
): Promise<{ redemptionId: string; reservedCents: number } | null> {
  if (!Number.isInteger(amountCents) || amountCents <= 0) return null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const lots = await tx.referralCreditLot.findMany({
          where: { userProfileId, revokedAt: null, remainingCents: { gt: 0 }, expiresAt: { gt: now } },
          select: LOT_FIELDS,
        });
        const plan = planAllocation(lots, now, amountCents);
        if (plan.allocatedCents === 0) return null;

        for (const a of plan.allocations) {
          const taken = await tx.referralCreditLot.updateMany({
            where: { id: a.lotId, revokedAt: null, expiresAt: { gt: now }, remainingCents: { gte: a.cents } },
            data: { remainingCents: { decrement: a.cents } },
          });
          if (taken.count === 0) throw new ReserveRetry();
        }

        const redemption = await tx.referralCreditRedemption.create({
          data: {
            userProfileId,
            amountCents: plan.allocatedCents,
            allocations: plan.allocations as unknown as Prisma.InputJsonValue,
            status: 'RESERVED',
          },
          select: { id: true },
        });
        return { redemptionId: redemption.id, reservedCents: plan.allocatedCents };
      });
    } catch (err) {
      if (err instanceof ReserveRetry) continue;
      throw err;
    }
  }
  return null;
}

/** Devuelve a sus lotes lo que un apartado tomó. Solo actúa sobre RESERVED: idempotente. */
async function giveBack(tx: Tx, redemption: { id: string; allocations: unknown }, reason: string, now: Date): Promise<boolean> {
  const changed = await tx.referralCreditRedemption.updateMany({
    where: { id: redemption.id, status: 'RESERVED' },
    data: { status: 'RELEASED', releasedAt: now, releaseReason: reason },
  });
  if (changed.count === 0) return false;

  for (const a of parseAllocations(redemption.allocations)) {
    await tx.referralCreditLot.updateMany({
      where: { id: a.lotId },
      data: { remainingCents: { increment: a.cents } },
    });
  }
  return true;
}

/** Libera el apartado de un checkout que no se pagó, por el id del apartado (dentro de una transacción ajena). */
export async function releaseRedemptionByIdTx(tx: Tx, redemptionId: string, reason: string, now: Date): Promise<boolean> {
  const redemption = await tx.referralCreditRedemption.findUnique({
    where: { id: redemptionId },
    select: { id: true, allocations: true },
  });
  return redemption ? giveBack(tx, redemption, reason, now) : false;
}

/** Libera el apartado ligado a una suscripción (checkout fallido o expirado). */
export async function releaseRedemptionForSubscriptionTx(
  tx: Tx,
  subscriptionId: string,
  reason: string,
  now: Date
): Promise<boolean> {
  const redemption = await tx.referralCreditRedemption.findUnique({
    where: { subscriptionId },
    select: { id: true, allocations: true },
  });
  return redemption ? giveBack(tx, redemption, reason, now) : false;
}

export async function releaseRedemptionById(redemptionId: string, reason: string, now: Date = new Date()): Promise<boolean> {
  return prisma.$transaction((tx) => releaseRedemptionByIdTx(tx, redemptionId, reason, now));
}

export type ConsumeOutcome = 'consumed' | 'none' | 'was_released';

/**
 * El pago se confirmó: el crédito apartado pasa a GASTADO. Va dentro de la MISMA
 * transacción que activa el plan (con el mismo `tx`), así que ambas cosas pasan
 * o ninguna.
 *
 * `was_released`: el apartado ya se había devuelto cuando llegó el pago (un
 * checkout marcado como fallido que después se cobró). Ese crédito pudo volver a
 * gastarse; no se puede reclamar, así que se devuelve el hecho para reportarlo.
 */
export async function consumeRedemptionTx(tx: Tx, subscriptionId: string, now: Date): Promise<ConsumeOutcome> {
  const changed = await tx.referralCreditRedemption.updateMany({
    where: { subscriptionId, status: 'RESERVED' },
    data: { status: 'CONSUMED', consumedAt: now },
  });
  if (changed.count > 0) return 'consumed';

  const existing = await tx.referralCreditRedemption.findUnique({
    where: { subscriptionId },
    select: { status: true },
  });
  return existing?.status === 'RELEASED' ? 'was_released' : 'none';
}

/** Une el apartado con la suscripción PENDING del mismo checkout. */
export async function attachRedemptionToSubscriptionTx(tx: Tx, redemptionId: string, subscriptionId: string): Promise<void> {
  await tx.referralCreditRedemption.update({ where: { id: redemptionId }, data: { subscriptionId } });
}

export interface StaleRedemptionSummary {
  released: number;
  healed: number;
}

const STALE_REDEMPTION_HOURS = 96;

/**
 * Red de seguridad diaria del libro del crédito: apartados que llevan más de 4
 * días sin resolverse.
 *  · sin suscripción (el checkout se cayó entre apartar y crear la fila) → se liberan;
 *  · su suscripción quedó FAILED/CANCELED → se liberan;
 *  · su suscripción está ACTIVE y el apartado sigue RESERVED (se perdió el paso de
 *    consumir) → se marca GASTADO y se reporta: el pago sí ocurrió.
 * Una suscripción todavía PENDING se respeta: OXXO/SPEI pueden tardar días.
 */
export async function releaseStaleRedemptions(now: Date): Promise<StaleRedemptionSummary> {
  const summary: StaleRedemptionSummary = { released: 0, healed: 0 };
  const stale = await prisma.referralCreditRedemption.findMany({
    where: { status: 'RESERVED', createdAt: { lt: new Date(now.getTime() - STALE_REDEMPTION_HOURS * HOUR_MS) } },
    take: 200,
    select: { id: true, subscriptionId: true, allocations: true },
  });

  for (const r of stale) {
    const sub = r.subscriptionId
      ? await prisma.subscription.findUnique({ where: { id: r.subscriptionId }, select: { status: true } })
      : null;

    if (sub?.status === 'PENDING') continue;

    if (sub?.status === 'ACTIVE' || sub?.status === 'EXPIRED') {
      const healed = await prisma.referralCreditRedemption.updateMany({
        where: { id: r.id, status: 'RESERVED' },
        data: { status: 'CONSUMED', consumedAt: now },
      });
      if (healed.count > 0) {
        summary.healed++;
        reportControlFailure('referral_credit', 'degraded', new Error('Apartado de crédito sin consumir con la compra ya activa'), {
          redemptionId: r.id,
        });
      }
      continue;
    }

    const released = await prisma.$transaction((tx) =>
      giveBack(tx, { id: r.id, allocations: r.allocations }, sub ? 'checkout_failed' : 'orphan', now)
    );
    if (released) summary.released++;
  }
  return summary;
}

// ═══════════════════════════ RESPALDO DE VENTAS ═══════════════════════════

/**
 * Compras atribuidas de los últimos 14 días que NO tienen fila de venta (el
 * registro post-pago falló o el proceso murió). Idempotente.
 */
export async function backfillMissingSales(
  now: Date
): Promise<{ examined: number; recorded: number; failed: number }> {
  const out = { examined: 0, recorded: 0, failed: 0 };
  const subs = await prisma.subscription.findMany({
    where: {
      plan: { in: [...REFERRAL_ELIGIBLE_PLANS] },
      isComp: false,
      status: { in: ['ACTIVE', 'EXPIRED'] },
      startedAt: { gte: new Date(now.getTime() - 14 * DAY_MS) },
      userProfile: { referredByCodeId: { not: null } },
    },
    take: 200,
    select: { id: true },
  });
  if (subs.length === 0) return out;

  const existing = await prisma.referralSale.findMany({
    where: { purchaseId: { in: subs.map((s) => s.id) } },
    select: { purchaseId: true },
  });
  const have = new Set(existing.map((e) => e.purchaseId));
  const missing = subs.filter((s) => !have.has(s.id));
  out.examined = missing.length;

  for (const sub of missing) {
    try {
      const r = await recordReferralSale(sub.id, now);
      if (r.status === 'recorded') out.recorded++;
    } catch (err) {
      out.failed++;
      reportControlFailure('referral_sale', 'degraded', err, { subscriptionId: sub.id, stage: 'backfill' });
    }
  }
  return out;
}

// ═══════════════════════════ LECTURA PARA EL TABLERO ═══════════════════════════

export interface ReferralOverview {
  code: OwnCode | null;
  /** Crédito vigente y aplicable ahora. */
  balanceCents: number;
  /** El vencimiento más próximo entre los lotes con saldo. */
  nextExpiryAt: Date | null;
  /** Comisión en verificación (PENDING): todavía no es saldo. */
  pendingCents: number;
  /** Referidos exitosos = ventas ACREDITADAS. */
  successfulCount: number;
  pendingCount: number;
}

export async function getReferralOverview(userProfileId: string, now: Date = new Date()): Promise<ReferralOverview> {
  const code = await getOwnReferralCode(userProfileId);

  const [lots, pending, successfulCount] = await Promise.all([
    prisma.referralCreditLot.findMany({
      where: { userProfileId, revokedAt: null, remainingCents: { gt: 0 } },
      select: LOT_FIELDS,
    }),
    code
      ? prisma.referralSale.aggregate({
          where: { referralCodeId: code.id, status: 'PENDING', commissionType: 'CREDIT' },
          _sum: { commissionAmount: true },
          _count: true,
        })
      : Promise.resolve({ _sum: { commissionAmount: 0 }, _count: 0 }),
    code ? prisma.referralSale.count({ where: { referralCodeId: code.id, status: 'ACCRUED' } }) : Promise.resolve(0),
  ]);

  return {
    code,
    balanceCents: availableCreditCents(lots, now),
    nextExpiryAt: nextExpiry(lots, now),
    pendingCents: pending._sum.commissionAmount ?? 0,
    pendingCount: pending._count,
    successfulCount,
  };
}

export interface ReferralHistoryItem {
  id: string;
  createdAt: Date;
  commissionCents: number;
  status: 'PENDING' | 'ACCRUED' | 'PAID' | 'REVERSED';
  accrueAfter: Date;
  /** Retenida por una revisión: la interfaz dice «en verificación», nunca la marca. */
  underReview: boolean;
  reversedForRefund: boolean;
}

/**
 * Historial de ventas del código propio. NO incluye ningún dato del comprador
 * (ni nombre, ni correo, ni id): quien invita no tiene por qué saber quién
 * compró, y buena parte de los compradores son menores (minimización, LFPDPPP).
 * La spec §4 dibuja «María G.»; aquí se muestra solo la fecha.
 */
export async function getReferralHistory(userProfileId: string, limit = 50): Promise<ReferralHistoryItem[]> {
  const code = await getOwnReferralCode(userProfileId);
  if (!code) return [];
  const rows = await prisma.referralSale.findMany({
    where: { referralCodeId: code.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      commissionAmount: true,
      status: true,
      accrueAfter: true,
      fraudFlag: true,
      fraudClearedAt: true,
      reverseReason: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    commissionCents: r.commissionAmount,
    status: r.status,
    accrueAfter: r.accrueAfter,
    underReview: r.status === 'PENDING' && r.fraudFlag !== null && r.fraudClearedAt === null,
    reversedForRefund: r.status === 'REVERSED' && r.reverseReason === 'refund',
  }));
}

// ═══════════════════════════ ADMINISTRACIÓN ═══════════════════════════

export interface AdminReferrerRow {
  id: string;
  code: string;
  type: string;
  active: boolean;
  createdAt: Date;
  suspendedAt: Date | null;
  suspendedReason: string | null;
  ownerProfileId: string | null;
  ownerEmail: string | null;
  sales: { pending: number; accrued: number; reversed: number };
  accruedCents: number;
  referredCount: number;
}

export async function listReferrers(limit = 100): Promise<AdminReferrerRow[]> {
  const codes = await prisma.referralCode.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      code: true,
      type: true,
      active: true,
      createdAt: true,
      suspendedAt: true,
      suspendedReason: true,
      userProfileId: true,
      _count: { select: { referredUsers: true } },
    },
  });
  if (codes.length === 0) return [];

  const ids = codes.map((c) => c.id);
  const grouped = await prisma.referralSale.groupBy({
    by: ['referralCodeId', 'status'],
    where: { referralCodeId: { in: ids } },
    _count: true,
    _sum: { commissionAmount: true },
  });
  const ownerIds = codes.map((c) => c.userProfileId).filter((v): v is string => v !== null);
  const emails = await getAuthEmails(ownerIds);

  return codes.map((c) => {
    const mine = grouped.filter((g) => g.referralCodeId === c.id);
    const count = (s: string) => mine.find((g) => g.status === s)?._count ?? 0;
    return {
      id: c.id,
      code: c.code,
      type: c.type,
      active: c.active,
      createdAt: c.createdAt,
      suspendedAt: c.suspendedAt,
      suspendedReason: c.suspendedReason,
      ownerProfileId: c.userProfileId,
      ownerEmail: c.userProfileId ? emails.get(c.userProfileId) ?? null : null,
      sales: { pending: count('PENDING'), accrued: count('ACCRUED'), reversed: count('REVERSED') },
      accruedCents: mine.find((g) => g.status === 'ACCRUED')?._sum.commissionAmount ?? 0,
      referredCount: c._count.referredUsers,
    };
  });
}

export interface FraudAlertRow {
  id: string;
  code: string;
  flags: FraudFlag[];
  status: string;
  createdAt: Date;
  saleAmountCents: number;
  commissionCents: number;
  reverseReason: string | null;
  resolved: boolean;
  blocked: boolean;
}

export async function listFraudAlerts(limit = 100): Promise<FraudAlertRow[]> {
  const rows = await prisma.referralSale.findMany({
    where: { fraudFlag: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      status: true,
      createdAt: true,
      saleAmount: true,
      commissionAmount: true,
      fraudFlag: true,
      fraudClearedAt: true,
      reverseReason: true,
      referralCode: { select: { code: true } },
    },
  });
  return rows.map((r) => {
    const flags = parseFlags(r.fraudFlag);
    return {
      id: r.id,
      code: r.referralCode.code,
      flags,
      status: r.status,
      createdAt: r.createdAt,
      saleAmountCents: r.saleAmount,
      commissionCents: r.commissionAmount,
      reverseReason: r.reverseReason,
      resolved: r.fraudClearedAt !== null,
      blocked: flags.some(isHardFlag),
    };
  });
}

export type AdminReferralResult =
  | { ok: true }
  | { ok: false; code: 'NOT_FOUND' | 'INVALID_STATE'; message: string };

export async function suspendReferralCode(codeId: string, reason: string, now: Date = new Date()): Promise<AdminReferralResult> {
  const changed = await prisma.referralCode.updateMany({
    where: { id: codeId, active: true },
    data: { active: false, suspendedAt: now, suspendedReason: reason },
  });
  if (changed.count > 0) return { ok: true };
  const exists = await prisma.referralCode.findUnique({ where: { id: codeId }, select: { id: true } });
  return exists
    ? { ok: false, code: 'INVALID_STATE', message: 'Ese código ya estaba suspendido.' }
    : { ok: false, code: 'NOT_FOUND', message: 'No encontramos ese código.' };
}

export async function reinstateReferralCode(codeId: string): Promise<AdminReferralResult> {
  const changed = await prisma.referralCode.updateMany({
    where: { id: codeId, active: false },
    data: { active: true, suspendedAt: null, suspendedReason: null },
  });
  if (changed.count > 0) return { ok: true };
  const exists = await prisma.referralCode.findUnique({ where: { id: codeId }, select: { id: true } });
  return exists
    ? { ok: false, code: 'INVALID_STATE', message: 'Ese código ya estaba activo.' }
    : { ok: false, code: 'NOT_FOUND', message: 'No encontramos ese código.' };
}

/**
 * Resuelve una marca BLANDA. CLEAR = falsa alarma: la venta se acredita en la
 * próxima corrida. CONFIRM = fraude: se revierte. Una venta con marca DURA nunca
 * se «libera»: ya nació REVERSED.
 */
export async function resolveFraudFlag(
  saleId: string,
  decision: 'CLEAR' | 'CONFIRM',
  now: Date = new Date()
): Promise<AdminReferralResult> {
  const sale = await prisma.referralSale.findUnique({
    where: { id: saleId },
    select: { id: true, status: true, fraudFlag: true, fraudClearedAt: true },
  });
  if (!sale) return { ok: false, code: 'NOT_FOUND', message: 'No encontramos esa venta.' };
  const flags = parseFlags(sale.fraudFlag);
  if (sale.status !== 'PENDING' || flags.length === 0 || flags.some(isHardFlag)) {
    return { ok: false, code: 'INVALID_STATE', message: 'Esta venta no tiene una marca pendiente de revisión.' };
  }

  if (decision === 'CLEAR') {
    const changed = await prisma.referralSale.updateMany({
      where: { id: saleId, status: 'PENDING', fraudClearedAt: null },
      data: { fraudClearedAt: now },
    });
    return changed.count > 0
      ? { ok: true }
      : { ok: false, code: 'INVALID_STATE', message: 'Esa marca ya se había resuelto.' };
  }

  const r = await reverseSale(saleId, 'fraud', now);
  return r.reversed ? { ok: true } : { ok: false, code: 'INVALID_STATE', message: 'La venta ya no se puede revertir.' };
}
