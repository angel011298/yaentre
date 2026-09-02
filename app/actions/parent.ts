'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { AuthError } from '@/lib/auth/errors';
import { requireRole, requireUser } from '@/lib/auth/guards';
import {
  generateParentLinkCode,
  redeemParentLinkCode,
  unlinkParentStudent,
  type GeneratedLinkCode,
} from '@/lib/db/parent';
import { setNotificationPreference } from '@/lib/db/notifications';
import { consumeAll, consumeRateLimit } from '@/lib/rate-limit/store';
import { currentClientIp } from '@/lib/rate-limit/request';
import type { ActionResult } from '@/lib/sessions/schemas';

/**
 * Server Actions de vinculación parental (F16). Cada una exige el rol
 * correcto ANTES de tocar la DB: solo un STUDENT genera códigos, solo un
 * PARENT los canjea o toca sus propias preferencias de correo.
 *
 * G65 — este archivo es el que custodia el acceso a los datos de un MENOR, así
 * que lleva la protección contra abuso más estricta del proyecto (ver
 * `linkStudentAction`) y la desvinculación que el aviso de privacidad promete.
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
    const gate = await consumeRateLimit('PARENT_LINK_GENERATE', profile.id);
    if (!gate.allowed) {
      return {
        ok: false,
        code: 'RATE_LIMIT',
        message: 'Generaste muchos códigos seguidos. Espera unos minutos.',
      };
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

    // ── G65: el canje es el punto MÁS sensible de todo el producto ──────────
    // El código son 6 dígitos (10^6 combinaciones) con 10 minutos de vigencia.
    // Sin límite de intentos, un script puede barrer una fracción enorme de
    // ese espacio dentro de la ventana y quedarse con el tablero de un menor
    // sin haber hablado nunca con él. Con 6 intentos por tutor y 20 por IP en
    // esa misma ventana, la probabilidad por ventana queda en el orden de
    // 1 entre decenas de miles — y el atacante ya no puede iterar.
    //
    // Los dos presupuestos se consumen SIEMPRE (`consumeAll`): rotar de cuenta
    // de tutor no esquiva el presupuesto de IP, y rotar de IP no esquiva el de
    // la cuenta.
    const gate = await consumeAll([
      ['PARENT_LINK_REDEEM', profile.id],
      ['PARENT_LINK_REDEEM_IP', `ip:${await currentClientIp()}`],
    ]);
    if (!gate.allowed) {
      const minutos = Math.max(1, Math.ceil(gate.retryAfterSecs / 60));
      return {
        ok: false,
        code: 'RATE_LIMIT',
        message: `Demasiados intentos con códigos inválidos. Espera ${minutos} minuto${minutos === 1 ? '' : 's'} y pide uno nuevo a tu alumno.`,
      };
    }

    const result = await redeemParentLinkCode(profile.id, parsed.data.code);
    if (result === 'INVALID_CODE') {
      return {
        ok: false,
        code: 'INVALID_CODE',
        message: 'Código inválido o expirado. Pide uno nuevo a tu alumno.',
      };
    }

    revalidatePath('/tutor');
    return { ok: true, data: { linked: true } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

const unlinkSchema = z.object({ counterpartProfileId: z.string().min(1).max(64) });

/**
 * G65 — Desvinculación tutor ↔ alumno.
 *
 * El aviso de privacidad (§8) ya prometía que «si tu tutor se desvincula, sus
 * permisos se revocan inmediatamente», pero NO existía forma de desvincular:
 * un código compartido por error —o con la persona equivocada— era
 * irreversible salvo borrando la cuenta entera. Para una plataforma que trata
 * datos de menores eso no es un hueco de producto, es un incumplimiento del
 * propio aviso y del derecho de oposición de la LFPDPPP.
 *
 * Cualquiera de los DOS lados puede romper el vínculo, y cada uno solo puede
 * romper los suyos: `unlinkParentStudent` resuelve el rol del que llama y
 * borra la fila únicamente si ese perfil aparece en ella.
 */
export async function unlinkParentStudentAction(
  input: z.input<typeof unlinkSchema>
): Promise<ActionResult<{ unlinked: boolean }>> {
  try {
    const { profile } = await requireUser();
    const parsed = unlinkSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, code: 'VALIDATION', message: 'Vínculo inválido.' };
    }

    const removed = await unlinkParentStudent(profile.id, parsed.data.counterpartProfileId);
    if (!removed) {
      return { ok: false, code: 'NOT_FOUND', message: 'Ese vínculo ya no existe.' };
    }

    revalidatePath('/tutor');
    revalidatePath('/app/perfil');
    return { ok: true, data: { unlinked: true } };
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
