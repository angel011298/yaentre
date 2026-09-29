import { logAdminAction } from '@/lib/admin/audit-log';
import { evaluateRefundAuthority } from '@/lib/admin/capabilities';
import { requireMasterAdmin } from '@/lib/admin/master';
import {
  supportOpposeMarketingSchema,
  supportRefundSchema,
  supportUserIdSchema,
  userSearchSchema,
  type ActionResult,
} from '@/lib/admin/schemas';
import { requireCapability } from '@/lib/auth/guards';
import { buildUserDataExport } from '@/lib/db/account';
import { getAuthEmail } from '@/lib/db/auth-users';
import { setNotificationPreference } from '@/lib/db/notifications';
import { reverseSaleForSubscription } from '@/lib/db/referrals';
import { cancelRefundedSubscription, recordRefundsForPaymentIntent } from '@/lib/db/refunds';
import {
  loadRefundFacts,
  loadSupportFicha,
  searchUsersForSupportDb,
  type SupportFicha,
  type SupportUserRow,
} from '@/lib/db/support';
import { prisma } from '@/lib/db/prisma';
import { reportControlFailure, reportSilentDegradation } from '@/lib/observability/report';
import { consumeRateLimit } from '@/lib/rate-limit/store';
import { getStripe } from '@/lib/stripe/client';
import { toLite } from '@/lib/stripe/refund-webhook';
import { beginSupportAction } from './guard';
import { evaluateValve, REFUND_DENIAL_MESSAGE } from './valve';

/**
 * MESA DE SOPORTE — Bloque 3: ARCO y reembolsos. Una sola implementación que usan
 * las Server Actions, los Route Handlers y las páginas de `/soporte`, para que las
 * reglas no diverjan entre las puertas de entrada.
 *
 * Todas cumplen las cuatro condiciones de la excepción autorizada de G99 (ver
 * `beginSupportAction`). Esto NO es `'use server'`.
 *
 * ── Lo que soporte NO puede, por diseño ────────────────────────────────────
 *
 *  · Reembolsar fuera de la válvula de 48 h con consumo cero: solo admin maestro.
 *  · Ver contraseñas, respuestas de examen ni actividad de estudio.
 *  · Regalar planes, cambiar roles, borrar archivos: nada de lo de `/admin`.
 *
 * ── ARCO: qué está y qué no ────────────────────────────────────────────────
 *
 *  ✔ ACCESO: exportar los datos de un titular (JSON, descarga auditada).
 *  ✔ OPOSICIÓN: retirar su consentimiento de marketing.
 *  ✗ RECTIFICACIÓN y CANCELACIÓN a nombre de un tercero: NO están. La cancelación
 *    es la eliminación de cuenta, que el titular hace él mismo desde /app/perfil;
 *    hacerla por un tercero exige verificar identidad (proceso del CLO). Ver retorno.
 */

type Result<T> = Promise<ActionResult<T>>;

function unknownFailure(err: unknown, stage: string): ActionResult<never> {
  reportSilentDegradation('support_action', err, { stage });
  return { ok: false, code: 'UNKNOWN', message: 'Algo salió mal. Intenta de nuevo.' };
}

// ═══════════════════════════ Búsqueda y ficha ═══════════════════════════

const SEARCH_PAGE_SIZE = 20;

export async function searchUsersForSupport(input: unknown): Result<{ rows: SupportUserRow[]; total: number; page: number; pageSize: number }> {
  const { profile } = await requireCapability('users.read');
  const parsed = userSearchSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false, code: 'VALIDATION', message: 'La búsqueda no es válida.' };

  const gate = await consumeRateLimit('SUPPORT_READ', profile.id);
  if (!gate.allowed) return { ok: false, code: 'RATE_LIMIT', message: 'Demasiadas consultas seguidas. Espera un momento.' };

  const { rows, total } = await searchUsersForSupportDb({ ...parsed.data, pageSize: SEARCH_PAGE_SIZE });
  return { ok: true, data: { rows, total, page: parsed.data.page, pageSize: SEARCH_PAGE_SIZE } };
}

