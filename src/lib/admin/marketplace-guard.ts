import { z } from 'zod';
import { requireRole } from '@/lib/auth/guards';
import { consumeRateLimit } from '@/lib/rate-limit/store';
import { logAdminAction, type AdminAuditAction } from './audit-log';
import { MASTER_ADMIN_DENIED_MESSAGE, requireMasterAdmin } from './master';
import type { ActionResult } from './schemas';

/**
 * Preámbulo COMÚN de las acciones y rutas de administración del marketplace —
 * Bloque 2. Reproduce, en el mismo orden, las cuatro condiciones de la
 * excepción autorizada de G99 (CLAUDE.md), porque estas acciones también
 * reciben a quién afectan (un `teacherId`) y por tanto no pueden derivarlo del
 * guard:
 *
 *   1. `requireRole('ADMIN')` DENTRO de la acción (un layout no protege una
 *      Server Action ni un Route Handler: cada uno es su propio endpoint);
 *   2. el id entra validado como cuid por un esquema Zod;
 *   3. la bitácora se escribe ANTES de responder —también al RECHAZAR—;
 *   4. pasa por `consumeRateLimit` (contador compartido de Postgres).
 *
 * Además, las operaciones que cambian el estado de un profesor o exponen su
 * CURP/CLABE exigen ADMIN MAESTRO (`MASTER_ADMIN_EMAILS`): ver los datos
 * financieros de una persona y decidir si puede cobrar son de la misma clase
 * que regalar un plan o cambiar un rol.
 *
 * Vive en su propio módulo —y no dentro del archivo de acciones— porque un
 * archivo `'use server'` solo puede exportar funciones async: cada export se
 * convierte en un endpoint invocable con un `fetch`.
 */

export interface MarketplaceAdminActor {
  userProfileId: string;
  email: string | null | undefined;
}

/** Acota lo que se copia a la bitácora de un id que escribió un atacante: sin saltos de línea ni longitud arbitraria. */
function safeLogId(value: unknown): string | null {
  return typeof value === 'string' ? value.replace(/[^\w-]/g, '').slice(0, 40) : null;
}

export async function beginMarketplaceAdminAction<T extends { teacherId: string }>(
  action: AdminAuditAction,
  schema: z.ZodType<T>,
  input: unknown,
  opts: { requireMaster: boolean }
): Promise<
  | { ok: true; actor: MarketplaceAdminActor; data: T }
  | { ok: false; result: ActionResult<never> }
> {
  // 1. ROL — siempre primero, antes de mirar el input.
  const { profile, authUser } = await requireRole('ADMIN');
  const actor: MarketplaceAdminActor = { userProfileId: profile.id, email: authUser.email };

  const auditRejection = (reason: string | null, metadata: Record<string, unknown>) =>
    logAdminAction(action, actor, {
      targetKind: 'teacher',
      reason,
      metadata: { ...metadata, teacherId: safeLogId((input as { teacherId?: unknown })?.teacherId) },
      outcome: 'rejected',
    });

  // 2. COMPUERTA DE MAESTRO.
  if (opts.requireMaster) {
    const verdict = requireMasterAdmin(authUser.email);
    if (!verdict.ok) {
      await auditRejection(null, { denied: verdict.reason });
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
    await auditRejection(null, { denied: 'VALIDATION', message });
    return { ok: false, result: { ok: false, code: 'VALIDATION', message } };
  }

  // 4. LÍMITE DE TASA — compartido en Postgres, nunca el de memoria.
  const verdict = await consumeRateLimit('ADMIN_MARKETPLACE_ACTION', profile.id);
  if (!verdict.allowed) {
    await auditRejection(
      (parsed.data as { reason?: string }).reason ?? null,
      { denied: 'RATE_LIMIT' }
    );
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
