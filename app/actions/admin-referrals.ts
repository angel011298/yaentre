'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/lib/admin/schemas';
import { AuthError } from '@/lib/auth/errors';
import {
  reinstateReferralAdmin,
  resolveFlagAdmin,
  suspendReferralAdmin,
} from '@/lib/referrals/admin-service';

/**
 * Server Actions de administración de REFERIDOS — Bloque 3. Envoltorios delgados
 * sobre `src/lib/referrals/admin-service.ts`, donde viven las cuatro condiciones
 * de la excepción autorizada de G99 y la compuerta de admin maestro.
 *
 * ⚠️ Un layout NO protege una Server Action: cada una es su propio endpoint. La
 * primera línea que protege está en el servicio, no en `app/admin/layout.tsx`.
 */

async function guarded<T>(run: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    const result = await run();
    if (result.ok) revalidatePath('/admin/referidos');
    return result;
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, code: err.code, message: err.message };
    throw err;
  }
}

export async function suspendReferralAction(input: unknown) {
  return guarded(() => suspendReferralAdmin(input));
}

export async function reinstateReferralAction(input: unknown) {
  return guarded(() => reinstateReferralAdmin(input));
}

export async function resolveReferralFlagAction(input: unknown) {
  return guarded(() => resolveFlagAdmin(input));
}
