import type { SessionMode, SessionStatus } from '@prisma/client';
import { z } from 'zod';

/**
 * Lógica pura del motor de sesiones: scoring, tiempo, estado y política de
 * revelado. Sin dependencia de Prisma ni de red — todo aquí es determinista y
 * testeable con casos fijos. La capa DB (src/lib/db/sessions.ts) orquesta estas
 * funciones contra la base de datos.
 *
 * Guardrail (CLAUDE.md): la correctitud SIEMPRE se calcula aquí, en el
 * servidor, comparando la opción elegida contra la marcada isCorrect en la DB.
 * El cliente nunca decide si acertó.
 */

// Ventana de gracia sobre el límite de tiempo antes de marcar TIME_EXCEEDED.
export const TIME_GRACE_SECS = 30;

// Una sesión IN_PROGRESS más vieja que esto se considera abandonada.
export const STALE_SESSION_HOURS = 24;

export type QuestionOption = { id: string; text: string; isCorrect: boolean };

export type AnswerCorrectness = { isCorrect: boolean };

export type SuspicionEvent = {
  type: string;
  at: string;
  [key: string]: unknown;
};

export type FinishReason = 'USER' | 'TIMEOUT';

/**
 * Respuesta que submitAnswer devuelve al cliente. En modos de evaluación
 * (FULL_SIMULATION, DIAGNOSTIC) NUNCA incluye isCorrect ni correctOption: esos
 * campos solo existen en modos de práctica que revelan al instante.
 */
export type SubmitResponse =
  | { recorded: true }
  | { recorded: true; isCorrect: boolean; correctOption: string };

const questionOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  isCorrect: z.boolean(),
});

const questionOptionsSchema = z.array(questionOptionSchema).min(2);

/**
 * Valida y tipa el JSON `Question.options`. Lanza si está malformado
 * (opciones vacías, sin ids, etc.) para no puntuar sobre datos corruptos.
 */
export function parseQuestionOptions(raw: unknown): QuestionOption[] {
  return questionOptionsSchema.parse(raw);
}

/**
 * Id de la única opción correcta. Lanza si no hay exactamente una — un
 * reactivo con 0 o >1 correctas es un error de datos que no debe puntuarse.
 */
export function getCorrectOptionId(options: QuestionOption[]): string {
  const correct = options.filter(o => o.isCorrect);
  if (correct.length !== 1) {
    throw new Error(
      `Reactivo inválido: se esperaba exactamente 1 opción correcta, hay ${correct.length}.`
    );
  }
  return correct[0].id;
}

/**
 * Correctitud server-side de una respuesta. Una respuesta omitida (null) es
 * incorrecta. Una opción que no existe en el reactivo es incorrecta (defensa;
 * la capa DB además la rechaza antes de llegar aquí).
 */
export function isAnswerCorrect(
  options: QuestionOption[],
  selectedOption: string | null
): boolean {
  if (selectedOption === null) return false;
  const correctId = getCorrectOptionId(options);
  return selectedOption === correctId;
}

/** Score = número de respuestas correctas ya verificadas en la DB. */
export function computeScore(answers: AnswerCorrectness[]): number {
  return answers.reduce((acc, a) => acc + (a.isCorrect ? 1 : 0), 0);
}

/** Segundos transcurridos entre startedAt y ahora (nunca negativo). */
export function computeElapsedSecs(startedAt: Date, now: Date): number {
  const diffMs = now.getTime() - startedAt.getTime();
  return Math.max(0, Math.floor(diffMs / 1000));
}

/**
 * ¿El tiempo real excede el límite + gracia? "Supera el límite +30s" ⇒
 * estrictamente mayor: límite+30 exacto NO excede; límite+31 sí.
 */
export function isTimeExceeded(
  elapsedSecs: number,
  timeLimitSecs: number,
  graceSecs: number = TIME_GRACE_SECS
): boolean {
  return elapsedSecs > timeLimitSecs + graceSecs;
}

/** ¿La sesión lleva abierta más del umbral de abandono? */
export function isSessionStale(
  startedAt: Date,
  now: Date,
  hours: number = STALE_SESSION_HOURS
): boolean {
  const ageMs = now.getTime() - startedAt.getTime();
  return ageMs > hours * 3600 * 1000;
}

/**
 * Resuelve el estado final al cerrar una sesión IN_PROGRESS.
 * - reason TIMEOUT, o tiempo real excedido ⇒ COMPLETED_BY_TIMEOUT.
 * - en otro caso ⇒ COMPLETED.
 * `timeExceeded` señala si hay que registrar TIME_EXCEEDED en suspicionEvents
 * (indicio de manipulación del timer del cliente).
 */
export function resolveFinishStatus(
  reason: FinishReason,
  elapsedSecs: number,
  timeLimitSecs: number
): { status: Extract<SessionStatus, 'COMPLETED' | 'COMPLETED_BY_TIMEOUT'>; timeExceeded: boolean } {
  const timeExceeded = isTimeExceeded(elapsedSecs, timeLimitSecs);
  const status =
    reason === 'TIMEOUT' || timeExceeded ? 'COMPLETED_BY_TIMEOUT' : 'COMPLETED';
  return { status, timeExceeded };
}

/** Agrega un evento de sospecha al arreglo existente (tolera null/no-array). */
export function appendSuspicionEvent(existing: unknown, event: SuspicionEvent): SuspicionEvent[] {
  const base = Array.isArray(existing) ? (existing as SuspicionEvent[]) : [];
  return [...base, event];
}

/**
 * Política de revelado por modo. Los modos de evaluación no revelan la
 * correctitud al responder: el simulacro replica el examen real y el
 * diagnóstico mide sin sesgar (los resultados llegan al finalizar). Los modos
 * de práctica (drill) sí revelan al instante para el ciclo de aprendizaje.
 */
export function revealsCorrectnessOnSubmit(mode: SessionMode): boolean {
  return mode !== 'FULL_SIMULATION' && mode !== 'DIAGNOSTIC';
}

/**
 * Construye la respuesta de submitAnswer respetando la política de revelado.
 * Único punto que decide qué correctitud viaja al cliente al responder.
 */
export function buildSubmitResponse(
  mode: SessionMode,
  isCorrect: boolean,
  correctOptionId: string
): SubmitResponse {
  if (revealsCorrectnessOnSubmit(mode)) {
    return { recorded: true, isCorrect, correctOption: correctOptionId };
  }
  return { recorded: true };
}
