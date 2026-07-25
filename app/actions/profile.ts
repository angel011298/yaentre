'use server';

import { z } from 'zod';
import type { NotificationType } from '@prisma/client';
import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import {
  updateAvatarUrl,
  updateDisplayName,
  updateTargetCareer,
  updateThemePref,
} from '@/lib/db/profile';
import { setNotificationPreference } from '@/lib/db/notifications';
import type { ActionResult } from '@/lib/sessions/schemas';

/**
 * Server Actions de la pantalla de perfil (F17). Cada una: exige sesión,
 * valida con Zod, y delega en `src/lib/db/profile.ts` — mismo patrón que
 * `app/actions/parent.ts` (F16).
 */

function toError(err: unknown): { code: string; message: string } {
  if (err instanceof AuthError) return { code: err.code, message: err.message };
  return { code: 'UNKNOWN', message: 'Algo salió mal. Intenta de nuevo.' };
}

const displayNameSchema = z.object({
  displayName: z.string().trim().min(1, 'Escribe tu nombre.').max(60, 'Máximo 60 caracteres.'),
});

export async function updateDisplayNameAction(
  input: z.input<typeof displayNameSchema>
): Promise<ActionResult<{ displayName: string }>> {
  try {
    const { profile } = await requireUser();
    const parsed = displayNameSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, code: 'VALIDATION', message: parsed.error.issues[0]?.message ?? 'Nombre inválido.' };
    }
    await updateDisplayName(profile.id, parsed.data.displayName);
    return { ok: true, data: { displayName: parsed.data.displayName } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

const themeSchema = z.object({ theme: z.enum(['dark', 'light']) });

/** F17: persiste en `UserProfile.themePref` — antes solo vivía en localStorage. */
export async function updateThemeAction(
  input: z.input<typeof themeSchema>
): Promise<ActionResult<{ theme: 'dark' | 'light' }>> {
  try {
    const { profile } = await requireUser();
    const parsed = themeSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, code: 'VALIDATION', message: 'Tema inválido.' };
    }
    await updateThemePref(profile.id, parsed.data.theme);
    return { ok: true, data: { theme: parsed.data.theme } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

// El alumno solo controla SUS propias preferencias — PARENT_WEEKLY es del
// tutor (ya tiene su propio toggle en /tutor, F16); MARKETING no se expone
// todavía (sin campaña activa que la use, F19+).
const notificationSchema = z.object({
  type: z.enum(['STREAK_RISK', 'EXAM_COUNTDOWN']),
  enabled: z.boolean(),
});

export async function updateNotificationPrefAction(
  input: z.input<typeof notificationSchema>
): Promise<ActionResult<{ type: NotificationType; enabled: boolean }>> {
  try {
    const { profile } = await requireUser();
    const parsed = notificationSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, code: 'VALIDATION', message: 'Datos inválidos.' };
    }
    await setNotificationPreference(profile.id, parsed.data.type, parsed.data.enabled);
    return { ok: true, data: parsed.data };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

const careerSchema = z.object({ careerId: z.string().min(1) });

/** F17: cambiar la carrera meta — el hueco del Aciertómetro se recalcula
 *  solo (ver `updateTargetCareer`, no hace falta tocar `LearningProfile`). */
export async function updateTargetCareerAction(
  input: z.input<typeof careerSchema>
): Promise<ActionResult<{ careerId: string }>> {
  try {
    const { profile } = await requireUser();
    const parsed = careerSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, code: 'VALIDATION', message: 'Carrera inválida.' };
    }
    const result = await updateTargetCareer(profile.id, parsed.data.careerId);
    if (result === 'INVALID_CAREER') {
      return {
        ok: false,
        code: 'INVALID_CAREER',
        message: 'Esa carrera no está disponible para tu área.',
      };
    }
    return { ok: true, data: { careerId: parsed.data.careerId } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

const passwordSchema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

export async function changePasswordAction(
  input: z.input<typeof passwordSchema>
): Promise<ActionResult<{ changed: true }>> {
  try {
    await requireUser();
    const parsed = passwordSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, code: 'VALIDATION', message: parsed.error.issues[0]?.message ?? 'Contraseña inválida.' };
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) {
      return {
        ok: false,
        code: 'AUTH',
        message: 'No pudimos actualizar tu contraseña. Intenta de nuevo.',
      };
    }
    return { ok: true, data: { changed: true } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

const avatarSchema = z.object({ avatarUrl: z.string().url() });

/** Solo acepta URLs de NUESTRO bucket de Storage — nunca una imagen
 *  arbitraria inyectada saltándose el flujo real de subida (F17 tarea 2). */
function isOwnAvatarUrl(url: string): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(supabaseUrl) && url.startsWith(`${supabaseUrl}/storage/v1/object/public/avatars/`);
}

export async function updateAvatarAction(
  input: z.input<typeof avatarSchema>
): Promise<ActionResult<{ avatarUrl: string }>> {
  try {
    const { profile } = await requireUser();
    const parsed = avatarSchema.safeParse(input);
    if (!parsed.success || !isOwnAvatarUrl(parsed.data.avatarUrl)) {
      return { ok: false, code: 'VALIDATION', message: 'Imagen inválida.' };
    }
    await updateAvatarUrl(profile.id, parsed.data.avatarUrl);
    return { ok: true, data: { avatarUrl: parsed.data.avatarUrl } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}
