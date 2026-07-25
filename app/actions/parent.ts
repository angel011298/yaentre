'use server';

import { z } from 'zod';
import { AuthError } from '@/lib/auth/errors';
import { requireRole, requireUser } from '@/lib/auth/guards';
import {
  generateParentLinkCode,
  redeemParentLinkCode,
  type GeneratedLinkCode,
} from '@/lib/db/parent';
import { setNotificationPreference } from '@/lib/db/notifications';
import type { ActionResult } from '@/lib/sessions/schemas';

/**
 * Server Actions de vinculación parental (F16). Cada una exige el rol
 * correcto ANTES de tocar la DB: solo un STUDENT genera códigos, solo un
 * PARENT los canjea o toca sus propias preferencias de correo.
 */

function toError(err: unknown): { code: string; message: string } {
  if (err instanceof AuthError) return { code: err.code, message: err.message };
  return { code: 'UNKNOWN', message: 'Algo salió mal. Intenta de nuevo.' };
}

export async function generateLinkCodeAction(): Promise<ActionResult<GeneratedLinkCode>> {
  try {
    const { profile } = await requireUser();
    if (profile.role !== 'STUDENT') {
      return { ok: false, code: 'FORBIDDEN', message: 'Solo un alumno puede generar este código.' };
    }
    const result = await generateParentLinkCode(profile.id);
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

const linkSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'El código debe tener 6 dígitos.'),
});

export async function linkStudentAction(
  input: z.input<typeof linkSchema>
): Promise<ActionResult<{ linked: true }>> {
  try {
    const { profile } = await requireRole('PARENT');
    const parsed = linkSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, code: 'VALIDATION', message: 'Ingresa los 6 dígitos del código.' };
    }

    const result = await redeemParentLinkCode(profile.id, parsed.data.code);
    if (result === 'INVALID_CODE') {
      return {
        ok: false,
        code: 'INVALID_CODE',
        message: 'Código inválido o expirado. Pide uno nuevo a tu alumno.',
      };
    }

    return { ok: true, data: { linked: true } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

const toggleWeeklySchema = z.object({ enabled: z.boolean() });

export async function toggleWeeklyEmailAction(
  input: z.input<typeof toggleWeeklySchema>
): Promise<ActionResult<{ enabled: boolean }>> {
  try {
    const { profile } = await requireRole('PARENT');
    const parsed = toggleWeeklySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, code: 'VALIDATION', message: 'Valor inválido.' };
    }
    await setNotificationPreference(profile.id, 'PARENT_WEEKLY', parsed.data.enabled);
    return { ok: true, data: { enabled: parsed.data.enabled } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}
