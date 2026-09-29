import { z } from 'zod';
import { requireRole } from '@/lib/auth/guards';
import { consumeRateLimit } from '@/lib/rate-limit/store';
import { logAdminAction, type AdminAuditAction } from './audit-log';
import { MASTER_ADMIN_DENIED_MESSAGE, requireMasterAdmin } from './master';
import type { ActionResult } from './schemas';

/**
 * Preámbulo COMÚN de las acciones y rutas de administración del programa de
 * referidos — Bloque 3. Reproduce, en el mismo orden, las cuatro condiciones de
 * la excepción autorizada de G99 (CLAUDE.md), porque estas acciones reciben a
 * qué afectan (un código o una venta) y no pueden derivarlo del guard:
 *
 *   1. `requireRole('ADMIN')` DENTRO de la acción (un layout no protege una
 *      Server Action ni un Route Handler);
 *   2. el id entra validado como cuid por un esquema Zod;
 *   3. la bitácora se escribe ANTES de responder —también al RECHAZAR—;
 *   4. pasa por `consumeRateLimit` (contador compartido de Postgres).
 *
 * Y exigen ADMIN MAESTRO: suspender a un referidor retiene su crédito y
 * confirmar un fraude lo anula.
 *
 * No es `'use server'`: un archivo así convierte cada export en un endpoint.
 */

export interface ReferralAdminActor {
  userProfileId: string;
  email: string | null | undefined;
}

/** Acota lo que se copia a la bitácora de un id que escribió un atacante. */
function safeLogId(value: unknown): string | null {
  return typeof value === 'string' ? value.replace(/[^\w-]/g, '').slice(0, 40) : null;
}

export async function beginReferralAdminAction<T extends { reason: string }>(
  action: AdminAuditAction,
  schema: z.ZodType<T>,
  input: unknown
): Promise<
  | { ok: true; actor: ReferralAdminActor; data: T }
  | { ok: false; result: ActionResult<never> }
> {
  // 1. ROL — siempre primero, antes de mirar el input.
  const { profile, authUser } = await requireRole('ADMIN');
  const actor: ReferralAdminActor = { userProfileId: profile.id, email: authUser.email };

  const raw = (input ?? {}) as { referralId?: unknown; saleId?: unknown };
  const auditRejection = (reason: string | null, metadata: Record<string, unknown>) =>
    logAdminAction(action, actor, {
      targetKind: 'referral',
      reason,
      metadata: { ...metadata, targetId: safeLogId(raw.referralId ?? raw.saleId) },
      outcome: 'rejected',
    });

  // 2. COMPUERTA DE MAESTRO.
  const master = requireMasterAdmin(authUser.email);
  if (!master.ok) {
    await auditRejection(null, { denied: master.reason });
    return { ok: false, result: { ok: false, code: 'FORBIDDEN', message: MASTER_ADMIN_DENIED_MESSAGE } };
  }

  // 3. VALIDACIÓN.
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Datos inválidos.';
    await auditRejection(null, { denied: 'VALIDATION', message });
    return { ok: false, result: { ok: false, code: 'VALIDATION', message } };
  }

  // 4. LÍMITE DE TASA — compartido en Postgres, nunca el de memoria.
  const verdict = await consumeRateLimit('ADMIN_REFERRAL_ACTION', profile.id);
  if (!verdict.allowed) {
    await auditRejection(parsed.data.reason, { denied: 'RATE_LIMIT' });
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
