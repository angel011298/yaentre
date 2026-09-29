'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { AuthError } from '@/lib/auth/errors';
import { requireTeacher, requireVerifiedUser } from '@/lib/auth/guards';
import type { ActionState } from '@/lib/auth/types';
import { MarketplaceError } from '@/lib/classes/errors';
import { setOwnActive } from '@/lib/db/teachers';
import { applicationFromFormData, updateFromFormData } from '@/lib/teachers/form';
import {
  parseTeacherApplication,
  parseTeacherUpdate,
  patchOwnTeacher,
  submitTeacherApplication,
  uploadCsf,
  type TeacherActor,
} from '@/lib/teachers/service';
import type { ActionResult } from '@/lib/sessions/schemas';

/**
 * Server Actions del PROFESOR — Bloque 2 (spec §3). Reglas de esta capa:
 *
 *  · El profesor sale SIEMPRE del guard (`requireTeacher`/`requireVerifiedUser`),
 *    nunca de un campo del formulario. Ninguna acción acepta el id de un
 *    profesor ni el de una persona.
 *  · Cada acción es su propio endpoint (se alcanza con un `fetch` a su ruta), así
 *    que cada una verifica su guard por su cuenta.
 *  · La validación y las reglas de negocio viven en `src/lib/teachers/service.ts`,
 *    compartido con los Route Handlers de `/api/teachers/*`.
 */

function actorFrom(result: {
  authUser: { id: string; email?: string | null };
  profile: { id: string };
}): TeacherActor {
  return { userProfileId: result.profile.id, authUserId: result.authUser.id, email: result.authUser.email };
}

function messageOf(err: unknown): string {
  if (err instanceof MarketplaceError || err instanceof AuthError) return err.message;
  console.error('[teachers] error inesperado', err);
  return 'Algo salió mal. Intenta de nuevo en un momento.';
}

// ─────────────────────────────── Constancia (CSF) ───────────────────────────────

/**
 * Sube la CSF y devuelve su ruta en el bucket privado. Se llama al ELEGIR el
 * archivo, antes de enviar la solicitud, para que el envío final solo lleve la
 * ruta y no un PDF dentro de un formulario con datos financieros.
 */
export async function uploadCsfAction(formData: FormData): Promise<ActionResult<{ path: string }>> {
  try {
    const ctx = await requireVerifiedUser();
    const file = formData.get('csf');
    if (!(file instanceof File)) {
      return { ok: false, code: 'VALIDATION', message: 'Selecciona tu constancia en PDF.' };
    }
    const { path } = await uploadCsf(actorFrom(ctx), file);
    return { ok: true, data: { path } };
  } catch (err) {
    const code = err instanceof MarketplaceError ? err.code : err instanceof AuthError ? err.code : 'UNKNOWN';
    return { ok: false, code, message: messageOf(err) };
  }
}

// ─────────────────────────────── Solicitud ───────────────────────────────

export async function applyTeacherAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let ctx;
  try {
    ctx = await requireVerifiedUser();
  } catch (err) {
    return { status: 'error', message: messageOf(err) };
  }

  const parsed = parseTeacherApplication(applicationFromFormData(formData), new Date());
  if (!parsed.ok) {
    return { status: 'error', message: parsed.message, fieldErrors: parsed.fieldErrors };
  }

  try {
    await submitTeacherApplication(actorFrom(ctx), parsed.data);
  } catch (err) {
    return { status: 'error', message: messageOf(err) };
  }

  // `redirect` lanza: va FUERA del try/catch para que no lo trague.
  redirect('/profesor?solicitud=enviada');
}

// ─────────────────────────────── Actualización ───────────────────────────────

export async function updateTeacherProfileAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let ctx;
  try {
    ctx = await requireTeacher(['PENDING_REVIEW', 'ACTIVE', 'INACTIVE']);
  } catch (err) {
    return { status: 'error', message: messageOf(err) };
  }

  const parsed = parseTeacherUpdate(updateFromFormData(formData));
  if (!parsed.ok) {
    return { status: 'error', message: parsed.message, fieldErrors: parsed.fieldErrors };
  }

  try {
    const { clabeChanged } = await patchOwnTeacher(actorFrom(ctx), ctx.teacher, parsed.data);
    revalidatePath('/profesor');
    return {
      status: 'success',
      message: clabeChanged
        ? 'Guardamos tus cambios. Te enviamos un correo para confirmar el cambio de tu cuenta.'
        : 'Guardamos tus cambios.',
    };
  } catch (err) {
    return { status: 'error', message: messageOf(err) };
  }
}

const visibilitySchema = z.object({ active: z.boolean() });

/** Pausa o reanuda la visibilidad en el directorio. Solo entre ACTIVE e INACTIVE. */
export async function setTeacherVisibilityAction(input: unknown): Promise<ActionResult<{ active: boolean }>> {
  try {
    const { teacher } = await requireTeacher(['ACTIVE', 'INACTIVE']);
    const parsed = visibilitySchema.safeParse(input);
    if (!parsed.success) return { ok: false, code: 'VALIDATION', message: 'Solicitud inválida.' };
    await setOwnActive(teacher.id, parsed.data.active);
    revalidatePath('/profesor');
    return { ok: true, data: { active: parsed.data.active } };
  } catch (err) {
    const code = err instanceof MarketplaceError ? err.code : err instanceof AuthError ? err.code : 'UNKNOWN';
    return { ok: false, code, message: messageOf(err) };
  }
}
