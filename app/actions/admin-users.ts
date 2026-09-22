'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { AuthError } from '@/lib/auth/errors';
import { requireRole } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { logAdminAction, type AdminAuditAction } from '@/lib/admin/audit-log';
import { MASTER_ADMIN_DENIED_MESSAGE, requireMasterAdmin } from '@/lib/admin/master';
import {
  adminUserTargetSchema,
  cancelPlanSchema,
  changeRoleSchema,
  grantCompSchema,
  type ActionResult,
} from '@/lib/admin/schemas';
import * as adminUsers from '@/lib/db/admin-users';
import { AdminUserError } from '@/lib/db/admin-users';
import { revokeAllSessions } from '@/lib/db/auth-users';
import { getSiteUrl } from '@/lib/auth/site-url';
import { consumeRateLimit } from '@/lib/rate-limit/store';

/**
 * G99 — Server Actions de administración de CUENTAS.
 *
 * ⚠️ CADA ACCIÓN VERIFICA EL ROL POR SU CUENTA. `app/admin/layout.tsx` llama a
 * `requireRole('ADMIN')`, pero un layout NO protege una Server Action: cada
 * acción es su propio endpoint y se alcanza con un `fetch` a su ruta sin
 * renderizar ningún layout. Así se verificó en producción en G98 con el
 * interruptor de ventas. El layout es defensa en profundidad; la línea que de
 * verdad protege es la primera de cada función de este archivo.
 *
 * ⚠️ EXCEPCIÓN AUTORIZADA al guardrail «no aceptar `userProfileId` como
 * entrada». Documentada en CLAUDE.md y en `src/lib/admin/schemas.ts`. Las
 * cuatro condiciones se cumplen aquí, en este orden, en TODAS las acciones:
 *   1. `requireRole('ADMIN')` dentro de la acción;
 *   2. el id entra validado como cuid por un esquema Zod;
 *   3. se escribe en `admin_audit_log` ANTES de responder — también cuando la
 *      acción se RECHAZA;
 *   4. pasa por `consumeRateLimit` (contador compartido en Postgres).
 *
 * 🔒 Nada en este archivo lee, deriva ni muestra material de contraseñas.
 * "Forzar restablecimiento" envía el correo de recuperación de Supabase Auth;
 * no toca el hash y no revela nada sobre él.
 */

function toError(err: unknown): { code: string; message: string } {
  if (err instanceof z.ZodError) {
    return { code: 'VALIDATION', message: err.issues[0]?.message ?? 'Datos inválidos.' };
  }
  if (err instanceof AdminUserError || err instanceof AuthError) {
    return { code: err.code, message: err.message };
  }
  return { code: 'UNKNOWN', message: 'Algo salió mal. Intenta de nuevo.' };
}

interface Actor {
  userProfileId: string;
  email: string | null | undefined;
}

/**
 * Preámbulo común: rol, compuerta de maestro, validación y límite de tasa.
 * Devuelve el actor y los datos ya validados, o un resultado de rechazo que
 * YA quedó auditado.
 *
 * Que el rechazo se audite aquí —y no en cada acción— es lo que hace cierta la
 * promesa «toda acción escribe exactamente una fila, incluso al fallar».
 */
async function beginAdminAction<T extends { userProfileId: string; reason: string }>(
  action: AdminAuditAction,
  schema: z.ZodType<T>,
  input: unknown,
  opts: { requireMaster: boolean }
): Promise<
  | { ok: true; actor: Actor; data: T }
  | { ok: false; result: ActionResult<never> }
> {
  // 1. ROL — siempre primero, antes de mirar el input.
  const { profile, authUser } = await requireRole('ADMIN');
  const actor: Actor = { userProfileId: profile.id, email: authUser.email };

  const audit = async (reason: string | null, metadata: Record<string, unknown>) => {
    await logAdminAction(action, actor, {
      targetKind: 'user',
      targetUserProfileId:
        typeof (input as { userProfileId?: unknown })?.userProfileId === 'string'
          ? ((input as { userProfileId: string }).userProfileId)
          : null,
      reason,
      metadata,
      outcome: 'rejected',
    });
  };

  // 2. COMPUERTA DE MAESTRO para las acciones destructivas.
  if (opts.requireMaster) {
    const verdict = requireMasterAdmin(authUser.email);
    if (!verdict.ok) {
      await audit(null, { denied: verdict.reason });
      return {
        ok: false,
        result: { ok: false, code: 'FORBIDDEN', message: MASTER_ADMIN_DENIED_MESSAGE },
      };
    }
  }

  // 3. VALIDACIÓN.
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Datos inválidos.';
    await audit(null, { denied: 'VALIDATION', message });
    return { ok: false, result: { ok: false, code: 'VALIDATION', message } };
  }

  // 4. LÍMITE DE TASA — compartido en Postgres, nunca el de memoria.
  const verdict = await consumeRateLimit('ADMIN_USER_ACTION', profile.id);
  if (!verdict.allowed) {
    await audit(parsed.data.reason, { denied: 'RATE_LIMIT' });
    return {
      ok: false,
      result: {
        ok: false,
        code: 'RATE_LIMIT',
        message: `Demasiadas acciones seguidas. Intenta en ${Math.ceil(verdict.retryAfterSecs / 60)} min.`,
      },
    };
  }

  return { ok: true, actor, data: parsed.data };
}

