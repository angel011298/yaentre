'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/lib/admin/schemas';
import { AuthError } from '@/lib/auth/errors';
import {
  approveTeacherAdmin,
  reactivateTeacherAdmin,
  suspendTeacherAdmin,
} from '@/lib/teachers/admin-service';

/**
 * Server Actions de administración de PROFESORES — Bloque 2. Envoltorios delgados
 * sobre `src/lib/teachers/admin-service.ts`, donde viven las cuatro condiciones
 * de la excepción autorizada de G99 (rol ADMIN dentro de la acción, id validado
 * como cuid, bitácora antes de responder —también al rechazar—, límite de tasa
 * compartido) y la compuerta de admin maestro.
 *
 * ⚠️ Un layout NO protege una Server Action: cada una es su propio endpoint. La
 * primera línea que protege está en el servicio, no en `app/admin/layout.tsx`.
 */

async function guarded<T>(run: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    const result = await run();
    if (result.ok) revalidatePath('/admin/profesores');
    return result;
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, code: err.code, message: err.message };
    throw err;
  }
}

export async function approveTeacherAction(input: unknown) {
  return guarded(() => approveTeacherAdmin(input));
}

export async function suspendTeacherAction(input: unknown) {
  return guarded(() => suspendTeacherAdmin(input));
}

export async function reactivateTeacherAction(input: unknown) {
  return guarded(() => reactivateTeacherAdmin(input));
}
