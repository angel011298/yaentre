import { Prisma, type PricingSeason, type SubscriptionPlan } from '@prisma/client';
import { prisma } from './prisma';
import { computeExpiresAt } from '@/lib/stripe/expiry';
import {
  currentSeason,
  degradeIfEarlyBirdExhausted,
  EARLY_BIRD_LICENSE_LIMIT,
  getPlanPricing,
} from '@/lib/stripe/pricing';
import type {
  ApplyResult,
  BillingStore,
  CheckoutActivation,
} from '@/lib/stripe/webhook';

/**
 * Capa de datos de facturación (F8): implementación real (prisma-backed) del
 * `BillingStore` que el webhook usa, más los helpers que el checkout y las
 * pantallas de resultado necesitan.
 *
 * Toda mutación disparada por un evento de Stripe pasa por `runIdempotent`, que
 * inserta el `event.id` en `processed_stripe_events` como PRIMERA sentencia de
 * una transacción y aplica el cambio en la MISMA transacción:
 *  - Si el evento ya estaba registrado, el INSERT viola el unique → la
 *    transacción aborta → se detecta como 'duplicate' y no se aplica nada.
 *  - Si la aplicación falla por una razón transitoria, la transacción revierte
 *    TAMBIÉN el marcador del evento, de modo que el reintento de Stripe puede
 *    reprocesarlo con seguridad (no queda «quemado»).
 * Esto satisface el criterio «un evento duplicado nunca se procesa dos veces»
 * sin sacrificar la recuperación ante fallos.
 */

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

/** Se lanza cuando el evento llega antes de que exista la Subscription pendiente
 *  (carrera rara). Provoca rollback → 500 → Stripe reintenta más tarde. */
class SubscriptionNotFoundError extends Error {
  constructor(checkoutSessionId: string) {
    super(`No hay Subscription pendiente para checkout ${checkoutSessionId}.`);
    this.name = 'SubscriptionNotFoundError';
  }
}

async function runIdempotent(
  eventId: string,
  eventType: string,
  work: (tx: Prisma.TransactionClient) => Promise<void>
): Promise<ApplyResult> {
  try {
    await prisma.$transaction(async (tx) => {
      // PRIMERA sentencia: marca el evento. Si ya existía, esto lanza P2002 y
      // aborta toda la transacción antes de tocar el acceso de pago.
      await tx.processedStripeEvent.create({ data: { eventId, eventType } });
      await work(tx);
    });
    return 'applied';
  } catch (err) {
    if (isUniqueViolation(err)) return 'duplicate';
    throw err; // error real → propaga para que el webhook responda 500 y Stripe reintente
  }
}

/** Monto a registrar en el Payment: el de la sesión si vino, si no el de la matriz. */
function resolveAmountMxn(
  activation: CheckoutActivation,
  plan: SubscriptionPlan,
  season: PricingSeason
): number {
  return activation.amountMxn ?? getPlanPricing(plan, season).amountMxn;
}

async function grantEarlyBirdBadge(
  tx: Prisma.TransactionClient,
  userProfileId: string
): Promise<void> {
  const profile = await tx.userProfile.findUnique({
    where: { id: userProfileId },
    select: { badges: true },
  });
  if (profile && !profile.badges.includes('EARLY_BIRD')) {
    await tx.userProfile.update({
      where: { id: userProfileId },
      data: { badges: { push: 'EARLY_BIRD' } },
    });
  }
}

async function upsertPayment(
  tx: Prisma.TransactionClient,
  subscriptionId: string,
  activation: CheckoutActivation,
  amountMxn: number,
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED'
): Promise<void> {
  if (activation.paymentIntentId) {
    await tx.payment.upsert({
      where: { stripePaymentIntentId: activation.paymentIntentId },
      create: {
        subscriptionId,
        amountMxn,
        method: activation.method,
        status,
        stripePaymentIntentId: activation.paymentIntentId,
      },
      update: { status, method: activation.method },
    });
  } else {
    await tx.payment.create({
      data: { subscriptionId, amountMxn, method: activation.method, status },
    });
  }
}