function revalidateAdmin(userProfileId?: string): void {
  revalidatePath('/admin/usuarios');
  revalidatePath('/admin/bitacora');
  if (userProfileId) revalidatePath(`/admin/usuarios/${userProfileId}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Alta de plan como CORTESÍA
// ═══════════════════════════════════════════════════════════════════════════

export async function grantCompAction(
  input: unknown
): Promise<ActionResult<{ subscriptionId: string }>> {
  try {
    const begun = await beginAdminAction('user.comp_granted', grantCompSchema, input, {
      requireMaster: true,
    });
    if (!begun.ok) return begun.result;
    const { actor, data } = begun;

    const granted = await adminUsers.grantCompSubscription({
      userProfileId: data.userProfileId,
      plan: data.plan,
      season: data.season,
    });

    await logAdminAction('user.comp_granted', actor, {
      targetKind: 'user',
      targetUserProfileId: data.userProfileId,
      reason: data.reason,
      metadata: {
        subscriptionId: granted.subscriptionId,
        plan: granted.plan,
        season: granted.season,
        expiresAt: granted.expiresAt?.toISOString() ?? null,
        earlyBirdBadgeGranted: granted.earlyBirdBadgeGranted,
        isComp: true,
      },
    });

    revalidateAdmin(data.userProfileId);
    return { ok: true, data: { subscriptionId: granted.subscriptionId } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Baja / cancelación de un plan
// ═══════════════════════════════════════════════════════════════════════════

export async function cancelPlanAction(
  input: unknown
): Promise<ActionResult<{ subscriptionId: string }>> {
  try {
    const begun = await beginAdminAction('user.plan_canceled', cancelPlanSchema, input, {
      requireMaster: true,
    });
    if (!begun.ok) return begun.result;
    const { actor, data } = begun;

    const canceled = await adminUsers.cancelSubscription({
      userProfileId: data.userProfileId,
      subscriptionId: data.subscriptionId,
    });

    await logAdminAction('user.plan_canceled', actor, {
      targetKind: 'user',
      targetUserProfileId: data.userProfileId,
      reason: data.reason,
      metadata: {
        subscriptionId: canceled.subscriptionId,
        previousStatus: canceled.previousStatus,
      },
    });

    revalidateAdmin(data.userProfileId);
    return { ok: true, data: { subscriptionId: canceled.subscriptionId } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Forzar restablecimiento de contraseña
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Dispara el correo de recuperación de Supabase Auth hacia la cuenta objetivo.
 *
 * No se toca el hash, no se lee y no se mide: solo se envía el mismo enlace
 * que el usuario obtendría desde "olvidé mi contraseña". Es la sustitución
 * honesta del requisito original de "ver la contraseña", que no es alcanzable
 * —Supabase guarda un hash— y que además no debería serlo.
 *
 * Usa `resetPasswordForEmail`, que es la API PÚBLICA de Auth (anon key): no
 * necesita `SUPABASE_SERVICE_ROLE_KEY`, que no está cargada en producción.
 */
export async function forcePasswordResetAction(
  input: unknown
): Promise<ActionResult<{ sent: true }>> {
  try {
    const begun = await beginAdminAction(
      'user.password_reset_forced',
      adminUserTargetSchema,
      input,
      { requireMaster: true }
    );
    if (!begun.ok) return begun.result;
    const { actor, data } = begun;

    const detail = await adminUsers.getUserDetail(data.userProfileId);
    if (!detail?.email) {
      await logAdminAction('user.password_reset_forced', actor, {
        targetKind: 'user',
        targetUserProfileId: data.userProfileId,
        reason: data.reason,
        metadata: { denied: 'NO_EMAIL' },
        outcome: 'rejected',
      });
      return { ok: false, code: 'NOT_FOUND', message: 'Esa cuenta no tiene correo resoluble.' };
    }

    // Presupuesto aparte POR CUENTA OBJETIVO: el correo llega a la bandeja de
    // otra persona, así que el límite cuelga de quien lo recibe.
    const perTarget = await consumeRateLimit(
      'ADMIN_PASSWORD_RESET_TARGET',
      detail.email.toLowerCase()
    );
    if (!perTarget.allowed) {
      await logAdminAction('user.password_reset_forced', actor, {
        targetKind: 'user',
        targetUserProfileId: data.userProfileId,
        reason: data.reason,
        metadata: { denied: 'RATE_LIMIT_TARGET' },
        outcome: 'rejected',
      });
      return {
        ok: false,
        code: 'RATE_LIMIT',
        message: 'Ya se enviaron varios correos de recuperación a esa cuenta esta hora.',
      };
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(detail.email, {
      redirectTo: `${getSiteUrl()}/auth/confirm?next=/actualizar-password`,
    });

    await logAdminAction('user.password_reset_forced', actor, {
      targetKind: 'user',
      targetUserProfileId: data.userProfileId,
      reason: data.reason,
      metadata: { delivered: !error },
      outcome: error ? 'rejected' : 'applied',
    });

    if (error) {
      return {
        ok: false,
        code: 'AUTH',
        message: 'No pudimos enviar el correo de recuperación. Intenta de nuevo.',
      };
    }

    revalidateAdmin(data.userProfileId);
    return { ok: true, data: { sent: true } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Cerrar todas las sesiones
// ═══════════════════════════════════════════════════════════════════════════

export async function revokeSessionsAction(
  input: unknown
): Promise<ActionResult<{ revoked: number }>> {
  try {
    const begun = await beginAdminAction('user.sessions_revoked', adminUserTargetSchema, input, {
      requireMaster: true,
    });
    if (!begun.ok) return begun.result;
    const { actor, data } = begun;

    const revoked = await revokeAllSessions(data.userProfileId);

    await logAdminAction('user.sessions_revoked', actor, {
      targetKind: 'user',
      targetUserProfileId: data.userProfileId,
      reason: data.reason,
      metadata: { revoked },
    });

    revalidateAdmin(data.userProfileId);
    return { ok: true, data: { revoked } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Cambio de rol
// ═══════════════════════════════════════════════════════════════════════════

export async function changeRoleAction(
  input: unknown
): Promise<ActionResult<{ role: string }>> {
  try {
    const begun = await beginAdminAction('user.role_changed', changeRoleSchema, input, {
      requireMaster: true,
    });
    if (!begun.ok) return begun.result;
    const { actor, data } = begun;

    // ── Un admin maestro no puede degradarse a sí mismo ────────────────────
    // Si el objetivo es el propio actor, se rechaza SIEMPRE — no solo cuando
    // el rol nuevo es distinto de ADMIN. Dejar pasar "ADMIN → ADMIN" sobre uno
    // mismo no aporta nada y abre la puerta a que un cambio futuro del
    // formulario convierta el caso en una degradación real sin que nadie lo
    // note. Salir de la lista `MASTER_ADMIN_EMAILS` tampoco se puede desde
    // aquí: esa lista vive en el entorno, no en la base, justo para que el
    // panel no pueda dejar al producto sin administrador.
    if (data.userProfileId === actor.userProfileId) {
      await logAdminAction('user.role_changed', actor, {
        targetKind: 'user',
        targetUserProfileId: data.userProfileId,
        reason: data.reason,
        metadata: { denied: 'SELF_TARGET', requestedRole: data.role },
        outcome: 'rejected',
      });
      return {
        ok: false,
        code: 'FORBIDDEN',
        message: 'No puedes cambiar tu propio rol. Pídeselo a otro administrador maestro.',
      };
    }

    const changed = await adminUsers.changeUserRole({
      userProfileId: data.userProfileId,
      role: data.role,
    });

    await logAdminAction('user.role_changed', actor, {
      targetKind: 'user',
      targetUserProfileId: data.userProfileId,
      reason: data.reason,
      metadata: { previousRole: changed.previousRole, role: changed.role },
    });

    revalidateAdmin(data.userProfileId);
    return { ok: true, data: { role: changed.role } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}
