import { Prisma, type ExamSession, type SessionMode } from '@prisma/client';
import { prisma } from './prisma';
import { onSessionFinished } from './adaptive';
import {
  appendSuspicionEvent,
  buildSubmitResponse,
  computeElapsedSecs,
  computeScore,
  getCorrectOptionId,
  isAnswerCorrect,
  isSessionStale,
  parseQuestionOptions,
  resolveFinishStatus,
  STALE_SESSION_HOURS,
  type FinishReason,
  type SubmitResponse,
} from '@/lib/sessions/scoring';

/**
 * Capa de acceso a datos del motor de sesiones. Recibe SIEMPRE el
 * `userProfileId` del guard de autenticación (nunca del cliente) y valida la
 * propiedad de la sesión en cada mutación. El scoring y las reglas de tiempo
 * viven en el módulo puro src/lib/sessions/scoring.ts.
 */

export type SessionErrorCode =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'NOT_IN_PROGRESS'
  | 'EXAM_NOT_AVAILABLE'
  | 'QUESTION_NOT_FOUND'
  | 'INVALID_OPTION';

export class SessionError extends Error {
  code: SessionErrorCode;

  constructor(code: SessionErrorCode, message: string) {
    super(message);
    this.name = 'SessionError';
    this.code = code;
  }
}

export type FinishSessionResult = {
  session: ExamSession;
  score: number;
  elapsedSecs: number;
  status: ExamSession['status'];
  timeExceeded: boolean;
  answers: Array<{
    questionId: string;
    selectedOption: string | null;
    isCorrect: boolean;
    position: number;
  }>;
};

/**
 * Carga una sesión y verifica que pertenezca al usuario. Punto único de
 * validación de propiedad para todas las mutaciones.
 */
async function loadOwnedSession(
  sessionId: string,
  userProfileId: string
): Promise<ExamSession> {
  const session = await prisma.examSession.findUnique({ where: { id: sessionId } });

  if (!session) {
    throw new SessionError('NOT_FOUND', 'No encontramos esta sesión.');
  }
  if (session.userProfileId !== userProfileId) {
    throw new SessionError('FORBIDDEN', 'Esta sesión no te pertenece.');
  }
  return session;
}

/**
 * Exige que la sesión esté abierta y accionable. Si lleva más de 24h abierta,
 * la cierra como ABANDONED (no afecta stats) y rechaza la operación. Si ya
 * terminó, rechaza con NOT_IN_PROGRESS.
 */
async function assertActionable(session: ExamSession, now: Date): Promise<void> {
  if (session.status === 'IN_PROGRESS' && isSessionStale(session.startedAt, now)) {
    await prisma.examSession.update({
      where: { id: session.id },
      data: { status: 'ABANDONED', finishedAt: now },
    });
    throw new SessionError('NOT_IN_PROGRESS', 'Esta sesión expiró por inactividad.');
  }
  if (session.status !== 'IN_PROGRESS') {
    throw new SessionError('NOT_IN_PROGRESS', 'Este examen ya terminó. Empieza uno nuevo.');
  }
}

export async function startSession(params: {
  userProfileId: string;
  examId: string;
  mode: SessionMode;
  timeLimitSecs?: number;
}): Promise<ExamSession> {
  const { userProfileId, examId, mode, timeLimitSecs } = params;

  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam || !exam.isActive) {
    throw new SessionError('EXAM_NOT_AVAILABLE', 'Este examen no está disponible.');
  }

  const limitSecs = timeLimitSecs ?? exam.durationMins * 60;

  return prisma.examSession.create({
    data: {
      userProfileId,
      examId,
      mode,
      status: 'IN_PROGRESS',
      timeLimitSecs: limitSecs,
    },
  });
}

