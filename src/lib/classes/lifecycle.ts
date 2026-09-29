import type Stripe from 'stripe';
import {
  abandonUnpaidClass,
  classPaymentStore,
  getClassNotifyContext,
  lifecycleQueries,
  markAdminAlerted,
  markConfirmationRequested,
  markMeetingLinkSent,
  saveMeeting,
} from '@/lib/db/classes';
import type { ClassroomProvider } from '@/lib/classroom/provider';
import { reportSilentDegradation } from '@/lib/observability/report';
import { cancelClassAndRefund, type CancellationStripe } from './cancellation';
import { formatClassWhen } from './format';
import {
  alertAdmins,
  announceBooked,
  sendConfirmationRequest,
  sendMeetingLinks,
  sendUnconfirmedNotice,
} from './notify';
import { confirmationSchedule } from './policy';
import { refundClassIfDue } from './refunds';
import { classEndsAt } from '@/lib/teachers/schedule';

/**
 * CICLO DE VIDA DE LAS CLASES — Bloque 2. Un solo job idempotente que corre por
 * cron y hace lo que no lo dispara ninguna acción de una persona:
 *
 *   1. suelta las reservas sin pagar (y reconcilia un cobro cuyo webhook se perdió);
 *   2. pide al profesor confirmar, alerta al admin y, si no confirma, cancela con reembolso;
 *   3. crea y manda el enlace del aula 15 min antes;
 *   4. reintenta los reembolsos que Stripe no aceptó.
 *
 * Reglas del job:
 *  · Cada paso está AISLADO: que uno reviente no impide los demás, y su fallo se
 *    reporta (`class_lifecycle`) y viaja en la respuesta. Devolver `0` cuando un
 *    paso reventó es exactamente el fallo silencioso de G73b.
 *  · «Avisé» solo se sella cuando el correo SALIÓ; si Resend falla, la próxima
 *    corrida reintenta. Prefiere un aviso duplicado a un profesor que nunca supo.
 *  · Es seguro correrlo dos veces seguidas: todo estado se decide contra la fila.
 */

export type LifecycleStripe = CancellationStripe & {
  paymentIntents: Pick<Stripe['paymentIntents'], 'retrieve'>;
  checkout: { sessions: Pick<Stripe['checkout']['sessions'], 'expire' | 'retrieve'> };
};

export interface LifecycleDeps {
  stripe: LifecycleStripe;
  classroom: ClassroomProvider | null;
  now: Date;
}

export interface LifecycleSummary {
  holdsReleased: number;
  paymentsReconciled: number;
  confirmationRequests: number;
  adminAlerts: number;
  autoCancelled: number;
  meetingLinks: number;
  refundsSettled: number;
  /** Pasos que reventaron. Vacío = todo corrió. */
  failedSteps: string[];
}

async function step(summary: LifecycleSummary, name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    summary.failedSteps.push(name);
    reportSilentDegradation('class_lifecycle', err, { step: name });
  }
}

export async function runClassLifecycle(deps: LifecycleDeps): Promise<LifecycleSummary> {
  const summary: LifecycleSummary = {
    holdsReleased: 0,
    paymentsReconciled: 0,
    confirmationRequests: 0,
    adminAlerts: 0,
    autoCancelled: 0,
    meetingLinks: 0,
    refundsSettled: 0,
    failedSteps: [],
  };

  await step(summary, 'holds', () => releaseExpiredHolds(deps, summary));
  await step(summary, 'confirmations', () => driveConfirmations(deps, summary));
  await step(summary, 'meeting-links', () => sendDueMeetingLinks(deps, summary));
  await step(summary, 'refunds', () => retryRefunds(deps, summary));

  return summary;
}

// ─────────────────────────── 1. Reservas sin pagar ───────────────────────────

/**
 * Antes de soltar una reserva vencida se le PREGUNTA a Stripe: si el alumno sí
 * pagó y el webhook nunca llegó, soltarla dejaría un cargo sin clase. Un cobro
 * confirmado se aplica por el mismo almacén que usa el webhook (idempotente),
 * con un id de evento sintético `reconcile:<pi>`; si el webhook real llega
 * después, ya no encuentra la clase pendiente y es un no-op.
 */
async function releaseExpiredHolds(deps: LifecycleDeps, summary: LifecycleSummary): Promise<void> {
  const { stripe, now } = deps;
  const holds = await lifecycleQueries.expiredHolds(now);

  for (const hold of holds) {
    try {
      let paymentIntentId = hold.stripePaymentId;
      if (!paymentIntentId && hold.stripeCheckoutSessionId) {
        const session = await stripe.checkout.sessions.retrieve(hold.stripeCheckoutSessionId);
        paymentIntentId =
          typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null);
      }

      if (paymentIntentId) {
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (intent.status === 'succeeded') {
          const outcome = await classPaymentStore.confirmPayment(`reconcile:${intent.id}`, 'reconcile.class_payment', {
            classSessionId: hold.id,
            paymentIntentId: intent.id,
            amountReceivedCents: intent.amount_received,
            currency: intent.currency,
            now,
          });
          summary.paymentsReconciled += 1;
          if (outcome.kind === 'booked') await announceBooked(hold.id, 'CHECKOUT');
          if (outcome.kind === 'mismatch' || outcome.kind === 'refund_due') {
            await refundClassIfDue(hold.id, stripe);
          }
          continue;
        }
      }

      if (await abandonUnpaidClass(hold.id, 'PAYMENT_TIMEOUT', now)) summary.holdsReleased += 1;
      if (hold.stripeCheckoutSessionId) {
        await stripe.checkout.sessions.expire(hold.stripeCheckoutSessionId).catch(() => undefined);
      }
    } catch (err) {
      // Una reserva que no se pudo resolver se queda como está y se reintenta.
      reportSilentDegradation('class_lifecycle', err, { step: 'hold', classId: hold.id });
      if (!summary.failedSteps.includes('holds')) summary.failedSteps.push('holds');
    }
  }
}

