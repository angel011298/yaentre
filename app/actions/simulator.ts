'use server';

import { z } from 'zod';
import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';
import * as simulatorDb from '@/lib/db/simulator';
import * as sessionsDb from '@/lib/db/sessions';
import { SessionError } from '@/lib/db/sessions';
import type { ActionResult } from '@/lib/sessions/schemas';
import type { SimulatorPayload } from '@/lib/db/simulator';
import type { Celebration } from '@/lib/gamification/celebrations';

/**
 * Server Actions del simulador (F12). El muro suave (F9) y el scoring
 * server-side se reusan del motor de sesiones — aquí solo se exige usuario,
 * se valida el input y se devuelve un ActionResult (nunca se propagan stack
 * traces al cliente).
 */

function toError(err: unknown): { code: string; message: string } {
  if (err instanceof z.ZodError) return { code: 'VALIDATION', message: 'Datos inválidos.' };
  if (err instanceof SessionError || err instanceof AuthError) {
    return { code: err.code, message: err.message };
  }
  return { code: 'UNKNOWN', message: 'Algo salió mal. Intenta de nuevo.' };
}

const START_MESSAGES: Record<simulatorDb.SimulatorStartError, string> = {
  NO_TARGET: 'Primero elige tu examen y carrera para hacer un simulacro.',
  NO_CONTENT: 'Aún no tenemos suficientes reactivos verificados para tu área.',
  EXAM_NOT_AVAILABLE: 'Este examen no está disponible por ahora.',
  PAYWALL: 'Ya usaste tu simulacro completo gratis. Desbloquea los ilimitados.',
};

export async function startSimulationAction(): Promise<ActionResult<SimulatorPayload>> {
  try {
    const { profile } = await requireUser();
    const result = await simulatorDb.startSimulation(profile.id);
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

const finishSchema = z.object({
  sessionId: z.string().min(1),
  reason: z.enum(['USER', 'TIMEOUT']).optional(),
});

/**
 * Cierra el simulacro: el servidor calcula el score y valida el tiempo real
 * (marca TIME_EXCEEDED si el reloj del cliente fue manipulado) vía el mismo
 * `finishSession` del motor de sesiones, que además dispara el recálculo
 * adaptativo (temas débiles, Entrómetro, racha). Devuelve solo lo mínimo
 * para navegar a resultados.
 */
export async function finishSimulationAction(
  input: z.input<typeof finishSchema>
): Promise<ActionResult<{ sessionId: string; status: string; celebration: Celebration | null }>> {
  try {
    const { profile } = await requireUser();
    const parsed = finishSchema.parse(input);
    const result = await sessionsDb.finishSession({
      userProfileId: profile.id,
      sessionId: parsed.sessionId,
      reason: parsed.reason,
    });
    return {
      ok: true,
      data: { sessionId: parsed.sessionId, status: result.status, celebration: result.celebration },
    };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}
