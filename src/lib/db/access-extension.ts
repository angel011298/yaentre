import type { Prisma, Subscription } from '@prisma/client';
import { prisma } from './prisma';
import { runIdempotent } from './billing';
import { accessibleSubscriptionWhere } from '@/lib/subscriptions/access-check';
import {
  calculateExtensionDate,
  calculateGraceEndsAt,
  isFixedTermPlan,
} from '@/lib/subscriptions/access-duration';
import { reportControlFailure } from '@/lib/observability/report';
import type { PaidCheckout } from '@/lib/stripe/marketplace-webhook';
import type { ApplyResult } from '@/lib/stripe/webhook';

/**
 * G103 — EXTENSIÓN DE VIGENCIA (spec de temporalidad §3.3). Capa de datos.
 *
 * La extensión NUNCA se aplica desde el redirect: solo `applyAccessExtension`,
 * que llama el webhook de Stripe con el evento ya verificado. Dos candados de
 * idempotencia, en la misma transacción:
 *   1. `processed_stripe_events` por `event.id` (`runIdempotent`);
 *   2. el `Payment` por `stripePaymentIntentId` (único): si ese cobro ya quedó
 *      SUCCEEDED, la sesión ya extendió y no se vuelve a sumar — cubre dos
 *      eventos DISTINTOS de la misma sesión (p. ej. `completed` y
 *      `async_payment_succeeded`, si Stripe mandara ambos como pagados).
 */

/** La suscripción que el alumno extendería: la vigente (o en gracia) de pago único. */
export async function findExtendableSubscription(
  userProfileId: string,
  now: Date = new Date()
): Promise<Subscription | null> {
  const rows = await prisma.subscription.findMany({
    where: {
      userProfileId,
      plan: { in: ['SEASON_PASS', 'PREMIUM'] },
      expiresAt: { not: null },
      ...accessibleSubscriptionWhere(now),
    },
    orderBy: { expiresAt: 'desc' },
    take: 1,
  });
  return rows[0] ?? null;
}

/** Un customer de Stripe ya conocido para este alumno (para no duplicarlo). */
export async function findKnownStripeCustomerId(userProfileId: string): Promise<string | null> {
  const sub = await prisma.subscription.findFirst({
    where: { userProfileId, stripeCustomerId: { not: null } },
    orderBy: { updatedAt: 'desc' },
    select: { stripeCustomerId: true },
  });
  return sub?.stripeCustomerId ?? null;
}

class ExtensionConsistencyError extends Error {}

async function applyExtensionTx(
  tx: Prisma.TransactionClient,
  paid: PaidCheckout,
  now: Date
): Promise<void> {
  const md = paid.metadata;
  const ctx = { checkoutSessionId: paid.checkoutSessionId, subscriptionId: md.subscriptionId };

  // El monto y la moneda tienen que ser EXACTAMENTE los que el servidor fijó
  // al crear la sesión. Si no, no se extiende nada: es un pago a revisar a
  // mano (y probablemente a reembolsar), no algo que adivinar.
  const expected = Number(md.expectedAmountCents);
  if (!Number.isInteger(expected) || paid.amountMxn !== expected || paid.currency !== 'mxn') {
    reportControlFailure(
      'payment_consistency',
      'fail-closed',
      new ExtensionConsistencyError('Monto/moneda de la extensión no coincide con lo emitido'),
      { ...ctx, amount: paid.amountMxn, currency: paid.currency, expected }
    );
    return;
  }

  const sub = await tx.subscription.findUnique({ where: { id: md.subscriptionId ?? '' } });
  if (!sub || sub.userProfileId !== md.userProfileId) {
    reportControlFailure(
      'payment_consistency',
      'fail-closed',
      new ExtensionConsistencyError('Extensión pagada sin suscripción del mismo alumno'),
      ctx
    );
    return;
  }
  if (sub.status !== 'ACTIVE' || !sub.expiresAt || !isFixedTermPlan(sub.plan)) {
    // Pagó y ya no hay qué extender (p. ej. el admin la dio de baja entre el
    // checkout y el pago de OXXO). Dinero cobrado sin servicio: alerta.
    reportControlFailure(
      'payment_consistency',
      'fail-closed',
      new ExtensionConsistencyError('Extensión pagada sobre una suscripción no extendible'),
      { ...ctx, status: sub.status, plan: sub.plan }
    );
    return;
  }

  if (paid.paymentIntentId) {
    const prior = await tx.payment.findUnique({
      where: { stripePaymentIntentId: paid.paymentIntentId },
      select: { status: true },
    });
    if (prior?.status === 'SUCCEEDED') return;
  }

  const newExpiresAt = calculateExtensionDate(sub.expiresAt);
  const consentAt = md.consentAt ? new Date(md.consentAt) : null;

  // Concurrencia optimista: solo gana quien vio el `expiresAt` vigente. Si otra
  // transacción ya lo movió, se lanza para que Stripe reintente y el reintento
  // lea el estado nuevo (el candado 2 lo deja en no-op si ya se aplicó).
  const updated = await tx.subscription.updateMany({
    where: { id: sub.id, expiresAt: sub.expiresAt },
    data: {
      expiresAt: newExpiresAt,
      graceEndsAt: calculateGraceEndsAt(newExpiresAt),
      extendedAt: now,
      originalExpiresAt: sub.originalExpiresAt ?? sub.expiresAt,
      extensionConsentAt: consentAt && !Number.isNaN(consentAt.getTime()) ? consentAt : null,
      extensionConsentVersion: md.consentVersion ?? null,
    },
  });
  if (updated.count === 0) throw new Error('La vigencia cambió durante la extensión; reintentar.');

  const paymentData = {
    subscriptionId: sub.id,
    amountMxn: expected,
    method: paid.method,
    status: 'SUCCEEDED' as const,
  };
  if (paid.paymentIntentId) {
    await tx.payment.upsert({
      where: { stripePaymentIntentId: paid.paymentIntentId },
      create: { ...paymentData, stripePaymentIntentId: paid.paymentIntentId },
      update: { status: 'SUCCEEDED', method: paid.method },
    });
  } else {
    await tx.payment.create({ data: paymentData });
  }
}

export function applyAccessExtension(
  eventId: string,
  eventType: string,
  paid: PaidCheckout
): Promise<ApplyResult> {
  return runIdempotent(eventId, eventType, (tx) => applyExtensionTx(tx, paid, new Date()));
}

/** Para la pantalla de resultado: estado ACTUAL de la suscripción del alumno. */
export async function getSubscriptionForExtensionResult(
  subscriptionId: string,
  userProfileId: string
): Promise<Subscription | null> {
  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub || sub.userProfileId !== userProfileId) return null;
  return sub;
}