// ─────────────────────────── 2. Confirmación del profesor ───────────────────────────

async function driveConfirmations(deps: LifecycleDeps, summary: LifecycleSummary): Promise<void> {
  const { now } = deps;
  const rows = await lifecycleQueries.awaitingConfirmation();

  for (const row of rows) {
    if (!row.paidAt) continue;
    const schedule = confirmationSchedule(row.scheduledAt, row.paidAt);
    if (now.getTime() < schedule.requestAt.getTime()) continue;

    try {
      // Sin confirmar a tiempo: se cancela con reembolso completo y CUENTA contra el profesor.
      if (now.getTime() >= schedule.autoCancelAt.getTime()) {
        await cancelClassAndRefund(
          { classId: row.id, actor: { kind: 'SYSTEM' }, cause: 'TEACHER_NO_CONFIRMATION' },
          deps
        );
        summary.autoCancelled += 1;
        continue;
      }

      const ctx = await getClassNotifyContext(row.id);
      if (!ctx) continue;

      if (!row.confirmationRequestedAt && (await sendConfirmationRequest(ctx))) {
        if (await markConfirmationRequested(row.id, now)) summary.confirmationRequests += 1;
      }

      if (now.getTime() >= schedule.alertAt.getTime() && !row.adminAlertedAt) {
        const alerted = await alertAdmins('Clase sin confirmar por el profesor', [
          `Profesor: ${ctx.teacher.publicName}`,
          `Clase: ${formatClassWhen(ctx.scheduledAt)} (id ${ctx.id})`,
          `Si no confirma, se cancela sola y se devuelve el pago completo al alumno.`,
        ]);
        const noticed = await sendUnconfirmedNotice(ctx);
        // Se sella con que al menos el admin haya sido avisado: el aviso al alumno es cortesía.
        if (alerted && (await markAdminAlerted(row.id, now))) summary.adminAlerts += 1;
        else if (!noticed) reportSilentDegradation('class_lifecycle', new Error('Aviso de no confirmación sin entregar'), { classId: row.id });
      }
    } catch (err) {
      reportSilentDegradation('class_lifecycle', err, { step: 'confirmation', classId: row.id });
      if (!summary.failedSteps.includes('confirmations')) summary.failedSteps.push('confirmations');
    }
  }
}

// ─────────────────────────── 3. Enlace del aula ───────────────────────────

async function sendDueMeetingLinks(deps: LifecycleDeps, summary: LifecycleSummary): Promise<void> {
  const { classroom, now } = deps;
  const due = await lifecycleQueries.meetingLinksDue(now);
  if (due.length === 0) return;

  if (!classroom) {
    // Hay clases que ya deben tener enlace y no hay aula configurada: nadie
    // podrá entrar. Es una falla operativa, no un «nada que hacer».
    throw new Error(`Aula no configurada (GOOGLE_CLASSROOM_*): ${due.length} clase(s) sin enlace`);
  }

  for (const cls of due) {
    try {
      let meetingUrl = cls.meetingUrl;
      if (!meetingUrl) {
        const meeting = await classroom.createMeeting({
          classId: cls.id,
          startsAt: cls.scheduledAt,
          endsAt: classEndsAt(cls.scheduledAt, cls.durationMinutes),
        });
        await saveMeeting(cls.id, meeting);
        meetingUrl = meeting.meetingUrl;
      }
      const ctx = await getClassNotifyContext(cls.id);
      if (!ctx) continue;
      // Se sella solo si SALIERON los dos correos; si no, la próxima corrida reenvía.
      if (await sendMeetingLinks(ctx, meetingUrl)) {
        await markMeetingLinkSent(cls.id, now);
        summary.meetingLinks += 1;
      }
    } catch (err) {
      reportSilentDegradation('classroom_provider', err, { step: 'meeting-link', classId: cls.id });
      if (!summary.failedSteps.includes('meeting-links')) summary.failedSteps.push('meeting-links');
    }
  }
}

// ─────────────────────────── 4. Reembolsos pendientes ───────────────────────────

async function retryRefunds(deps: LifecycleDeps, summary: LifecycleSummary): Promise<void> {
  const due = await lifecycleQueries.refundsDue();
  for (const row of due) {
    const res = await refundClassIfDue(row.id, deps.stripe);
    if (res.status === 'refunded') summary.refundsSettled += 1;
    // `failed` / `no_payment` ya se reportaron dentro de `refundClassIfDue`.
    else if (res.status === 'failed' || res.status === 'no_payment') {
      if (!summary.failedSteps.includes('refunds')) summary.failedSteps.push('refunds');
    }
  }
}
