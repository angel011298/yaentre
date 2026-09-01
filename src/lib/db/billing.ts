import Stripe from 'stripe';
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
import { reconcileCheckoutSession, type ReconcileOutcome } from '@/lib/stripe/reconciliation';
import { trackServerEvent } from '@/lib/analytics/server';

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

/** Devuelve `true` solo si la insignia se otorgó recién en esta llamada (idempotente). */
async function grantEarlyBirdBadge(
  tx: Prisma.TransactionClient,
  userProfileId: string
): Promise<boolean> {
  const profile = await tx.userProfile.findUnique({
    where: { id: userProfileId },
    select: { badges: true },
  });
  if (profile && !profile.badges.includes('EARLY_BIRD')) {
    await tx.userProfile.update({
      where: { id: userProfileId },
      data: { badges: { push: 'EARLY_BIRD' } },
    });
    return true;
  }
  return false;
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
  async activateFromCheckout(eventId, eventType, activation) {
    // F20 tarea 2: `purchase_completed`/`badge_earned` deben mandarse SOLO si
    // la transacción de verdad aplicó (no en duplicados) — se capturan datos
    // dentro del `work` y se despachan después de que `runIdempotent` confirma
    // 'applied', nunca dentro de la transacción misma (evita mandar el evento
    // si un rollback revierte el cambio).
    // Envuelto en un objeto (en vez de un `let` reasignado dentro del closure):
    // TypeScript no rastrea correctamente el narrowing de una variable local
    // reasignada dentro de una función anidada — el acceso a una propiedad sí
    // se lee fresco en cada punto.
    const tracked: {
      value: {
        userProfileId: string;
        plan: SubscriptionPlan;
        season: PricingSeason;
        amountMxn: number;
        method: string;
        isEarlyBird: boolean;
        earlyBirdBadgeGranted: boolean;
      } | null;
    } = { value: null };

    const result = await runIdempotent(eventId, eventType, async (tx) => {
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

      // G60 — activación atómica. El webhook real y el job de reconciliación
      // (F22) pueden intentar activar la MISMA suscripción casi a la vez, cada
      // uno con su propio `eventId` (el de reconciliación es sintético), así
      // que la guarda `sub.status === 'ACTIVE'` de arriba —una lectura— no los
      // detiene si corren en paralelo: ambos leerían PENDING. El `updateMany`
      // condicionado a `status: { not: 'ACTIVE' }` hace que solo UNO gane la
      // transición; el otro ve `count === 0` y sale sin duplicar el `Payment`,
      // la insignia Early Bird ni el evento `purchase_completed`.
      const activated = await tx.subscription.updateMany({
        where: { id: sub.id, status: { not: 'ACTIVE' } },
        data: {
          status: 'ACTIVE',
          startedAt: now,
          expiresAt,
          stripeCustomerId: activation.stripeCustomerId ?? undefined,
          stripeSubscriptionId: activation.stripeSubscriptionId ?? undefined,
        },
      });
      if (activated.count === 0) return;

      await upsertPayment(tx, sub.id, activation, amountMxn, 'SUCCEEDED');

      let earlyBirdBadgeGranted = false;
      if (sub.season === 'EARLY_BIRD') {
        earlyBirdBadgeGranted = await grantEarlyBirdBadge(tx, sub.userProfileId);
      }

      tracked.value = {
        userProfileId: sub.userProfileId,
        plan: sub.plan,
        season: sub.season,
        amountMxn,
        method: activation.method,
        isEarlyBird: sub.season === 'EARLY_BIRD',
        earlyBirdBadgeGranted,
      };
    });

    const t = tracked.value;
    if (result === 'applied' && t) {
      await trackServerEvent(t.userProfileId, 'purchase_completed', {
        plan: t.plan,
        season: t.season,
        amountMxn: t.amountMxn,
        method: t.method,
        isEarlyBird: t.isEarlyBird,
      });
      if (t.earlyBirdBadgeGranted) {
        await trackServerEvent(t.userProfileId, 'badge_earned', { badgeType: 'EARLY_BIRD' });
      }
    }

    return result;
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

      // G60 — condicionado a `status: { not: 'ACTIVE' }`: si `async_payment_
      // succeeded` y `async_payment_failed` llegaran cruzados, jamás se marca
      // FAILED una suscripción que otra transacción acaba de activar.
      const failed = await tx.subscription.updateMany({
        where: { id: sub.id, status: { not: 'ACTIVE' } },
        data: { status: 'FAILED' },
      });
      if (failed.count === 0) return;

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

/**
 * Suscripciones PENDING más viejas que el corte (F22, job de reconciliación).
 * Solo las que tienen `stripeCheckoutSessionId` — sin eso no hay nada que
 * consultarle a Stripe. `createdAt < cutoff` en vez de "hace 24h fijas" para
 * que el llamador decida la ventana (útil en tests y para ajustar sin tocar
 * este módulo).
 */
export async function findStalePendingSubscriptions(
  cutoff: Date
): Promise<{ id: string; stripeCheckoutSessionId: string; userProfileId: string; createdAt: Date }[]> {
  const rows = await prisma.subscription.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: cutoff },
      stripeCheckoutSessionId: { not: null },
    },
    select: { id: true, stripeCheckoutSessionId: true, userProfileId: true, createdAt: true },
  });
  return rows.filter(
    (r): r is { id: string; stripeCheckoutSessionId: string; userProfileId: string; createdAt: Date } =>
      r.stripeCheckoutSessionId !== null
  );
}