export async function submitAnswer(params: {
  userProfileId: string;
  sessionId: string;
  questionId: string;
  selectedOption: string | null;
  position: number;
  timeSpentSecs: number;
  now?: Date;
}): Promise<SubmitResponse> {
  const {
    userProfileId,
    sessionId,
    questionId,
    selectedOption,
    position,
    timeSpentSecs,
    now = new Date(),
  } = params;

  const session = await loadOwnedSession(sessionId, userProfileId);
  await assertActionable(session, now);

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, options: true },
  });
  if (!question) {
    throw new SessionError('QUESTION_NOT_FOUND', 'No encontramos este reactivo.');
  }

  const options = parseQuestionOptions(question.options);

  // Una opción concreta debe existir en el reactivo; null (omitida) es válido.
  if (selectedOption !== null && !options.some(o => o.id === selectedOption)) {
    throw new SessionError('INVALID_OPTION', 'La opción seleccionada no existe en este reactivo.');
  }

  // Correctitud calculada server-side contra la DB — nunca se confía en el cliente.
  const correct = isAnswerCorrect(options, selectedOption);

  await prisma.sessionAnswer.upsert({
    where: { sessionId_questionId: { sessionId, questionId } },
    create: {
      sessionId,
      questionId,
      selectedOption,
      isCorrect: correct,
      timeSpentSecs,
      position,
    },
    update: { selectedOption, isCorrect: correct, timeSpentSecs, position },
  });

  // Único punto de retorno: la política de revelado por modo decide qué viaja
  // al cliente. En FULL_SIMULATION/DIAGNOSTIC no se filtra correctitud.
  return buildSubmitResponse(session.mode, correct, getCorrectOptionId(options));
}

export async function finishSession(params: {
  userProfileId: string;
  sessionId: string;
  reason?: FinishReason;
  now?: Date;
}): Promise<FinishSessionResult> {
  const { userProfileId, sessionId, reason = 'USER', now = new Date() } = params;

  const session = await loadOwnedSession(sessionId, userProfileId);
  await assertActionable(session, now);

  const answers = await prisma.sessionAnswer.findMany({
    where: { sessionId },
    orderBy: { position: 'asc' },
  });

  const elapsedSecs = computeElapsedSecs(session.startedAt, now);
  const { status, timeExceeded } = resolveFinishStatus(reason, elapsedSecs, session.timeLimitSecs);
  const score = computeScore(answers);

  const suspicionEvents = timeExceeded
    ? appendSuspicionEvent(session.suspicionEvents, {
        type: 'TIME_EXCEEDED',
        at: now.toISOString(),
        elapsedSecs,
        timeLimitSecs: session.timeLimitSecs,
      })
    : undefined;

  const updated = await prisma.examSession.update({
    where: { id: sessionId },
    data: {
      status,
      finishedAt: now,
      score,
      ...(suspicionEvents
        ? { suspicionEvents: suspicionEvents as unknown as Prisma.InputJsonValue }
        : {}),
    },
  });

  // Motor adaptativo (F6): al finalizar, recalcular temas débiles y predicción.
  // La sesión ya quedó COMPLETED* y persistida arriba, así que onSessionFinished
  // ve la sesión recién terminada en el historial. Es robusto internamente (no
  // propaga errores): un fallo del recálculo no debe romper el cierre de sesión.
  await onSessionFinished(session.userProfileId);

  // F7: el diagnóstico inicial marca el perfil como completado al terminar
  // (independientemente del resultado) — es el único punto de cierre real de
  // ese flujo, ya sea vía /diagnostico o cualquier futuro entry point.
  if (session.mode === 'DIAGNOSTIC') {
    await prisma.userProfile.update({
      where: { id: session.userProfileId },
      data: { diagnosticDone: true },
    });
  }

  // finishSession revela: aquí ya es seguro devolver la correctitud por reactivo.
  return {
    session: updated,
    score,
    elapsedSecs,
    status,
    timeExceeded,
    answers: answers.map(a => ({
      questionId: a.questionId,
      selectedOption: a.selectedOption,
      isCorrect: a.isCorrect,
      position: a.position,
    })),
  };
}

/**
 * Barrido de mantenimiento: cierra como ABANDONED toda sesión IN_PROGRESS más
 * vieja que el umbral. Pensado para un cron (protegido por CRON_SECRET).
 * Las sesiones ABANDONED no cuentan para stats (score queda null).
 */
export async function abandonStaleSessions(params?: { now?: Date }): Promise<number> {
  const now = params?.now ?? new Date();
  const cutoff = new Date(now.getTime() - STALE_SESSION_HOURS * 3600 * 1000);

  const result = await prisma.examSession.updateMany({
    where: { status: 'IN_PROGRESS', startedAt: { lt: cutoff } },
    data: { status: 'ABANDONED', finishedAt: now },
  });

  return result.count;
}
