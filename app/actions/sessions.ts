'use server';

import { z } from 'zod';
import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';
import * as sessionsDb from '@/lib/db/sessions';
import { SessionError } from '@/lib/db/sessions';
import type { FinishSessionResult } from '@/lib/db/sessions';
import {
  finishSessionSchema,
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

/**
 * G65 — `startSession` (abría una sesión SIN reactivos) se retiró.
 *
 * Ningún cliente la usaba: el diagnóstico, la práctica libre y el simulacro
 * abren su sesión por su propio orquestador, que además pre-crea las filas
 * `SessionAnswer` en la misma transacción (`startSessionWithQuestions`, G60).
 * Era, por tanto, un punto de ESCRITURA autenticado, sin usar y sin cuota:
 * cualquier usuario podía crear sesiones vacías en bucle. Se quita en vez de
 * dejarla protegida — la superficie que no existe no hay que auditarla.
 *
 * `submitAnswer` y `finishSession` sí siguen aquí: las usan `DrillRunner` y
 * `DiagnosticRunner`.
 */

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
