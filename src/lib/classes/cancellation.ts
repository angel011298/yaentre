import type Stripe from 'stripe';
import { trackServerEvent } from '@/lib/analytics/server';
import { cancelClass, type CancelActor, type CancelResult } from '@/lib/db/classes';
import type { ClassroomProvider } from '@/lib/classroom/provider';
import { reportSilentDegradation } from '@/lib/observability/report';
import { notifyCancellation } from './notify';
import type { CancellationCause } from './policy';
import { refundClassIfDue, type RefundStripe } from './refunds';

/**
 * CANCELAR UNA CLASE Y DEVOLVER EL DINERO — Bloque 2 (spec §6.7).
 *
 * El orden importa y cada paso posterior al primero es «mejor esfuerzo»:
 *
 *  1. `cancelClass` (transacción): decide el reembolso y ESCRIBE la deuda en la
 *     fila. Es lo único que puede rechazar la cancelación.
 *  2. Limpieza: expira la sesión de Checkout abierta y borra el evento del aula.
 *  3. `refundClassIfDue`: salda la deuda con Stripe. Si falla, la deuda queda en
 *     la fila y el job del ciclo de vida reintenta: el alumno no la pierde.
 *  4. Avisos y analítica.
 *
 * Un fallo en 2-4 NUNCA revierte la cancelación (ya es un hecho para las dos
 * partes) y NUNCA queda en silencio: se reporta.
 */

export type CancellationStripe = RefundStripe & {
  checkout: { sessions: Pick<Stripe['checkout']['sessions'], 'expire'> };
};

export interface CancellationDeps {
  stripe: CancellationStripe;
  classroom: ClassroomProvider | null;
  now: Date;
}

export interface CancelAndRefundResult {
  result: CancelResult;
  refundCents: number;
}

export async function cancelClassAndRefund(
  input: { classId: string; actor: CancelActor; cause: CancellationCause; reasonText?: string | null },
  deps: CancellationDeps
): Promise<CancelAndRefundResult> {
  const result = await cancelClass({ ...input, now: deps.now });
  await settleCancellation(result, deps);
  return { result, refundCents: result.outcome.refundCents };
}

/**
 * Todo lo posterior a la transacción de cancelación. Se exporta porque el
 * ciclo de vida y los no-show (que cancelan por otra ruta de la capa de datos)
 * necesitan exactamente los mismos pasos.
 */
export async function settleCancellation(result: CancelResult, deps: CancellationDeps): Promise<void> {
  const { stripe, classroom } = deps;

  // Una reserva sin cobrar: cerrar la sesión de Checkout evita que la persona la
  // pague después (y obligue a un reembolso).
  if (!result.paid && result.stripeCheckoutSessionId) {
    try {
      await stripe.checkout.sessions.expire(result.stripeCheckoutSessionId);
    } catch (err) {
      // Si ya expiró o se completó, Stripe responde error: no es un problema. Un
      // pago que aun así llegue se reembolsa solo (ruta de «pago tardío»).
      reportSilentDegradation('class_lifecycle', err, { stage: 'expire_checkout', classId: result.classId });
    }
  }

  if (result.meetingEventId && classroom) {
    try {
      await classroom.deleteMeeting(result.meetingEventId);
    } catch (err) {
      reportSilentDegradation('classroom_provider', err, { stage: 'delete_meeting', classId: result.classId });
    }
  }

  if (result.outcome.refundCents > 0) {
    await refundClassIfDue(result.classId, stripe);
  }

  try {
    await notifyCancellation(result);
  } catch (err) {
    reportSilentDegradation('class_lifecycle', err, { stage: 'notify_cancellation', classId: result.classId });
  }

  await trackServerEvent(result.studentProfileId, 'class_cancelled', {
    by: result.cancelledBy,
    refundCents: result.outcome.refundCents,
  });
}