const STALE_PENDING_AFTER_MS = 24 * 60 * 60 * 1000;

export interface ReconciliationSummary {
  checked: number;
  activated: string[];
  expired: string[];
  stillPending: string[];
  errors: { checkoutSessionId: string; message: string }[];
}

/**
 * Orquestador del job de reconciliación (F22). Usado tanto por
 * `scripts/reconcile-pending-payments.ts` (corrida manual) como por
 * `app/api/cron/reconcile-payments/route.ts` (Vercel Cron, 1x/día) — un
 * único punto de verdad, sin duplicar la consulta a Stripe ni el criterio
 * de "estancado" en dos lugares.
 */
export async function runPaymentReconciliation(now: Date = new Date()): Promise<ReconciliationSummary> {
  const summary: ReconciliationSummary = {
    checked: 0,
    activated: [],
    expired: [],
    stillPending: [],
    errors: [],
  };

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.warn('[reconcile] Falta STRIPE_SECRET_KEY — nada que reconciliar en este entorno.');
    return summary;
  }

  const stripe = new Stripe(secretKey, { telemetry: false });
  const cutoff = new Date(now.getTime() - STALE_PENDING_AFTER_MS);
  const stale = await findStalePendingSubscriptions(cutoff);
  summary.checked = stale.length;

  for (const sub of stale) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sub.stripeCheckoutSessionId);
      const outcome: ReconcileOutcome = await reconcileCheckoutSession(session, billingStore);

      if (outcome.action === 'activated') summary.activated.push(sub.stripeCheckoutSessionId);
      else if (outcome.action === 'expired') summary.expired.push(sub.stripeCheckoutSessionId);
      else summary.stillPending.push(sub.stripeCheckoutSessionId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'error desconocido';
      summary.errors.push({ checkoutSessionId: sub.stripeCheckoutSessionId, message });
    }
  }

  // "Alerta a soporte" (Flujo_App §15.1): sin infraestructura de alertas
  // dedicada en este entorno, un log claro en stderr es lo que Sentry/Vercel
  // captura — mismo criterio de degradación que el resto del proyecto
  // (RESEND_API_KEY/SENTRY_DSN ausentes → log, nunca crash).
  if (summary.expired.length > 0 || summary.errors.length > 0) {
    console.error(
      '[reconcile] Pagos que requieren atención manual:',
      JSON.stringify({ expired: summary.expired, errors: summary.errors })
    );
  }

  return summary;
}

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

/**
 * Variante resiliente de `resolveEffectiveSeason`, solo para renderizado
 * público de solo-lectura (landing/precios): si la DB no responde —p. ej.
 * durante `next build`, que ejecuta estas páginas ISR una vez para generar
 * el shell estático, o una caída transitoria— degrada a `HIGH_SEASON` (el
 * precio SIN descuento, nunca promete uno que no se pueda honrar) en vez de
 * tirar toda la página/build. El checkout real (`startCheckoutAction`) sigue
 * llamando a `resolveEffectiveSeason` directamente, sin este wrapper, así
 * que lo que de verdad se COBRA nunca se ve afectado por esta degradación.
 */
export async function resolveEffectiveSeasonSafe(now: Date): Promise<PricingSeason> {
  try {
    return await resolveEffectiveSeason(now);
  } catch (err) {
    console.error('[billing] resolveEffectiveSeason falló, degradando a HIGH_SEASON:', err);
    return 'HIGH_SEASON';
  }
}

/**
 * Variante resiliente de `earlyBirdLicensesRemaining` para el banner
 * público: sin DB no hay forma honesta de saber cuántas licencias quedan, así
 * que devuelve `null` (el llamador debe ocultar el banner) en vez de
 * arriesgar un número inventado o desactualizado.
 */
export async function earlyBirdLicensesRemainingSafe(): Promise<number | null> {
  try {
    return await earlyBirdLicensesRemaining();
  } catch (err) {
    console.error('[billing] earlyBirdLicensesRemaining falló:', err);
    return null;
  }
}
