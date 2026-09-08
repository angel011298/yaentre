import { Prisma, type ExamSession, type SessionMode } from '@prisma/client';
import { prisma } from './prisma';
import { onSessionFinished } from './adaptive';
import { getStreak } from './streak';
import { computeSessionCelebration } from './gamification';
import type { Celebration } from '@/lib/gamification/celebrations';
import { trackServerEvent } from '@/lib/analytics/server';
import {
  appendSuspicionEvent,
  buildSubmitResponse,
  computeElapsedSecs,
  computeScore,
  getCorrectOptionId,
  isAnswerCorrect,
  isSessionStale,
  isTimeExceeded,
  parseQuestionOptions,
  resolveFinishStatus,
  STALE_SESSION_HOURS,
  type FinishReason,
  type SubmitResponse,
} from '@/lib/sessions/scoring';
import { reportSilentDegradation } from '@/lib/observability/report';

/** Modos con un límite de tiempo REAL que replica un examen cronometrado —
 *  a diferencia de TOPIC_DRILL/AREA_PRACTICE, cuyo `timeLimitSecs` (4h) solo
 *  existe porque la columna es NOT NULL, sin intención de cronometrar nada. */
const TIMED_EVALUATION_MODES: SessionMode[] = ['FULL_SIMULATION', 'DIAGNOSTIC'];

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
  | 'QUESTION_NOT_IN_SESSION'
  | 'INVALID_OPTION';

const FINISHED_STATUSES: ExamSession['status'][] = ['COMPLETED', 'COMPLETED_BY_TIMEOUT'];

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
  celebration: Celebration | null;
};

/**
 * Los campos de la sesión que necesitan las dos guardas de abajo. Se declara
 * aparte para que `submitAnswer` pueda pasarles su proyección de una sola
 * consulta (G69) sin tener que traer la fila entera.
 */
type GuardableSession = Pick<
  ExamSession,
  'id' | 'userProfileId' | 'status' | 'mode' | 'startedAt' | 'timeLimitSecs'
>;

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
 *
 * El límite de tiempo REAL de FULL_SIMULATION/DIAGNOSTIC (a diferencia de
 * esta comprobación de inactividad de 24h) se exige en `submitAnswer`
 * (ver `closeIfTimeExceeded` ahí) y no aquí — necesita disparar el cierre
 * COMPLETO de la sesión (`finishSession`, con su cascada de efectos:
 * puntaje, temas débiles, Entrómetro, racha), no solo cambiar el `status`.
 */
