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

/** Un PaymentIntent (reserva de clase en un clic, sin Checkout). */
export interface PaymentIntentOutcome {
  paymentIntentId: string;
  stripeCustomerId: string | null;
  amountMxn: number;
  currency: string;
  metadata: Record<string, string>;
}

export interface MarketplaceStore {
  /** Extensión de 6 meses pagada → nueva vigencia. Idempotente. */
  applyAccessExtension(eventId: string, eventType: string, paid: PaidCheckout): Promise<ApplyResult>;
}

export type MarketplaceAction = 'extended' | 'pending' | 'failed' | 'ignored';

export type MarketplaceHandleResult =
  | { status: 'duplicate'; type: string; kind: MarketplaceKind }
  | { status: 'handled'; type: string; kind: MarketplaceKind; action: MarketplaceAction };

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
  kind: MarketplaceKind,
  action: MarketplaceAction
): MarketplaceHandleResult {
  return r === 'duplicate'
    ? { status: 'duplicate', type: event.type, kind }
    : { status: 'handled', type: event.type, kind, action };
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

      if (kind === 'access_extension') {
        const paidNow =
          event.type === 'checkout.session.async_payment_succeeded' ||
          (event.type === 'checkout.session.completed' && session.payment_status === 'paid');
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

      // Clases y cursos: se añaden en sus fases. Mientras no exista su manejo,
      // un evento con esa marca se reconoce pero no se aplica.
      return { status: 'handled', type: event.type, kind, action: 'ignored' };
    }

    default:
      return null;
  }
}
