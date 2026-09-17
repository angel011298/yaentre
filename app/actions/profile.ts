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
import { MAX_PASSWORD_LENGTH } from '@/lib/auth/schemas';
import { verifyPassword } from '@/lib/auth/verify-password';
import { consumeRateLimit } from '@/lib/rate-limit/store';
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
// tutor (ya tiene su propio toggle en /tutor, F16).
//
// G98: MARKETING se añade a la lista. Ya es opt-in (sin fila = apagado, ver
// `src/lib/notifications/preferences.ts`) y se acepta explícitamente desde
// «Avísame cuando abra» en /paywall; este interruptor es el otro lado del
// trato — quien lo aceptó tiene que poder retirarlo desde su perfil, no solo
// desde el enlace de baja de un correo que quizá nunca llegue.
//
// El dueño del recurso sale SIEMPRE del guard (`requireUser`), nunca del
// input: no hay ningún `userProfileId` en este esquema (guardrail de CLAUDE.md,
// verificado por `pnpm security:authz`).
const notificationSchema = z.object({
  type: z.enum(['STREAK_RISK', 'EXAM_COUNTDOWN', 'MARKETING']),
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

/** F17: cambiar la carrera meta — el hueco del Entrómetro se recalcula
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
  currentPassword: z.string().min(1, 'Escribe tu contraseña actual.').max(1024),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(MAX_PASSWORD_LENGTH, `La contraseña no puede pasar de ${MAX_PASSWORD_LENGTH} caracteres.`),
});

/**
 * G65 — ahora exige la contraseña ACTUAL.
 *
 * Antes bastaba con tener la sesión abierta. Eso convierte cualquier sesión
 * prestada o secuestrada (una laptop compartida en casa, una preparatoria, una
 * cookie robada) en una toma de control permanente de la cuenta: el atacante
 * cambia la contraseña y el dueño queda fuera. Re-autenticar antes de una
 * operación así es el patrón estándar y es la única fricción del flujo.
 *
 * La comprobación se hace contra Supabase Auth porque el hash no es nuestro,
 * pero con un cliente EFÍMERO (`verifyPassword`) y no con el de la petición:
 * verificar sobre el cliente que sostiene la sesión la corrompe a media acción
 * (ver `src/lib/auth/verify-password.ts`, con el error exacto que provocó).
 *
 * Ojo con el orden: el límite de tasa va ANTES de la comprobación — si no,
 * este campo se convierte en un oráculo para adivinar la contraseña actual sin
 * pasar por la pantalla de login.
 */
export async function changePasswordAction(
  input: z.input<typeof passwordSchema>
): Promise<ActionResult<{ changed: true }>> {
  try {
    const { authUser, profile } = await requireUser();
    const parsed = passwordSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, code: 'VALIDATION', message: parsed.error.issues[0]?.message ?? 'Contraseña inválida.' };
    }

    const gate = await consumeRateLimit('PASSWORD_CHANGE', profile.id);
    if (!gate.allowed) {
      return {
        ok: false,
        code: 'RATE_LIMIT',
        message: 'Demasiados intentos. Espera unos minutos y vuelve a intentar.',
      };
    }

    if (!authUser.email) {
      return { ok: false, code: 'AUTH', message: 'No pudimos identificar tu cuenta.' };
    }

    const correcta = await verifyPassword(authUser.email, parsed.data.currentPassword);
    if (!correcta) {
      return { ok: false, code: 'BAD_CURRENT_PASSWORD', message: 'Tu contraseña actual no coincide.' };
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

const avatarSchema = z.object({ avatarUrl: z.string().url().max(2048) });

/**
 * Solo acepta URLs de NUESTRO bucket de Storage, y dentro de la carpeta del
 * PROPIO usuario (F17 tarea 2; ownership reforzado en F22) — la carpeta raíz
 * del path es siempre `auth.uid()` por convención del bucket (mismo criterio
 * que las políticas RLS de `storage.objects`, migración 0008). Sin este
 * segundo chequeo, un usuario podía apuntar su perfil a la foto de OTRO
 * usuario (URL válida del bucket, pero de una carpeta ajena) — no expone
 * datos sensibles (los avatares ya son públicos), pero rompe la garantía de
 * "esta foto es la que tú subiste".
 */
function isOwnAvatarUrl(url: string, authUserId: string): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;
  const prefix = `${supabaseUrl}/storage/v1/object/public/avatars/${authUserId}/`;
  return url.startsWith(prefix);
}

export async function updateAvatarAction(
  input: z.input<typeof avatarSchema>
): Promise<ActionResult<{ avatarUrl: string }>> {
  try {
    const { authUser, profile } = await requireUser();
    const parsed = avatarSchema.safeParse(input);
    if (!parsed.success || !isOwnAvatarUrl(parsed.data.avatarUrl, authUser.id)) {
      return { ok: false, code: 'VALIDATION', message: 'Imagen inválida.' };
    }
    await updateAvatarUrl(profile.id, parsed.data.avatarUrl);
    return { ok: true, data: { avatarUrl: parsed.data.avatarUrl } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

/** Formatos aceptados para la foto de perfil, con su extensión canónica. */
const AVATAR_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/**
 * G65 — La subida del avatar se movió del navegador al servidor.
 *
 * Antes el cliente hacía `supabase.storage.from('avatars').upload(...)`
 * directamente, y ése era el ÚNICO motivo por el que la cookie de sesión tenía
 * que ser legible desde JavaScript (`httpOnly: false`) — a cambio de que
 * cualquier XSS se llevara un refresh token de 400 días. Cambiar una cosa
 * exigía la otra; ver `src/lib/auth/cookie-options.ts`.
 *
 * El archivo viaja por el Server Action y se sube con el cliente de servidor,
 * que lleva la sesión del usuario: las políticas RLS de `storage.objects`
 * (migración 0008, carpeta = `auth.uid()`) siguen siendo las que autorizan la
 * escritura — no se usa la llave de servicio. Aquí se añade lo que el camino
 * directo no podía comprobar: tipo declarado contra lista blanca, extensión
 * derivada del TIPO (nunca del nombre que mandó el cliente) y tope de tamaño.
 */
export async function uploadAvatarAction(
  formData: FormData
): Promise<ActionResult<{ avatarUrl: string }>> {
  try {
    const { authUser, profile } = await requireUser();

    const file = formData.get('file');
    if (!(file instanceof File)) {
      return { ok: false, code: 'VALIDATION', message: 'No recibimos ninguna imagen.' };
    }

    const ext = AVATAR_TYPES[file.type];
    if (!ext) {
      return { ok: false, code: 'VALIDATION', message: 'Usa una imagen JPG, PNG o WebP.' };
    }
    if (file.size === 0 || file.size > MAX_AVATAR_BYTES) {
      return { ok: false, code: 'VALIDATION', message: 'La imagen debe pesar menos de 2 MB.' };
    }

    // La carpeta es SIEMPRE el uid de Auth: es la convención que hace
    // cumplibles las políticas del bucket, y nada de lo que manda el cliente
    // participa en el path.
    const path = `${authUser.id}/avatar.${ext}`;

    const supabase = await createSupabaseServerClient();
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type });
    if (uploadError) {
      console.error('[profile] No se pudo subir el avatar', uploadError);
      return { ok: false, code: 'STORAGE', message: 'No pudimos subir tu foto. Intenta de nuevo.' };
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    // Cache-bust: el nombre no cambia entre subidas, así que sin esto el
    // navegador seguiría mostrando la foto anterior desde su propia caché.
    const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;

    await updateAvatarUrl(profile.id, avatarUrl);
    return { ok: true, data: { avatarUrl } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}
