import { z } from 'zod';
import { logAdminAction, type AdminAuditAction } from '@/lib/admin/audit-log';
import type { Capability } from '@/lib/admin/capabilities';
import type { ActionResult } from '@/lib/admin/schemas';
import { requireCapability } from '@/lib/auth/guards';
import { consumeRateLimit, type RateLimitName } from '@/lib/rate-limit/store';

/**
 * Preámbulo COMÚN de las acciones y rutas de SOPORTE — Bloque 3. Reproduce, en el
 * mismo orden, las cuatro condiciones de la excepción autorizada de G99
 * (CLAUDE.md), porque estas acciones reciben a quién afectan y no pueden derivarlo
 * del guard:
 *
 *   1. el guard DENTRO de la acción —`requireCapability(...)`, porque las hace el
 *      rol SUPPORT y no solo ADMIN— y siempre antes de mirar el input;
 *   2. el id entra validado como cuid por un esquema Zod;
 *   3. la bitácora se escribe ANTES de responder —también al RECHAZAR—;
 *   4. pasa por `consumeRateLimit` (contador compartido de Postgres).
 *
 * No es `'use server'`: un archivo así convierte cada export en un endpoint.
 */

export interface SupportActor {
  userProfileId: string;
  email: string | null | undefined;
  role: string;
}

function safeLogId(value: unknown): string | null {
  return typeof value === 'string' ? value.replace(/[^\w-]/g, '').slice(0, 40) : null;
}

export async function beginSupportAction<T extends object>(opts: {
  capability: Capability;
  action: AdminAuditAction;
  schema: z.ZodType<T>;
  input: unknown;
  rateLimit: RateLimitName;
  targetKind: 'user' | 'payment';
}): Promise<
  | { ok: true; actor: SupportActor; data: T }
  | { ok: false; result: ActionResult<never> }
> {
  // 1. GUARD — siempre primero.
  const { profile, authUser } = await requireCapability(opts.capability);
  const actor: SupportActor = { userProfileId: profile.id, email: authUser.email, role: profile.role };

  const raw = (opts.input ?? {}) as { userProfileId?: unknown; subscriptionId?: unknown };
  const auditRejection = (reason: string | null, metadata: Record<string, unknown>) =>
    logAdminAction(opts.action, actor, {
      targetKind: opts.targetKind,
      reason,
      metadata: { ...metadata, targetId: safeLogId(raw.userProfileId ?? raw.subscriptionId) },
      outcome: 'rejected',
    });

  // 2. VALIDACIÓN.
  const parsed = opts.schema.safeParse(opts.input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Datos inválidos.';
    await auditRejection(null, { denied: 'VALIDATION', message });
    return { ok: false, result: { ok: false, code: 'VALIDATION', message } };
  }

  // 3. LÍMITE DE TASA — compartido en Postgres, nunca el de memoria.
  const verdict = await consumeRateLimit(opts.rateLimit, profile.id);
  if (!verdict.allowed) {
    await auditRejection((parsed.data as { reason?: string }).reason ?? null, { denied: 'RATE_LIMIT' });
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
