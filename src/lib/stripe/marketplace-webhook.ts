import type Stripe from 'stripe';
import type { PaymentMethod } from '@prisma/client';
import { resolvePaymentMethod, type ApplyResult } from './webhook';

/**
 * G103 — EVENTOS DE STRIPE QUE NO SON DE PLANES.
 *
 * Hasta G102 todo pago era la compra de un plan, y `handleStripeEvent`
 * (webhook.ts) buscaba SIEMPRE una `Subscription` por el id de la sesión de
 * Checkout — si no la encontraba lanzaba `SubscriptionNotFoundError` y el
 * webhook respondía 500 para que Stripe reintentara. Con la extensión de
 * vigencia, las clases y los cursos, llegan sesiones que NUNCA van a tener esa
 * fila: mandárselas a `handleStripeEvent` produciría un 500 eterno.
 *
 * Por eso este módulo va DELANTE y solo reclama lo que trae su marca
 * (`metadata.kind`, que pone el servidor al crear la sesión o el
 * PaymentIntent — el cliente no la puede tocar y la firma del webhook
 * garantiza que viene de Stripe). Todo lo demás devuelve `null` y sigue a
 * `handleStripeEvent` EXACTAMENTE como antes: el camino de los planes no
 * cambia una línea.
 *
 * Igual que webhook.ts: aislado de Prisma, con el store inyectado, y la
 * idempotencia por `event.id` dentro de la transacción de cada mutación.
 * Los metadatos NO se creen a ciegas: el store compara monto, moneda y dueño
 * contra la base antes de aplicar nada.
 */

export const MARKETPLACE_KINDS = ['access_extension', 'class_booking', 'course_purchase'] as const;
export type MarketplaceKind = (typeof MARKETPLACE_KINDS)[number];

export function marketplaceKindOf(metadata: Stripe.Metadata | null | undefined): MarketplaceKind | null {
  const kind = metadata?.kind;
  return (MARKETPLACE_KINDS as readonly string[]).includes(kind ?? '')
    ? (kind as MarketplaceKind)
    : null;
}

/** Lo que el store necesita de una sesión de Checkout PAGADA. */
export interface PaidCheckout {
  eventCreatedAt: Date;
  checkoutSessionId: string;
  paymentIntentId: string | null;
  stripeCustomerId: string | null;
  amountMxn: number | null;
  currency: string | null;
  method: PaymentMethod;
  metadata: Record<string, string>;
}

/** Cobro de una clase (por Checkout o por PaymentIntent en un clic). */
export interface ClassPayment {
  classSessionId: string;
  studentProfileId: string | undefined;
  paymentIntentId: string | null;
  stripeCustomerId: string | null;
  amountMxn: number | null;
  currency: string | null;
}

export type ClassConfirmOutcome = 'booked' | 'already' | 'conflict' | 'mismatch' | 'not_found';
export type CourseEnrollOutcome = 'enrolled' | 'already' | 'mismatch' | 'duplicate_purchase';

export interface MarketplaceStore {
  /** Extensión de 6 meses pagada → nueva vigencia. Idempotente. */
  applyAccessExtension(eventId: string, eventType: string, paid: PaidCheckout): Promise<ApplyResult>;
  /** Cobro de una clase confirmado → BOOKED (o `conflict` si el horario ya no está). */
  confirmClassBooking(
    eventId: string,
    eventType: string,
    payment: ClassPayment
  ): Promise<{ result: ApplyResult; outcome: ClassConfirmOutcome | null }>;
  /** Apartado sin pago (Checkout caducado, tarjeta rechazada) → libera el horario. */
  releaseClassBooking(eventId: string, eventType: string, classSessionId: string, reason: string): Promise<ApplyResult>;
  /** Reembolso visto en Stripe. `unknown` = el cobro no es del marketplace. */
  recordRefund(
    eventId: string,
    eventType: string,
    paymentIntentId: string,
    refundedCents: number
  ): Promise<ApplyResult | 'unknown'>;
  /** Reembolso automático de una clase cobrada sin horario. Nunca lanza. */
  refundClassPayment(classSessionId: string, paymentIntentId: string): Promise<void>;
  /** Compra de curso pagada → inscripción (acceso permanente). Idempotente. */
  enrollCoursePurchase(
    eventId: string,
    eventType: string,
    paid: PaidCheckout
  ): Promise<{ result: ApplyResult; outcome: CourseEnrollOutcome | null }>;
  /** Reembolso automático de una compra duplicada del mismo curso. Nunca lanza. */
  refundCoursePayment(checkoutSessionId: string, paymentIntentId: string): Promise<void>;
}

export type MarketplaceAction =
  | 'extended'
  | 'booked'
  | 'refunded_conflict'
  | 'released'
  | 'refund_recorded'
  | 'enrolled'
  | 'refunded_duplicate'
  | 'pending'
  | 'failed'
  | 'ignored';

export type MarketplaceHandleResult =
  | { status: 'duplicate'; type: string; kind: MarketplaceKind | 'refund' }
  | { status: 'handled'; type: string; kind: MarketplaceKind | 'refund'; action: MarketplaceAction };

function idOf(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === 'string' ? ref : ref.id;
}

function toPaidCheckout(event: Stripe.Event, session: Stripe.Checkout.Session, forceAsync: boolean): PaidCheckout {
  return {
    eventCreatedAt: new Date(event.created * 1000),
    checkoutSessionId: session.id,
    paymentIntentId: idOf(session.payment_intent),
    stripeCustomerId: idOf(session.customer),
    amountMxn: session.amount_total ?? null,
    currency: session.currency ?? null,
    method: resolvePaymentMethod(session, forceAsync),
    metadata: { ...(session.metadata ?? {}) },
  };
}