/** La ficha de una cuenta. Ver los datos de una persona deja rastro (`support.ficha_viewed`). */
export async function loadFichaForSupport(input: unknown): Result<SupportFicha> {
  const begun = await beginSupportAction({
    capability: 'users.read',
    action: 'support.ficha_viewed',
    schema: supportUserIdSchema,
    input,
    rateLimit: 'SUPPORT_READ',
    targetKind: 'user',
  });
  if (!begun.ok) return begun.result;

  try {
    const ficha = await loadSupportFicha(begun.data.userProfileId, new Date());
    await logAdminAction('support.ficha_viewed', begun.actor, {
      targetKind: 'user',
      targetUserProfileId: ficha ? begun.data.userProfileId : null,
      metadata: { found: ficha !== null },
      outcome: ficha ? 'applied' : 'rejected',
    });
    return ficha ? { ok: true, data: ficha } : { ok: false, code: 'NOT_FOUND', message: 'No encontramos esa cuenta.' };
  } catch (err) {
    return unknownFailure(err, 'ficha');
  }
}

// ═══════════════════════════ ARCO ═══════════════════════════

/** ACCESO: los datos del titular, listos para entregarse. La descarga queda en la bitácora ANTES de salir. */
export async function exportUserDataForSupport(input: unknown): Result<{ filename: string; body: string }> {
  const begun = await beginSupportAction({
    capability: 'arco.handle',
    action: 'arco.exported',
    schema: supportUserIdSchema,
    input,
    rateLimit: 'SUPPORT_ACTION',
    targetKind: 'user',
  });
  if (!begun.ok) return begun.result;
  const { actor, data } = begun;

  try {
    const email = await getAuthEmail(data.userProfileId);
    const exported = await buildUserDataExport(data.userProfileId, email);
    await logAdminAction('arco.exported', actor, {
      targetKind: 'user',
      targetUserProfileId: exported ? data.userProfileId : null,
      metadata: { found: exported !== null },
      outcome: exported ? 'applied' : 'rejected',
    });
    if (!exported) return { ok: false, code: 'NOT_FOUND', message: 'No encontramos esa cuenta.' };
    return {
      ok: true,
      data: { filename: `yaentre-datos-${data.userProfileId}.json`, body: JSON.stringify(exported, null, 2) },
    };
  } catch (err) {
    await logAdminAction('arco.exported', actor, {
      targetKind: 'user',
      targetUserProfileId: data.userProfileId,
      metadata: { denied: 'ERROR' },
      outcome: 'rejected',
    });
    return unknownFailure(err, 'arco-export');
  }
}

/** OPOSICIÓN: retira el consentimiento de marketing. Es el derecho del titular; soporte solo lo ejecuta. */
export async function opposeMarketingForSupport(input: unknown): Result<{ applied: true }> {
  const begun = await beginSupportAction({
    capability: 'arco.handle',
    action: 'arco.marketing_opt_out',
    schema: supportOpposeMarketingSchema,
    input,
    rateLimit: 'SUPPORT_ACTION',
    targetKind: 'user',
  });
  if (!begun.ok) return begun.result;
  const { actor, data } = begun;

  try {
    const exists = await prisma.userProfile.findUnique({ where: { id: data.userProfileId }, select: { id: true } });
    if (!exists) {
      await logAdminAction('arco.marketing_opt_out', actor, {
        targetKind: 'user',
        reason: data.reason,
        metadata: { denied: 'NOT_FOUND' },
        outcome: 'rejected',
      });
      return { ok: false, code: 'NOT_FOUND', message: 'No encontramos esa cuenta.' };
    }
    await setNotificationPreference(data.userProfileId, 'MARKETING', false);
    await logAdminAction('arco.marketing_opt_out', actor, {
      targetKind: 'user',
      targetUserProfileId: data.userProfileId,
      reason: data.reason,
    });
    return { ok: true, data: { applied: true } };
  } catch (err) {
    await logAdminAction('arco.marketing_opt_out', actor, {
      targetKind: 'user',
      targetUserProfileId: data.userProfileId,
      reason: data.reason,
      metadata: { denied: 'ERROR' },
      outcome: 'rejected',
    });
    return unknownFailure(err, 'arco-opposition');
  }
}

