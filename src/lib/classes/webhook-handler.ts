import type Stripe from 'stripe';
import { reportControlFailure } from '@/lib/observability/report';
import {
  handleClassPaymentEvent,
  type ClassPaymentOutcome,
  type ClassPaymentStore,
} from '@/lib/stripe/class-payments';
import { announceBooked } from './notify';
import { refundClassIfDue, type RefundStripe } from './refunds';

/**
 * Lo que el webhook de Stripe hace con un evento de PAGO DE CLASE, ya desviado
 * antes del camino de suscripciones. Vive aparte de la ruta para poder probarlo
 * sin firmar payloads.
 *
 * El almacén (`store`) es lo único que puede lanzar, y debe: un fallo
 * transitorio de la base tiene que devolver 500 para que Stripe reintente (la
 * idempotencia revierte el marcador). Todo lo que viene DESPUÉS del cobro
 * aplicado —avisos, reembolso— es mejor esfuerzo: nunca convierte un cobro ya
 * registrado en un 500, y ninguno se queda en silencio.
 */

export interface ClassWebhookResult {
  status: 'handled' | 'ignored';
  outcome?: ClassPaymentOutcome['kind'];
}

export async function handleClassWebhook(
  event: Stripe.Event,
  deps: { store: ClassPaymentStore; stripe: RefundStripe; now?: Date }
): Promise<ClassWebhookResult> {
  const result = await handleClassPaymentEvent(event, deps.store, deps.now);

  if (result.status === 'ignored') {
    if (result.reason === 'missing_class_id') {
      // Un evento marcado como de clase pero sin id de clase: un cobro que no
      // se puede atar a nada. Nadie lo verá si no se reporta.
      reportControlFailure(
        'payment_consistency',
        'degraded',
        new Error('Evento de clase sin classSessionId'),
        { eventId: event.id, eventType: event.type }
      );
    }
    return { status: 'ignored' };
  }

  const { outcome } = result;
  switch (outcome.kind) {
    case 'booked': {
      const meta = (event.data.object as { metadata?: Record<string, string> }).metadata;
      await announceBooked(outcome.classId, meta?.method === 'ONE_CLICK' ? 'ONE_CLICK' : 'CHECKOUT');
      break;
    }
    case 'refund_due':
    case 'mismatch':
      // La deuda ya quedó escrita en la fila; esto la salda (y si falla, el job la reintenta).
      await refundClassIfDue(outcome.classId, deps.stripe);
      break;
    case 'not_found':
      reportControlFailure(
        'payment_consistency',
        'degraded',
        new Error('Cobro de clase sin clase asociada'),
        { eventId: event.id, eventType: event.type }
      );
      break;
    default:
      break;
  }
  return { status: 'handled', outcome: outcome.kind };
}
