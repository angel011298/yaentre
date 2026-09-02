'use server';

import { z } from 'zod';
import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';
import * as drillDb from '@/lib/db/drill';
import { consumeRateLimit } from '@/lib/rate-limit/store';
import type { ActionResult } from '@/lib/sessions/schemas';
import type { DrillPayload, ExplanationLayerContent } from '@/lib/db/drill';

/**
 * Server Actions de la práctica libre (F14). Mismo patrón que simulator.ts/
 * sessions.ts: exigen usuario, validan con Zod, delegan en la capa DB pasando
 * el `userProfileId`/`authUser.id` del guard (nunca del cliente), y devuelven
 * un `ActionResult` para no propagar stack traces al borde cliente/servidor.
 */

function toError(err: unknown): { code: string; message: string } {
  if (err instanceof z.ZodError) return { code: 'VALIDATION', message: 'Datos inválidos.' };
  if (err instanceof AuthError) return { code: err.code, message: err.message };
  return { code: 'UNKNOWN', message: 'Algo salió mal. Intenta de nuevo.' };
}

const START_MESSAGES: Record<drillDb.DrillStartError, string> = {
  NO_TARGET: 'Primero elige tu examen y carrera para practicar.',
  NO_CONTENT: 'Aún no tenemos reactivos verificados para esa selección.',
  PAYWALL: 'Llegaste a tu práctica gratis de hoy. Vuelve mañana o desbloquea ilimitado.',
};

const scopeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('area') }),
  z.object({ kind: z.literal('subject'), subjectId: z.string().min(1) }),
  z.object({ kind: z.literal('topic'), topicId: z.string().min(1) }),
]);

export async function startDrillAction(
  input: z.input<typeof scopeSchema>
): Promise<ActionResult<DrillPayload>> {
  try {
    const { profile } = await requireUser();
    const scope = scopeSchema.parse(input);
    const result = await drillDb.startDrillSession(profile.id, scope);
    if (result.ok) return { ok: true, data: result.payload };
    return {
      ok: false,
      code: result.code,
      message: START_MESSAGES[result.code],
      ...(result.trigger ? { trigger: result.trigger } : {}),
    };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

const revealLayerSchema = z.object({
  questionId: z.string().min(1),
  layer: z.number().int().min(1).max(4),
});

const REVEAL_MESSAGES: Record<drillDb.RevealLayerError, string> = {
  NOT_FOUND: 'Todavía no tenemos esta explicación para este reactivo.',
  PAYWALL: 'Esta capa de explicación es parte de los planes de pago.',
  // G65: no se explica un reactivo que sigue abierto en un examen. El mensaje
  // dice qué falta, no que "no tienes permiso" — el camino para verlo existe.
  NOT_ANSWERED: 'Responde este reactivo para ver su explicación.',
};

export async function revealExplanationLayerAction(
  input: z.input<typeof revealLayerSchema>
): Promise<ActionResult<ExplanationLayerContent>> {
  try {
    const { profile } = await requireUser();
    const parsed = revealLayerSchema.parse(input);
    const result = await drillDb.revealExplanationLayer(profile.id, parsed.questionId, parsed.layer);
    if (result.ok) return { ok: true, data: result.data };
    return {
      ok: false,
      code: result.code,
      message: REVEAL_MESSAGES[result.code],
      ...(result.trigger ? { trigger: result.trigger } : {}),
    };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

const reportQuestionSchema = z.object({
  questionId: z.string().min(1),
  reason: z.string().trim().max(500).optional(),
});

export async function reportQuestionAction(
  input: z.input<typeof reportQuestionSchema>
): Promise<ActionResult<{ reported: true }>> {
  try {
    const { authUser, profile } = await requireUser();
    const parsed = reportQuestionSchema.parse(input);
    // G65: `reportQuestion` ya es idempotente por (reactivo, usuario) desde
    // G60, pero nada impedía recorrer el banco entero reportando un reactivo
    // distinto en cada llamada y llenar la cola del admin.
    const gate = await consumeRateLimit('QUESTION_REPORT', profile.id);
    if (!gate.allowed) {
      return {
        ok: false,
        code: 'RATE_LIMIT',
        message: 'Reportaste muchos reactivos seguidos. Intenta de nuevo más tarde.',
      };
    }
    await drillDb.reportQuestion(authUser.id, parsed.questionId, parsed.reason || null);
    return { ok: true, data: { reported: true } };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}
