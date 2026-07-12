'use server';

import { z } from 'zod';
import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';
import * as sessionsDb from '@/lib/db/sessions';
import { SessionError } from '@/lib/db/sessions';
import type { FinishSessionResult } from '@/lib/db/sessions';
import {
  finishSessionSchema,
  startSessionSchema,
  submitAnswerSchema,
  type ActionResult,
} from '@/lib/sessions/schemas';
import type { SubmitResponse } from '@/lib/sessions/scoring';

/**
 * Server Actions del motor de sesiones. Cada una: (1) exige usuario, (2) valida
 * el input con Zod, (3) delega en la capa DB pasando el userProfileId del guard
 * (nunca del cliente). Los errores se devuelven como ActionResult para no
 * filtrar stack traces por el borde servidor/cliente.
 */

function toError(err: unknown): { code: string; message: string } {
  if (err instanceof z.ZodError) {
    return { code: 'VALIDATION', message: 'Datos inválidos.' };
  }
  if (err instanceof SessionError || err instanceof AuthError) {
    return { code: err.code, message: err.message };
  }
  return { code: 'UNKNOWN', message: 'Algo salió mal. Intenta de nuevo.' };
}

export async function startSession(
  input: z.input<typeof startSessionSchema>
): Promise<ActionResult<{ sessionId: string; timeLimitSecs: number; startedAt: string }>> {
  try {
    const { profile } = await requireUser();
    const parsed = startSessionSchema.parse(input);
    const session = await sessionsDb.startSession({ userProfileId: profile.id, ...parsed });
    return {
      ok: true,
      data: {
        sessionId: session.id,
        timeLimitSecs: session.timeLimitSecs,
        startedAt: session.startedAt.toISOString(),
      },
    };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

export async function submitAnswer(
  input: z.input<typeof submitAnswerSchema>
): Promise<ActionResult<SubmitResponse>> {
  try {
    const { profile } = await requireUser();
    const parsed = submitAnswerSchema.parse(input);
    const result = await sessionsDb.submitAnswer({ userProfileId: profile.id, ...parsed });
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}

export async function finishSession(
  input: z.input<typeof finishSessionSchema>
): Promise<ActionResult<FinishSessionResult>> {
  try {
    const { profile } = await requireUser();
    const parsed = finishSessionSchema.parse(input);
    const result = await sessionsDb.finishSession({ userProfileId: profile.id, ...parsed });
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, ...toError(err) };
  }
}