// ═══════════════════════════ Reembolso ═══════════════════════════

export interface RefundOutcome {
  refundedCents: number;
  canceled: boolean;
  creditRestoredCents: number;
  /** Cosas que quedaron a medias DESPUÉS de mover el dinero: no se revierten, se avisan. */
  warnings: string[];
}

/**
 * Emite el reembolso TOTAL de lo que falta por devolver de un plan, lo da de baja y
 * revierte lo que colgaba de esa compra (venta de referido, crédito gastado).
 *
 * Orden y por qué:
 *  1. guard, validación y límite (en `beginSupportAction`);
 *  2. HECHOS desde la base (lo cobrado, lo devuelto, el consumo) — jamás del input;
 *  3. autoridad: soporte solo DENTRO de la válvula; admin siempre maestro;
 *  4. Stripe, con clave de idempotencia derivada de (pago, lo ya devuelto): un
 *     reintento tras un fallo a medias no devuelve dos veces;
 *  5. todo lo demás es consecuencia de un hecho ya consumado (el dinero salió):
 *     cada paso reporta su propio fallo y NO revierte el reembolso.
 * La bitácora se escribe ANTES de responder, con el resultado real.
 */
export async function issueRefundForSupport(input: unknown): Result<RefundOutcome> {
  const begun = await beginSupportAction({
    capability: 'refunds.issue',
    action: 'refund.issued',
    schema: supportRefundSchema,
    input,
    rateLimit: 'REFUND_ISSUE',
    targetKind: 'payment',
  });
  if (!begun.ok) return begun.result;
  const { actor, data } = begun;
  const now = new Date();

  const reject = async (code: 'NOT_FOUND' | 'INVALID_STATE' | 'FORBIDDEN' | 'UPSTREAM', message: string, metadata: Record<string, unknown>) => {
    await logAdminAction('refund.issued', actor, {
      targetKind: 'payment',
      reason: data.reason,
      metadata: { subscriptionId: data.subscriptionId, ...metadata },
      outcome: 'rejected',
    });
    return { ok: false as const, code, message };
  };

  try {
    const facts = await loadRefundFacts(data.subscriptionId);
    if (!facts) return await reject('NOT_FOUND', 'No encontramos ese plan.', { denied: 'NOT_FOUND' });
    if (facts.isComp) return await reject('INVALID_STATE', 'Es una cortesía: no hubo cobro que reembolsar.', { denied: 'COMP' });

    const pending = facts.payments
      .map((p) => ({ ...p, remainingCents: p.amountCents - p.refundedCents }))
      .filter((p) => p.remainingCents > 0);
    if (facts.payments.length === 0) return await reject('INVALID_STATE', 'Este plan no tiene un cobro registrado.', { denied: 'NO_PAYMENT' });
    if (pending.length === 0) return await reject('INVALID_STATE', 'Este plan ya se reembolsó por completo.', { denied: 'ALREADY_REFUNDED' });
    if (pending.some((p) => !p.paymentIntentId)) {
      return await reject('INVALID_STATE', 'El cobro de este plan no tiene un pago de Stripe asociado: se reembolsa a mano.', { denied: 'NO_PAYMENT_INTENT' });
    }

    // Autoridad. Un ADMIN solo es «maestro» si su correo está en la lista (y si la
    // lista falta, `requireMasterAdmin` lo reporta y cierra).
    const valve = evaluateValve({
      paidAt: facts.paidAt,
      now,
      sessionsSinceActivation: facts.sessionsSinceActivation,
    });
    const isMaster = actor.role === 'ADMIN' ? requireMasterAdmin(actor.email).ok : false;
    const authority = evaluateRefundAuthority({ role: actor.role, isMaster, insideValve: valve.inside });
    if (!authority.allowed) {
      return await reject('FORBIDDEN', REFUND_DENIAL_MESSAGE[authority.reason], {
        denied: authority.reason,
        insideValve: valve.inside,
      });
    }

    const stripe = getStripe();
    const warnings: string[] = [];
    let refundedCents = 0;
    let stripeFailure: unknown = null;

    for (const payment of pending) {
      try {
        const refund = await stripe.refunds.create(
          {
            payment_intent: payment.paymentIntentId as string,
            amount: payment.remainingCents,
            reason: 'requested_by_customer',
            // `origin: support` le dice al webhook `charge.refunded` que el plan ya lo
            // gestionó esta acción: sin esto, avisaría de un «reembolso total sobre un
            // plan activo» que en realidad ya se está dando de baja.
            metadata: { origin: 'support', subscriptionId: facts.id, actor: actor.userProfileId },
          },
          { idempotencyKey: `support-refund:${payment.id}:${payment.refundedCents}` }
        );
        const recorded = await recordRefundsForPaymentIntent(prisma, payment.paymentIntentId as string, [toLite(refund)], 'SUPPORT');
        refundedCents += payment.remainingCents;
        if (refund.status !== 'succeeded') {
          warnings.push('Stripe dejó el reembolso pendiente (pasa con OXXO y SPEI); se registrará al confirmarse.');
        } else if (recorded.inserted === 0) {
          // Ya estaba (el webhook llegó primero): no es un error.
        }
      } catch (err) {
        stripeFailure = err;
        break;
      }
    }

    if (stripeFailure && refundedCents === 0) {
      reportControlFailure('refund_reconciliation', 'fail-closed', stripeFailure, { subscriptionId: facts.id, stage: 'stripe' });
      return await reject('UPSTREAM', 'Stripe no pudo procesar el reembolso. No se cambió nada; intenta de nuevo en un momento.', {
        denied: 'STRIPE',
      });
    }
    if (stripeFailure) {
      // Dinero ya movido en un pago pero no en otro: NO se da de baja el plan a medias.
      reportControlFailure('refund_reconciliation', 'degraded', stripeFailure, { subscriptionId: facts.id, stage: 'stripe-partial' });
      warnings.push('Se reembolsó solo una parte: un cobro falló. El plan NO se dio de baja; revísalo con el administrador.');
    }

    let canceled = false;
    let creditRestoredCents = 0;
    if (!stripeFailure) {
      try {
        const r = await cancelRefundedSubscription(facts.id, now);
        canceled = r.canceled;
        creditRestoredCents = r.creditRestoredCents;
      } catch (err) {
        reportControlFailure('refund_reconciliation', 'degraded', err, { subscriptionId: facts.id, stage: 'cancel' });
        warnings.push('El dinero ya se devolvió, pero no pudimos dar de baja el plan. Avisa al administrador.');
      }
      try {
        await reverseSaleForSubscription(facts.id, 'support_refund', now);
      } catch (err) {
        reportControlFailure('refund_reconciliation', 'degraded', err, { subscriptionId: facts.id, stage: 'reverse_referral' });
        warnings.push('No pudimos revertir la venta de referido de esta compra; el respaldo diario la revierte.');
      }
    }

    // La bitácora, ANTES de responder y con lo que de verdad pasó.
    await logAdminAction('refund.issued', actor, {
      targetKind: 'payment',
      targetUserProfileId: facts.userProfileId,
      reason: data.reason,
      metadata: {
        subscriptionId: facts.id,
        refundedCents,
        insideValve: valve.inside,
        canceled,
        creditRestoredCents,
        warnings: warnings.length,
      },
    });

    return { ok: true, data: { refundedCents, canceled, creditRestoredCents, warnings } };
  } catch (err) {
    await logAdminAction('refund.issued', actor, {
      targetKind: 'payment',
      reason: data.reason,
      metadata: { subscriptionId: data.subscriptionId, denied: 'ERROR' },
      outcome: 'rejected',
    });
    return unknownFailure(err, 'refund');
  }
}
