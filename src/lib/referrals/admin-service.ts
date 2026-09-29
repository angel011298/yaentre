import { logAdminAction } from '@/lib/admin/audit-log';
import { beginReferralAdminAction } from '@/lib/admin/referral-guard';
import {
  adminReferralCodeSchema,
  adminResolveFlagSchema,
  type ActionResult,
} from '@/lib/admin/schemas';
import { requireRole } from '@/lib/auth/guards';
import {
  listFraudAlerts,
  listReferrers,
  reinstateReferralCode,
  resolveFraudFlag,
  suspendReferralCode,
  type AdminReferralResult,
  type AdminReferrerRow,
  type FraudAlertRow,
} from '@/lib/db/referrals';
import { reportSilentDegradation } from '@/lib/observability/report';
import { consumeRateLimit } from '@/lib/rate-limit/store';

/**
 * ADMINISTRACIÓN DEL PROGRAMA DE REFERIDOS — Bloque 3. Una sola implementación
 * que usan las Server Actions de `/admin/referidos` y los Route Handlers de
 * `/api/admin/referrals/*`, para que las reglas no diverjan entre las dos puertas.
 *
 * Lecturas: ADMIN. Escrituras: ADMIN MAESTRO con las cuatro condiciones de G99
 * (ver `beginReferralAdminAction`). Esto NO es `'use server'`.
 */

type Result<T> = Promise<ActionResult<T>>;

export async function listReferrersForAdmin(): Promise<ActionResult<AdminReferrerRow[]>> {
  const { profile } = await requireRole('ADMIN');
  const gate = await consumeRateLimit('ADMIN_REFERRAL_READ', profile.id);
  if (!gate.allowed) return { ok: false, code: 'RATE_LIMIT', message: 'Demasiadas consultas seguidas. Espera un momento.' };
  return { ok: true, data: await listReferrers() };
}

export async function listFraudAlertsForAdmin(): Promise<ActionResult<FraudAlertRow[]>> {
  const { profile } = await requireRole('ADMIN');
  const gate = await consumeRateLimit('ADMIN_REFERRAL_READ', profile.id);
  if (!gate.allowed) return { ok: false, code: 'RATE_LIMIT', message: 'Demasiadas consultas seguidas. Espera un momento.' };
  return { ok: true, data: await listFraudAlerts() };
}

function failure(err: unknown): ActionResult<never> {
  reportSilentDegradation('staff_api', err, { area: 'admin-referrals' });
  return { ok: false, code: 'UNKNOWN', message: 'Algo salió mal. Intenta de nuevo.' };
}

async function finish(
  action: 'referral.suspended' | 'referral.reinstated' | 'referral.flag_resolved',
  actor: { userProfileId: string; email: string | null | undefined },
  reason: string,
  metadata: Record<string, unknown>,
  outcome: AdminReferralResult
): Promise<ActionResult<{ applied: true }>> {
  // La bitácora va ANTES de responder, con el resultado real: también el rechazo.
  await logAdminAction(action, actor, {
    targetKind: 'referral',
    reason,
    metadata,
    outcome: outcome.ok ? 'applied' : 'rejected',
  });
  return outcome.ok ? { ok: true, data: { applied: true } } : { ok: false, code: outcome.code, message: outcome.message };
}

export async function suspendReferralAdmin(input: unknown): Result<{ applied: true }> {
  const begun = await beginReferralAdminAction('referral.suspended', adminReferralCodeSchema, input);
  if (!begun.ok) return begun.result;
  try {
    const outcome = await suspendReferralCode(begun.data.referralId, begun.data.reason);
    return await finish('referral.suspended', begun.actor, begun.data.reason, { referralId: begun.data.referralId }, outcome);
  } catch (err) {
    await logAdminAction('referral.suspended', begun.actor, {
      targetKind: 'referral',
      reason: begun.data.reason,
      metadata: { referralId: begun.data.referralId, denied: 'ERROR' },
      outcome: 'rejected',
    });
    return failure(err);
  }
}

export async function reinstateReferralAdmin(input: unknown): Result<{ applied: true }> {
  const begun = await beginReferralAdminAction('referral.reinstated', adminReferralCodeSchema, input);
  if (!begun.ok) return begun.result;
  try {
    const outcome = await reinstateReferralCode(begun.data.referralId);
    return await finish('referral.reinstated', begun.actor, begun.data.reason, { referralId: begun.data.referralId }, outcome);
  } catch (err) {
    await logAdminAction('referral.reinstated', begun.actor, {
      targetKind: 'referral',
      reason: begun.data.reason,
      metadata: { referralId: begun.data.referralId, denied: 'ERROR' },
      outcome: 'rejected',
    });
    return failure(err);
  }
}

export async function resolveFlagAdmin(input: unknown): Result<{ applied: true }> {
  const begun = await beginReferralAdminAction('referral.flag_resolved', adminResolveFlagSchema, input);
  if (!begun.ok) return begun.result;
  try {
    const outcome = await resolveFraudFlag(begun.data.saleId, begun.data.decision);
    return await finish(
      'referral.flag_resolved',
      begun.actor,
      begun.data.reason,
      { saleId: begun.data.saleId, decision: begun.data.decision },
      outcome
    );
  } catch (err) {
    await logAdminAction('referral.flag_resolved', begun.actor, {
      targetKind: 'referral',
      reason: begun.data.reason,
      metadata: { saleId: begun.data.saleId, decision: begun.data.decision, denied: 'ERROR' },
      outcome: 'rejected',
    });
    return failure(err);
  }
}
