'use server';

import { z } from 'zod';
import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';
import * as simulatorDb from '@/lib/db/simulator';
import * as sessionsDb from '@/lib/db/sessions';
import { SessionError } from '@/lib/db/sessions';
import { consumeAll } from '@/lib/rate-limit/store';
import { currentClientIp } from '@/lib/rate-limit/request';
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

    // G67: arrancar un simulacro es la exposición de contenido más grande de
    // la app en una sola llamada (~120-140 reactivos completos). Por CUENTA
    // es defensa en profundidad (el candado real es que ahora CUALQUIER
    // intento gasta el "1 gratis", ver `countFullSimulationAttempts`); por IP
    // es la mitigación real contra una granja de cuentas gratuitas desde la
    // misma salida — ver docs/AUDITORIA_SEGURIDAD.md §17.4.
    const gate = await consumeAll([
      ['SIMULATION_START', profile.id],
      ['SIMULATION_START_IP', `ip:${await currentClientIp()}`],
    ]);
    if (!gate.allowed) {
      const minutos = Math.max(1, Math.ceil(gate.retryAfterSecs / 60));
      return {
        ok: false,
        code: 'RATE_LIMIT',
        message: `Demasiados intentos de simulacro seguidos. Espera ${minutos} minuto${minutos === 1 ? '' : 's'} y vuelve a intentar.`,
      };
    }

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