export const billingStore: BillingStore = {
  activateFromCheckout(eventId, eventType, activation) {
    return runIdempotent(eventId, eventType, async (tx) => {
      const sub = await tx.subscription.findUnique({
        where: { stripeCheckoutSessionId: activation.checkoutSessionId },
        include: {
          userProfile: {
            select: { id: true, targetExam: { select: { examDate: true } } },
          },
        },
      });

      if (!sub) throw new SubscriptionNotFoundError(activation.checkoutSessionId);

      // Ya activa: no re-aplicar (defensa extra a la idempotencia por event.id).
      if (sub.status === 'ACTIVE') return;

      const now = new Date();
      const expiresAt = computeExpiresAt(sub.plan, sub.userProfile.targetExam?.examDate ?? null, now);
      const amountMxn = resolveAmountMxn(activation, sub.plan, sub.season);

      await tx.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'ACTIVE',
          startedAt: now,
          expiresAt,
          stripeCustomerId: activation.stripeCustomerId ?? undefined,
          stripeSubscriptionId: activation.stripeSubscriptionId ?? undefined,
        },
      });

      await upsertPayment(tx, sub.id, activation, amountMxn, 'SUCCEEDED');

      if (sub.season === 'EARLY_BIRD') {
        await grantEarlyBirdBadge(tx, sub.userProfileId);
      }
    });
  },

  recordPendingAsyncPayment(eventId, eventType, activation) {
    return runIdempotent(eventId, eventType, async (tx) => {
      const sub = await tx.subscription.findUnique({
        where: { stripeCheckoutSessionId: activation.checkoutSessionId },
        select: { id: true, plan: true, season: true, status: true },
      });

      if (!sub) throw new SubscriptionNotFoundError(activation.checkoutSessionId);

      // La suscripción se queda PENDING (sin acceso) hasta la confirmación real.
      // Solo registramos/refrescamos el Payment en estado PENDING con el método.
      if (sub.status === 'ACTIVE') return;

      const amountMxn = resolveAmountMxn(activation, sub.plan, sub.season);
      await upsertPayment(tx, sub.id, activation, amountMxn, 'PENDING');
    });
  },

  failCheckout(eventId, eventType, checkoutSessionId) {
    return runIdempotent(eventId, eventType, async (tx) => {
      const sub = await tx.subscription.findUnique({
        where: { stripeCheckoutSessionId: checkoutSessionId },
        select: { id: true, status: true },
      });

      // Sin suscripción, o ya activa: no hay nada seguro que degradar.
      if (!sub || sub.status === 'ACTIVE') return;

      await tx.subscription.update({ where: { id: sub.id }, data: { status: 'FAILED' } });
      await tx.payment.updateMany({
        where: { subscriptionId: sub.id, status: 'PENDING' },
        data: { status: 'FAILED' },
      });
    });
  },

  cancelBySubscriptionId(eventId, eventType, stripeSubscriptionId) {
    return runIdempotent(eventId, eventType, async (tx) => {
      const sub = await tx.subscription.findFirst({
        where: { stripeSubscriptionId },
        select: { id: true },
      });
      if (!sub) return;

      await tx.subscription.update({ where: { id: sub.id }, data: { status: 'CANCELED' } });
    });
  },
};

// ─────────────────────── Helpers de checkout / lectura ───────────────────────

/** Crea la Subscription en estado PENDING al iniciar un checkout (F8 Task 4). */
export async function createPendingSubscription(input: {
  userProfileId: string;
  plan: SubscriptionPlan;
  season: PricingSeason;
  checkoutSessionId: string;
  hasGuarantee: boolean;
  stripeCustomerId?: string | null;
}): Promise<void> {
  await prisma.subscription.create({
    data: {
      userProfileId: input.userProfileId,
      plan: input.plan,
      season: input.season,
      status: 'PENDING',
      hasGuarantee: input.hasGuarantee,
      stripeCheckoutSessionId: input.checkoutSessionId,
      stripeCustomerId: input.stripeCustomerId ?? undefined,
    },
  });
}

export type SubscriptionForResult = Prisma.SubscriptionGetPayload<{
  include: { payments: true };
}>;

/** Lee la suscripción por su checkout session id, para las pantallas de resultado.
 *  Se valida además que pertenezca al usuario (defensa: nadie ve el pago de otro). */
export async function getSubscriptionByCheckoutSession(
  checkoutSessionId: string,
  userProfileId: string
): Promise<SubscriptionForResult | null> {
  const sub = await prisma.subscription.findUnique({
    where: { stripeCheckoutSessionId: checkoutSessionId },
    include: { payments: true },
  });
  if (!sub || sub.userProfileId !== userProfileId) return null;
  return sub;
}

// ─────────────────────────── Early Bird (F9 Task 4) ───────────────────────────

/**
 * Licencias Early Bird "vendidas": suscripciones ACTIVAS compradas en esa
 * temporada (no cuenta PENDING — un checkout iniciado y nunca pagado no debe
 * agotar el cupo). Es un conteo best-effort en el momento de la consulta, no
 * una reserva atómica: en una ráfaga de compras simultáneas justo al agotarse
 * el cupo, es posible una sobreventa marginal — aceptable para el mecanismo
 * de negocio (no es una restricción dura de inventario físico).
 */
export async function countActiveEarlyBirdSubscriptions(): Promise<number> {
  return prisma.subscription.count({ where: { season: 'EARLY_BIRD', status: 'ACTIVE' } });
}

export async function earlyBirdLicensesRemaining(): Promise<number> {
  const used = await countActiveEarlyBirdSubscriptions();
  return Math.max(0, EARLY_BIRD_LICENSE_LIMIT - used);
}

/**
 * Temporada de precios REAL a cobrar/mostrar: si la fecha cae en Early Bird
 * pero el cupo de 500 licencias ya se agotó, degrada a Temporada Alta
 * automáticamente. Este es el ÚNICO punto que debe consultar tanto el
 * paywall (qué precio mostrar) como el checkout (qué precio cobrar) — así
 * nunca se muestra un precio distinto al que se cobra.
 */
export async function resolveEffectiveSeason(now: Date): Promise<PricingSeason> {
  const season = currentSeason(now);
  if (season !== 'EARLY_BIRD') return season;

  const remaining = await earlyBirdLicensesRemaining();
  return degradeIfEarlyBirdExhausted(season, remaining);
}
