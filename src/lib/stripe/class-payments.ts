import type Stripe from 'stripe';

/**
 * Manejo de los eventos de Stripe que corresponden al pago de una CLASE —
 * Bloque 2 (spec §6.3). Módulo aislado de Stripe-el-SDK y de Prisma, igual que
 * `webhook.ts`: recibe un `Stripe.Event` ya verificado y un `ClassPaymentStore`
 * inyectado, así se prueba con un store en memoria.
 *
 * ── Por qué es un camino APARTE del de las suscripciones ────────────────────
 *
 * `handleStripeEvent` trata todo `checkout.session.completed` como la compra de
 * un plan: busca una `Subscription` PENDING por el id de la sesión y, si no la
 * encuentra, lanza `SubscriptionNotFoundError` → 500 → Stripe reintenta durante
 * días. El pago de una clase también dispara eventos de Checkout y de
 * PaymentIntent; sin desviarlos ANTES, cada clase pagada envenenaría el webhook
 * con reintentos. Lo que las distingue es `metadata.type === 'class_booking'`,
 * que ponemos nosotros en la sesión y en el PaymentIntent al crearlos.
 *
 * ── Garantías (las mismas que F8) ────────────────────────────────────────────
 *
 *  · La clase pasa a BOOKED SOLO desde aquí (webhook verificado), nunca desde la
 *    respuesta de la API ni desde el redirect del cliente.
 *  · Idempotencia por `event.id` (el store la aplica en la misma transacción).
 *  · Un pago que llega a una clase que ya se soltó, o con un monto distinto al
 *    de la clase, NO reserva nada: queda como reembolso pendiente.
 */

export const CLASS_BOOKING_METADATA_TYPE = 'class_booking';

export type ClassPaymentOutcome =
  | { kind: 'duplicate' }
  | { kind: 'noop' }
  | { kind: 'not_found' }
  | { kind: 'booked'; classId: string }
  /** El pago llegó tarde (la clase ya se soltó): se reembolsa completo. */
  | { kind: 'refund_due'; classId: string }
  /** El monto cobrado no es el de la clase: no se reserva, se reembolsa. */
  | { kind: 'mismatch'; classId: string }
  | { kind: 'cancelled'; classId: string };

export interface ClassPaymentStore {
  confirmPayment(
    eventId: string,
    eventType: string,
    input: {
      classSessionId: string;
      paymentIntentId: string;
      amountReceivedCents: number;
      currency: string;
      now: Date;
    }
  ): Promise<ClassPaymentOutcome>;

  expireCheckout(
    eventId: string,
    eventType: string,
    input: { classSessionId: string; now: Date }
  ): Promise<ClassPaymentOutcome>;
}

/**
 * ¿Este evento es del pago de una clase? Devuelve `null` si NO (sigue al camino
 * de suscripciones). Si lo es pero le falta el id de la clase, `classSessionId`
 * es `null`: sigue siendo un evento de clase y NO debe caer en el camino de
 * suscripciones, que lo reintentaría para siempre.
 */
export function classBookingRef(event: Stripe.Event): { classSessionId: string | null } | null {
  const object = event.data?.object as { metadata?: Record<string, string> | null } | undefined;
  const meta = object?.metadata;
  if (!meta || meta.type !== CLASS_BOOKING_METADATA_TYPE) return null;
  return { classSessionId: meta.classSessionId ? meta.classSessionId : null };
}

export type ClassPaymentHandleResult =
  | { status: 'handled'; type: string; outcome: ClassPaymentOutcome }
  | { status: 'ignored'; type: string; reason: 'missing_class_id' | 'not_a_payment_event' };

export async function handleClassPaymentEvent(
  event: Stripe.Event,
  store: ClassPaymentStore,
  now: Date = new Date()
): Promise<ClassPaymentHandleResult> {
  const ref = classBookingRef(event);
  if (!ref?.classSessionId) return { status: 'ignored', type: event.type, reason: 'missing_class_id' };

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const outcome = await store.confirmPayment(event.id, event.type, {
        classSessionId: ref.classSessionId,
        paymentIntentId: pi.id,
        amountReceivedCents: pi.amount_received,
        currency: pi.currency,
        now,
      });
      return { status: 'handled', type: event.type, outcome };
    }

    // La sesión de Checkout expiró sin pagarse: se suelta el horario. (No se
    // reacciona a `payment_intent.payment_failed`: en Checkout un intento
    // fallido no termina la sesión — la persona puede reintentar con otra
    // tarjeta — y cancelar al primer rechazo mataría un pago que aún puede
    // completarse.)
    case 'checkout.session.expired': {
      const outcome = await store.expireCheckout(event.id, event.type, {
        classSessionId: ref.classSessionId,
        now,
      });
      return { status: 'handled', type: event.type, outcome };
    }

    // `checkout.session.completed` de una clase NO activa nada: el cobro se
    // confirma con `payment_intent.succeeded`, que es el que trae el monto
    // realmente recibido.
    default:
      return { status: 'ignored', type: event.type, reason: 'not_a_payment_event' };
  }
}