function wrap(
  r: ApplyResult,
  event: Stripe.Event,
  kind: MarketplaceKind | 'refund',
  action: MarketplaceAction
): MarketplaceHandleResult {
  return r === 'duplicate'
    ? { status: 'duplicate', type: event.type, kind }
    : { status: 'handled', type: event.type, kind, action };
}

async function confirmClass(
  event: Stripe.Event,
  payment: ClassPayment,
  store: MarketplaceStore
): Promise<MarketplaceHandleResult> {
  const { result, outcome } = await store.confirmClassBooking(event.id, event.type, payment);
  if (result === 'applied' && outcome === 'conflict' && payment.paymentIntentId) {
    await store.refundClassPayment(payment.classSessionId, payment.paymentIntentId);
    return { status: 'handled', type: event.type, kind: 'class_booking', action: 'refunded_conflict' };
  }
  return wrap(result, event, 'class_booking', outcome === 'booked' ? 'booked' : 'ignored');
}

/**
 * Devuelve `null` si el evento NO es del marketplace (sigue a los planes).
 */
export async function handleMarketplaceEvent(
  event: Stripe.Event,
  store: MarketplaceStore
): Promise<MarketplaceHandleResult | null> {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
    case 'checkout.session.async_payment_failed':
    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      const kind = marketplaceKindOf(session.metadata);
      if (!kind) return null;

      const paidNow =
        event.type === 'checkout.session.async_payment_succeeded' ||
        (event.type === 'checkout.session.completed' && session.payment_status === 'paid');

      if (kind === 'access_extension') {
        if (paidNow) {
          const forceAsync = event.type === 'checkout.session.async_payment_succeeded';
          const r = await store.applyAccessExtension(event.id, event.type, toPaidCheckout(event, session, forceAsync));
          return wrap(r, event, kind, 'extended');
        }
        // OXXO/SPEI generado (aún sin pagar), fallido o caducado: la vigencia
        // no se toca. No hay fila local que actualizar — la extensión solo
        // existe cuando se paga.
        const action: MarketplaceAction =
          event.type === 'checkout.session.completed'
            ? 'pending'
            : event.type === 'checkout.session.async_payment_failed'
              ? 'failed'
              : 'ignored';
        return { status: 'handled', type: event.type, kind, action };
      }

      if (kind === 'class_booking') {
        const md = session.metadata ?? {};
        if (paidNow) {
          return confirmClass(
            event,
            {
              classSessionId: md.classSessionId ?? '',
              studentProfileId: md.studentProfileId,
              paymentIntentId: idOf(session.payment_intent),
              stripeCustomerId: idOf(session.customer),
              amountMxn: session.amount_total ?? null,
              currency: session.currency ?? null,
            },
            store
          );
        }
        if (event.type === 'checkout.session.expired') {
          const r = await store.releaseClassBooking(event.id, event.type, md.classSessionId ?? '', 'checkout_expired');
          return wrap(r, event, kind, 'released');
        }
        // Las clases solo se cobran con tarjeta: no hay pago asíncrono que esperar.
        return { status: 'handled', type: event.type, kind, action: 'ignored' };
      }

      // course_purchase — la inscripción existe SOLO cuando se paga.
      if (paidNow) {
        const forceAsync = event.type === 'checkout.session.async_payment_succeeded';
        const paid = toPaidCheckout(event, session, forceAsync);
        const { result, outcome } = await store.enrollCoursePurchase(event.id, event.type, paid);
        if (result === 'applied' && outcome === 'duplicate_purchase' && paid.paymentIntentId) {
          // Ya tenía el curso (otra pestaña, otro dispositivo): no se cobra dos veces.
          await store.refundCoursePayment(paid.checkoutSessionId, paid.paymentIntentId);
          return { status: 'handled', type: event.type, kind, action: 'refunded_duplicate' };
        }
        return wrap(result, event, kind, outcome === 'enrolled' ? 'enrolled' : 'ignored');
      }
      const action: MarketplaceAction =
        event.type === 'checkout.session.completed'
          ? 'pending'
          : event.type === 'checkout.session.async_payment_failed'
            ? 'failed'
            : 'ignored';
      return { status: 'handled', type: event.type, kind, action };
    }

    case 'payment_intent.succeeded':
    case 'payment_intent.payment_failed':
    case 'payment_intent.canceled': {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (marketplaceKindOf(pi.metadata) !== 'class_booking') return null;
      const md = pi.metadata ?? {};
      if (event.type === 'payment_intent.succeeded') {
        return confirmClass(
          event,
          {
            classSessionId: md.classSessionId ?? '',
            studentProfileId: md.studentProfileId,
            paymentIntentId: pi.id,
            stripeCustomerId: idOf(pi.customer),
            amountMxn: pi.amount_received ?? pi.amount,
            currency: pi.currency,
          },
          store
        );
      }
      // Un intento fallido DENTRO de Checkout no es definitivo (el alumno puede
      // reintentar con otra tarjeta): solo se libera el horario en el flujo de
      // un clic, donde no hay un segundo intento.
      if (md.flow !== 'one_click') {
        return { status: 'handled', type: event.type, kind: 'class_booking', action: 'ignored' };
      }
      const r = await store.releaseClassBooking(event.id, event.type, md.classSessionId ?? '', 'payment_failed');
      return wrap(r, event, 'class_booking', 'released');
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      const pi = idOf(charge.payment_intent);
      if (!pi) return null;
      const r = await store.recordRefund(event.id, event.type, pi, charge.amount_refunded ?? 0);
      if (r === 'unknown') return null;
      return wrap(r, event, 'refund', 'refund_recorded');
    }

    default:
      return null;
  }
}