async function assertActionable(session: GuardableSession, now: Date): Promise<void> {
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

/**
 * G67 🔴 — El tiempo se calcula en el servidor, de verdad, en cada respuesta.
 *
 * Antes, nada entre una respuesta y la siguiente comprobaba el tiempo real de
 * FULL_SIMULATION/DIAGNOSTIC: el cronómetro en pantalla (`SimTimer`) fija su
 * `deadline` una sola vez al montar con el `Date.now()` DEL NAVEGADOR y cada
 * segundo recalcula `deadline - Date.now()` — así que congelar o atrasar el
 * reloj del sistema (una consola de devtools, o el reloj real del equipo)
 * evita que el número en pantalla llegue jamás a cero, y con él, que
 * `onExpire()` dispare el cierre automático. Comprobado en vivo contra
 * producción (`pnpm security:simulator-integrity`): adelantar el reloj del
 * navegador 1 hora mueve el número en pantalla esa hora exacta, sin que nada
 * del lado servidor lo notara — `assertActionable` solo rechazaba tras 24h
 * de INACTIVIDAD, veinte veces más que las 3h reales del examen. Sin este
 * candado, ese truco daba hasta 24h para responder un examen de 3 —tiempo de
 * sobra para consultarlo con alguien más o buscar las respuestas— y la app
 * nunca se enteraba hasta que el propio alumno decidiera terminar.
 *
 * Se cierra llamando al `finishSession` de verdad (no solo cambiando el
 * `status` a mano) para que corra la MISMA cascada de efectos que un cierre
 * normal: puntaje, temas débiles, Entrómetro, racha, `simulation_completed`.
 * `finishSession` internamente vuelve a llamar `loadOwnedSession`+
 * `assertActionable` (ese SÍ solo ve la comprobación de 24h — la sesión sigue
 * IN_PROGRESS en este punto) y su reclamo atómico (`updateMany` condicionado,
 * G60) es lo que hace esto seguro ante una respuesta concurrente.
 *
 * El límite generoso de TOPIC_DRILL/AREA_PRACTICE (4h, solo para satisfacer
 * la columna NOT NULL, sin intención de cronometrar nada) se deja intacto —
 * por eso `TIMED_EVALUATION_MODES` solo cubre los dos modos donde la app
 * promete un examen cronometrado de verdad.
 */
async function closeIfTimeExceeded(session: GuardableSession, now: Date): Promise<void> {
  if (!TIMED_EVALUATION_MODES.includes(session.mode)) return;
  if (!isTimeExceeded(computeElapsedSecs(session.startedAt, now), session.timeLimitSecs)) return;

  await finishSession({
    userProfileId: session.userProfileId,
    sessionId: session.id,
    reason: 'TIMEOUT',
    now,
  });
  throw new SessionError('NOT_IN_PROGRESS', 'Se acabó el tiempo de este examen.');
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

/**
 * Abre una sesión Y pre-crea sus filas `SessionAnswer` en UNA sola operación
 * atómica (G60). Antes cada orquestador (diagnóstico, drill, simulador) hacía
 * `examSession.create` y luego un `sessionAnswer.createMany` por separado: si
 * el segundo fallaba, quedaba una sesión IN_PROGRESS sin reactivos —
 * imposible de retomar y contaba hacia los barridos de sesiones viejas. El
 * `create` anidado de Prisma envuelve ambos INSERT en una transacción.
 *
 * Recibe `questionIds` ya resueltos por el llamador (el reparto por peso de
 * materia vive en cada orquestador). Acepta un cliente de transacción para
 * poder correr dentro de `withUserAdvisoryLock`.
 */
export async function startSessionWithQuestions(params: {
  userProfileId: string;
  examId: string;
  mode: SessionMode;
  timeLimitSecs: number;
  questionIds: string[];
  client?: Prisma.TransactionClient;
}): Promise<ExamSession> {
  const { userProfileId, examId, mode, timeLimitSecs, questionIds, client = prisma } = params;

  return client.examSession.create({
    data: {
      userProfileId,
      examId,
      mode,
      status: 'IN_PROGRESS',
      timeLimitSecs,
      answers: {
        createMany: {
          data: questionIds.map((questionId, position) => ({
            questionId,
            selectedOption: null,
            isCorrect: false,
            timeSpentSecs: 0,
            position,
          })),
        },
      },
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

  // ── G69 ⚡ UNA SOLA CONSULTA PARA LAS TRES COSAS QUE HAY QUE SABER ────────
  //
  // Antes eran tres operaciones de Prisma seguidas: la sesión, la fila
  // `SessionAnswer` que prueba la asignación, y el reactivo con sus opciones.
  // Con `?pgbouncer=true` cada una cuesta cuatro viajes al pooler y ocupa una
  // conexión de servidor, y esto corre UNA VEZ POR REACTIVO RESPONDIDO: 30 en
  // el diagnóstico, 10 en cada práctica. Era, con diferencia, el gasto
  // dominante de esos dos recorridos.
  //
  // Un `LEFT JOIN` da las tres piezas de un golpe y NO relaja ninguna guarda:
  // las comprobaciones de abajo son exactamente las mismas, en el mismo
  // orden, con los mismos códigos de error. En particular sigue exigiéndose
  // que exista la fila `session_answers` de ESTE (sesión, reactivo) — la
  // condición del JOIN lleva las dos columnas — que es lo que impide que un
  // reactivo salte de una sesión a otra y filtre la clave del simulacro
  // (G65). El `LEFT JOIN` es deliberado: si el reactivo no está asignado hace
  // falta distinguir "no es tuyo" de "no existe", y un INNER JOIN devolvería
  // cero filas en los dos casos.
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      userProfileId: string;
      status: ExamSession['status'];
      mode: SessionMode;
      startedAt: Date;
      timeLimitSecs: number;
      assignedAnswerId: string | null;
      questionRowId: string | null;
      questionOptions: Prisma.JsonValue | null;
    }>
  >`
    SELECT s."id",
           s."userProfileId",
           s."status",
           s."mode",
           s."startedAt",
           s."timeLimitSecs",
           sa."id"      AS "assignedAnswerId",
           q."id"       AS "questionRowId",
           q."options"  AS "questionOptions"
      FROM "exam_sessions" s
      LEFT JOIN "session_answers" sa
             ON sa."sessionId" = s."id" AND sa."questionId" = ${questionId}
      LEFT JOIN "questions" q
             ON q."id" = ${questionId}
     WHERE s."id" = ${sessionId}
  `;

  const row = rows[0];
  if (!row) {
    throw new SessionError('NOT_FOUND', 'No encontramos esta sesión.');
  }
  if (row.userProfileId !== userProfileId) {
    throw new SessionError('FORBIDDEN', 'Esta sesión no te pertenece.');
  }

  const session: GuardableSession = {
    id: row.id,
    userProfileId: row.userProfileId,
    status: row.status,
    mode: row.mode,
    startedAt: row.startedAt,
    timeLimitSecs: row.timeLimitSecs,
  };

  await assertActionable(session, now);
  await closeIfTimeExceeded(session, now);

  // ── G65 🔴 EL REACTIVO DEBE PERTENECER A ESTA SESIÓN ─────────────────────
  //
  // Antes bastaba con ser dueño de la SESIÓN: el `questionId` se aceptaba tal
  // cual viniera del cliente y la fila se creaba con `upsert` si no existía.
  // Eso abría una fuga directa de la clave de respuestas, comprobada en vivo:
  //
  //   1. el alumno arranca su simulacro (FULL_SIMULATION, que NO revela
  //      correctitud) y ya tiene en el cliente los 120 `questionId`;
  //   2. en otra pestaña abre una práctica libre (AREA_PRACTICE, que SÍ
  //      revela correctitud al responder — es su propósito);
  //   3. llama a `submitAnswer` con el `sessionId` de la práctica y los
  //      `questionId` del SIMULACRO. La respuesta traía
  //      `{ isCorrect, correctOption }` de cada reactivo del examen en curso.
  //
  // La política de revelado se decide por el MODO de la sesión, así que la
  // única forma de sostenerla es que el reactivo no pueda saltar de una
  // sesión a otra. Todas las sesiones reales (diagnóstico, práctica y
  // simulacro) pre-crean sus filas `SessionAnswer` en `startSessionWithQuestions`,
  // así que exigir que la fila exista es exactamente "este reactivo se te
  // asignó". De paso desaparece el `upsert`: ahora es un UPDATE condicionado,
  // una sola operación en vez de dos, y ya no se pueden inyectar respuestas de
  // reactivos que nunca se vieron (que contaminaban el propio historial y, vía
  // score, el percentil de los demás).
  if (!row.assignedAnswerId) {
    throw new SessionError(
      'QUESTION_NOT_IN_SESSION',
      'Este reactivo no forma parte de este examen.'
    );
  }

  // `questionRowId`, no `questionOptions`: distingue "el reactivo no existe"
  // de "existe con un JSON raro" — este segundo caso debe seguir cayendo en
  // `parseQuestionOptions`, que es quien sabe rechazarlo.
  if (row.questionRowId === null) {
    throw new SessionError('QUESTION_NOT_FOUND', 'No encontramos este reactivo.');
  }

  const options = parseQuestionOptions(row.questionOptions);

  // Una opción concreta debe existir en el reactivo; null (omitida) es válido.
  if (selectedOption !== null && !options.some(o => o.id === selectedOption)) {
    throw new SessionError('INVALID_OPTION', 'La opción seleccionada no existe en este reactivo.');
  }

  // Correctitud calculada server-side contra la DB — nunca se confía en el cliente.
  const correct = isAnswerCorrect(options, selectedOption);

  await prisma.sessionAnswer.update({
    where: { sessionId_questionId: { sessionId, questionId } },
    data: { selectedOption, isCorrect: correct, timeSpentSecs, position },
  });

  // Único punto de retorno: la política de revelado por modo decide qué viaja
  // al cliente. En FULL_SIMULATION/DIAGNOSTIC no se filtra correctitud.
  return buildSubmitResponse(session.mode, correct, getCorrectOptionId(options));
}

/** Despacha el evento de embudo correcto según el modo de la sesión terminada (F20 tarea 2). */
async function trackSessionCompletion(
  mode: SessionMode,
  userProfileId: string,
  data: {
    score: number;
    totalQuestions: number;
    durationSecs: number;
    status: ExamSession['status'];
    timeExceeded: boolean;
  }
): Promise<void> {
  const { score, totalQuestions, durationSecs, status, timeExceeded } = data;

  if (mode === 'DIAGNOSTIC') {
    await trackServerEvent(userProfileId, 'diagnostic_completed', {
      score,
      totalQuestions,
      durationSecs,
    });
  } else if (mode === 'TOPIC_DRILL' || mode === 'AREA_PRACTICE') {
    await trackServerEvent(userProfileId, 'practice_completed', {
      mode,
      score,
      totalQuestions,
      durationSecs,
    });
  } else if (mode === 'FULL_SIMULATION') {
    await trackServerEvent(userProfileId, 'simulation_completed', {
      score,
      totalQuestions,
      durationSecs,
      status,
      timeExceeded,
    });
  }
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

  // G60 — cierre atómico. Dos peticiones pueden intentar cerrar la misma
  // sesión a la vez (el usuario da clic en "Finalizar" justo cuando el timer
  // dispara `TIMEOUT`, o dos pestañas). Sin esto, AMBAS corrían los efectos
  // secundarios: doble evento `simulation_completed` (la métrica estrella del
  // negocio se contaba dos veces), doble celebración, doble recálculo
  // adaptativo. El `updateMany` condicionado a `status: 'IN_PROGRESS'`
  // garantiza que exactamente UNA transición gane; la perdedora devuelve el
  // resultado ya persistido SIN re-disparar nada.
  const claim = await prisma.examSession.updateMany({
    where: { id: sessionId, status: 'IN_PROGRESS' },
    data: {
      status,
      finishedAt: now,
      score,
      ...(suspicionEvents
        ? { suspicionEvents: suspicionEvents as unknown as Prisma.InputJsonValue }
        : {}),
    },
  });

  if (claim.count === 0) {
    const persisted = await prisma.examSession.findUniqueOrThrow({ where: { id: sessionId } });
    if (!FINISHED_STATUSES.includes(persisted.status)) {
      throw new SessionError('NOT_IN_PROGRESS', 'Este examen ya terminó. Empieza uno nuevo.');
    }
    const persistedElapsed = persisted.finishedAt
      ? computeElapsedSecs(persisted.startedAt, persisted.finishedAt)
      : elapsedSecs;
    return {
      session: persisted,
      score: persisted.score ?? score,
      elapsedSecs: persistedElapsed,
      status: persisted.status,
      timeExceeded: persisted.status === 'COMPLETED_BY_TIMEOUT',
      answers: answers.map((a) => ({
        questionId: a.questionId,
        selectedOption: a.selectedOption,
        isCorrect: a.isCorrect,
        position: a.position,
      })),
      // La llamada ganadora ya calculó y devolvió la celebración de esta sesión.
      celebration: null,
    };
  }

  const updated = await prisma.examSession.findUniqueOrThrow({ where: { id: sessionId } });

  // F15: captura la racha ANTES del recálculo, para poder detectar si esta
  // sesión es la que cruza un milestone (7/14/30) — después de
  // onSessionFinished, StreakRecord ya refleja el "después".
  const previousStreak = (await getStreak(session.userProfileId))?.currentStreak ?? 0;

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

  // F15: como máximo una celebración grande por sesión (prioridad: materia
  // dominada > ronda perfecta > racha) — decisión 100% centralizada en
  // `computeSessionCelebration`/`selectCelebration`. Nunca debe romper el
  // cierre de sesión: un fallo aquí se registra y la sesión se cierra igual.
  let celebration: Celebration | null = null;
  try {
    const currentStreak = (await getStreak(session.userProfileId))?.currentStreak ?? 0;
    celebration = await computeSessionCelebration({
      userProfileId: session.userProfileId,
      sessionId,
      score,
      servedCount: answers.length,
      previousStreak,
      currentStreak,
    });
  } catch (err) {
    reportSilentDegradation('gamification', err, { userProfileId: session.userProfileId });
  }

  // F20 tarea 2: el fin de un simulacro es "el indicador más importante del
  // negocio" (instrucción explícita) — se despacha por modo con el mismo
  // criterio "servidor es la autoridad" de scoring/pagos.
  await trackSessionCompletion(session.mode, session.userProfileId, {
    score,
    totalQuestions: answers.length,
    durationSecs: elapsedSecs,
    status,
    timeExceeded,
  });

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
    celebration,
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
