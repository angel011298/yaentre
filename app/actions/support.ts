'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/lib/admin/schemas';
import { AuthError } from '@/lib/auth/errors';
import { issueRefundForSupport, opposeMarketingForSupport } from '@/lib/support/service';

/**
 * Server Actions de SOPORTE — Bloque 3. Envoltorios delgados sobre
 * `src/lib/support/service.ts`, donde viven las cuatro condiciones de la excepción
 * autorizada de G99 (guard por capacidad dentro de la acción, id validado como
 * cuid, bitácora antes de responder —también al rechazar—, límite de tasa
 * compartido) y las reglas de la válvula de reembolso.
 *
 * ⚠️ Un layout NO protege una Server Action: cada una es su propio endpoint. La
 * primera línea que protege está en el servicio, no en `app/soporte/layout.tsx`.
 *
 * Verificado con la matriz de `tests/support/authz.test.ts`, que incluye el hecho
 * de que estas acciones se alcanzan con un `fetch` sin renderizar ningún layout.
 */

async function guarded<T>(path: string, run: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    const result = await run();
    if (result.ok) revalidatePath(path);
    return result;
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, code: err.code, message: err.message };
    throw err;
  }
}

export async function issueRefundAction(input: unknown) {
  return guarded('/soporte', () => issueRefundForSupport(input));
}

export async function opposeMarketingAction(input: unknown) {
  return guarded('/soporte', () => opposeMarketingForSupport(input));
}
