import { Prisma, type InstitutionCode, type SessionStatus } from '@prisma/client';
import { prisma } from './prisma';
import * as sessionsDb from './sessions';
import { buildDiagnosticQuestionSet, toRunnerQuestion, type RunnerQuestion } from './diagnostic';
import {
  countCompletedFullSimulations,
  isUserPaid,
} from './paywall';
import {
  computeCareerStrategy,
  computeSessionPredictionDelta,
  type CareerStrategyResponse,
} from './adaptive';
import { canStartFullSimulation, type GateDecision, type PaywallTrigger } from '@/lib/paywall/gates';
import { simulatorConfigFor } from '@/lib/simulator/config';
import { orderQuestionOptions } from '@/lib/simulator/shuffle';
import { computeRemainingSecs, isTimeUp } from '@/lib/simulator/time';
import { computePercentileRank } from '@/lib/simulator/percentile';
import { subjectColorFor } from '@/lib/simulator/subjectColors';
import {
  mergeIntegrityCounters,
  type IntegrityCounters,
  type SuspicionInfoEvent,
} from '@/lib/simulator/integrity';
import {
  computeElapsedSecs,
  isAnswerCorrect,
  isSessionStale,
  parseQuestionOptions,
} from '@/lib/sessions/scoring';

/**
 * Orquestación del simulador de examen en línea (F12). Reusa TODO el motor de
 * sesiones ya existente (F2/F6/F9): el scoring server-side, la política de
 * no-revelado por modo (`buildSubmitResponse`), el muro suave (F9) y el
 * recálculo adaptativo al terminar. Este módulo añade lo específico del
 * simulacro fiel: parámetros por examen (120/180 UNAM, 140/180 IPN), barajado
 * de opciones por institución, resiliencia (retomar con tiempo real del
 * servidor) y el payload saneado que JAMÁS incluye la respuesta correcta.
 */

const FINISHED_STATUSES: SessionStatus[] = ['COMPLETED', 'COMPLETED_BY_TIMEOUT'];

// ─────────────────────────── Contexto del examen objetivo ───────────────────────────

interface TargetContext {
  examId: string;
  examName: string;
  areaId: string;
  areaName: string;
  institutionCode: InstitutionCode;
  durationMins: number;
  totalQuestions: number;
  examActive: boolean;
}

async function resolveTargetContext(userProfileId: string): Promise<TargetContext | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: {
      targetExam: {
        select: {
          id: true,
          name: true,
          durationMins: true,
          totalQuestions: true,
          isActive: true,
          level: { select: { institution: { select: { code: true } } } },
        },
      },
      targetCareer: { select: { area: { select: { id: true, name: true } } } },
    },
  });

  const exam = profile?.targetExam;
  const area = profile?.targetCareer?.area;
  if (!exam || !area) return null;

  return {
    examId: exam.id,
    examName: exam.name,
    areaId: area.id,
    areaName: area.name,
    institutionCode: exam.level.institution.code,
    durationMins: exam.durationMins,
    totalQuestions: exam.totalQuestions,
    examActive: exam.isActive,
  };
}

// ─────────────────────────────── Acceso (muro suave F9) ───────────────────────────────

export interface SimulatorAccess {
  /** ¿Puede iniciar un simulacro AHORA? (pago, o gratuito sin haberlo usado). */
  decision: GateDecision;
  isPaid: boolean;
  /** true si es un usuario gratuito estrenando su simulacro (mensaje cálido de Tino). */
  isFreeFirstTime: boolean;
}

export async function evaluateSimulatorAccess(userProfileId: string): Promise<SimulatorAccess> {
  const [isPaid, completedCount] = await Promise.all([
    isUserPaid(userProfileId),
    countCompletedFullSimulations(userProfileId),
  ]);
  const decision = canStartFullSimulation({ isPaid, completedCount });
  return {
    decision,
    isPaid,
    isFreeFirstTime: !isPaid && completedCount === 0,
  };
}

export interface SimulatorEntryMeta {
  examName: string;
  totalQuestions: number;
  durationMins: number;
}

/** Metadatos del examen objetivo para la pantalla de entrada/pre-flight. */
export async function loadSimulatorEntryMeta(
  userProfileId: string
): Promise<SimulatorEntryMeta | null> {
  const ctx = await resolveTargetContext(userProfileId);
  if (!ctx) return null;
  return {
    examName: ctx.examName,
    totalQuestions: ctx.totalQuestions,
    durationMins: ctx.durationMins,
  };
}

// ─────────────────────────────── Payload del cliente ───────────────────────────────

export interface SimulatorPayload {
  sessionId: string;
  institutionCode: InstitutionCode;
  examName: string;
  areaName: string;
  /** Total oficial del examen (120/140) — puede exceder los reactivos servidos. */
  examTotalQuestions: number;
  /** Reactivos realmente servidos (acotados por el contenido disponible). */
  servedCount: number;
  timeLimitSecs: number;
  /** Restante calculado por el SERVIDOR al cargar — el cliente solo lo tictaquea. */
  remainingSecs: number;
  questions: RunnerQuestion[];
  initialSelections: Array<string | null>;
  integrity: IntegrityCounters;
  suspicionEvents: SuspicionInfoEvent[];
  completedFullscreen: boolean;
  /** true si se reanuda una sesión ya en curso (mostrar "retomar en pantalla completa"). */
  isResume: boolean;
}

const questionInclude = {
  question: {
    select: {
      id: true,
      stem: true,
      imageUrl: true,
      options: true,
      format: true,
      passage: { select: { id: true, title: true, content: true, sourceRef: true } },
      topic: { select: { id: true, name: true, subject: { select: { id: true, name: true } } } },
    },
  },
} satisfies Prisma.SessionAnswerInclude;

const simulatorSessionInclude = {
  answers: { orderBy: { position: 'asc' }, include: questionInclude },
} satisfies Prisma.ExamSessionInclude;

type SimulatorSessionWithAnswers = Prisma.ExamSessionGetPayload<{
  include: typeof simulatorSessionInclude;
}>;

function readIntegrity(session: SimulatorSessionWithAnswers): IntegrityCounters {
  return {
    tabBlurCount: session.tabBlurCount,
    rightClickAttempts: session.rightClickAttempts,
    keyboardShortcutAttempts: session.keyboardShortcutAttempts,
  };
}

function readSuspicionEvents(raw: unknown): SuspicionInfoEvent[] {
  return Array.isArray(raw) ? (raw as SuspicionInfoEvent[]) : [];
}

function buildPayload(
  session: SimulatorSessionWithAnswers,
  ctx: TargetContext,
  isResume: boolean,
  now: Date
): SimulatorPayload {
  const shuffleOptions = simulatorConfigFor(ctx.institutionCode).shuffleOptions;

  const questions: RunnerQuestion[] = session.answers.map((a) => {
    const base = toRunnerQuestion(a.question);
    // Barajado de opciones por institución. Solo reordena la vista: los `id`
    // (con los que se responde) se conservan y la correctitud sigue server-side.
    return {
      ...base,
      options: orderQuestionOptions(base.options, {
        enabled: shuffleOptions,
        sessionId: session.id,
        questionId: a.question.id,
      }),
    };
  });

  return {
    sessionId: session.id,
    institutionCode: ctx.institutionCode,
    examName: ctx.examName,
    areaName: ctx.areaName,
    examTotalQuestions: ctx.totalQuestions,
    servedCount: session.answers.length,
    timeLimitSecs: session.timeLimitSecs,
    remainingSecs: computeRemainingSecs(session.startedAt, session.timeLimitSecs, now),
    questions,
    initialSelections: session.answers.map((a) => a.selectedOption),
    integrity: readIntegrity(session),
    suspicionEvents: readSuspicionEvents(session.suspicionEvents),
    completedFullscreen: session.completedFullscreen,
    isResume,
  };
}

// ─────────────────────────────── Inicio del simulacro ───────────────────────────────

export type SimulatorStartError = 'NO_TARGET' | 'NO_CONTENT' | 'EXAM_NOT_AVAILABLE' | 'PAYWALL';

export type SimulatorStartResult =
  | { ok: true; payload: SimulatorPayload }
  | { ok: false; code: SimulatorStartError; trigger?: PaywallTrigger };

/**
 * Abre una sesión FULL_SIMULATION real. Parámetros según el examen objetivo
 * (UNAM 120/180, IPN 140/180) y set de reactivos repartido por peso de materia,
 * acotado al contenido servible (reusa `buildDiagnosticQuestionSet`, que ya es
 * un repartidor genérico por peso). Pre-crea las N filas `SessionAnswer` para
 * que retomar a media sesión funcione sin guardar el set en otro lado (mismo
 * patrón que el diagnóstico). El muro suave se valida antes de crear nada.
 */
export async function startSimulation(
  userProfileId: string,
  now: Date = new Date()
): Promise<SimulatorStartResult> {
  const ctx = await resolveTargetContext(userProfileId);
  if (!ctx) return { ok: false, code: 'NO_TARGET' };
  if (!ctx.examActive) return { ok: false, code: 'EXAM_NOT_AVAILABLE' };

  const access = await evaluateSimulatorAccess(userProfileId);
  if (!access.decision.allowed) {
    return { ok: false, code: 'PAYWALL', trigger: access.decision.trigger };
  }

  const { questionIds } = await buildDiagnosticQuestionSet(ctx.areaId, ctx.totalQuestions);
  if (questionIds.length === 0) return { ok: false, code: 'NO_CONTENT' };

  const session = await sessionsDb.startSession({
    userProfileId,
    examId: ctx.examId,
    mode: 'FULL_SIMULATION',
    timeLimitSecs: ctx.durationMins * 60,
  });

  await prisma.sessionAnswer.createMany({
    data: questionIds.map((questionId, position) => ({
      sessionId: session.id,
      questionId,
      selectedOption: null,
      isCorrect: false,
      timeSpentSecs: 0,
      position,
    })),
  });

  const full = await prisma.examSession.findUniqueOrThrow({
    where: { id: session.id },
    include: simulatorSessionInclude,
  });

  return { ok: true, payload: buildPayload(full, ctx, false, now) };
}

// ─────────────────────────────── Estado / reanudación ───────────────────────────────

export type SimulatorState =
  | { kind: 'active'; payload: SimulatorPayload }
  | { kind: 'expired'; sessionId: string }
  | { kind: 'none' };

/**
 * Resuelve la sesión de simulacro vigente del alumno (nunca confía en el
 * cliente). Cierra como ABANDONED lo que lleva >24h abierto; si el tiempo real
 * (contra `startedAt` del servidor) ya se agotó, la marca `expired` para que la
 * página la cierre y muestre resultados. Si sigue viva, arma el payload de
 * reanudación con el restante recalculado por el servidor.
 */
export async function loadSimulatorState(
  userProfileId: string,
  now: Date = new Date()
): Promise<SimulatorState> {
  const session = await prisma.examSession.findFirst({
    where: { userProfileId, mode: 'FULL_SIMULATION', status: 'IN_PROGRESS' },
    orderBy: { startedAt: 'desc' },
    include: simulatorSessionInclude,
  });

  if (!session) return { kind: 'none' };

  if (isSessionStale(session.startedAt, now)) {
    await prisma.examSession.update({
      where: { id: session.id },
      data: { status: 'ABANDONED', finishedAt: now },
    });
    return { kind: 'none' };
  }

  if (isTimeUp(session.startedAt, session.timeLimitSecs, now)) {
    return { kind: 'expired', sessionId: session.id };
  }

  const ctx = await resolveTargetContext(userProfileId);
  if (!ctx) return { kind: 'none' };

  return { kind: 'active', payload: buildPayload(session, ctx, true, now) };
}

// ─────────────────────────────── Sinc (beacon/offline) ───────────────────────────────

export interface SimulatorSyncAnswer {
  questionId: string;
  selectedOption: string | null;
  position: number;
  timeSpentSecs: number;
}

export interface SimulatorSyncInput {
  userProfileId: string;
  sessionId: string;
  answers: SimulatorSyncAnswer[];
  integrity: IntegrityCounters;
  suspicionEvents: SuspicionInfoEvent[];
  completedFullscreen: boolean;
}

export type SimulatorSyncResult =
  | { ok: true; recorded: number }
  | { ok: false; code: 'NOT_FOUND' | 'FORBIDDEN' | 'NOT_IN_PROGRESS' };

/**
 * Persiste un lote de respuestas + señales de integridad. Es el destino de:
 * (1) el flush periódico, (2) el reintento al reconectar, y (3) el
 * `navigator.sendBeacon` en `beforeunload`/`pagehide`. Idempotente: las
 * respuestas se hacen upsert por (sesión, reactivo) y los contadores se fusionan
 * al MÁXIMO. NUNCA devuelve la correctitud — solo cuántas registró.
 */
export async function recordSimulatorSync(input: SimulatorSyncInput): Promise<SimulatorSyncResult> {
  const session = await prisma.examSession.findUnique({
    where: { id: input.sessionId },
    select: {
      id: true,
      userProfileId: true,
      status: true,
      tabBlurCount: true,
      rightClickAttempts: true,
      keyboardShortcutAttempts: true,
      completedFullscreen: true,
    },
  });

  if (!session) return { ok: false, code: 'NOT_FOUND' };
  if (session.userProfileId !== input.userProfileId) return { ok: false, code: 'FORBIDDEN' };
  if (session.status !== 'IN_PROGRESS') return { ok: false, code: 'NOT_IN_PROGRESS' };

  let recorded = 0;
  for (const answer of input.answers) {
    const question = await prisma.question.findUnique({
      where: { id: answer.questionId },
      select: { id: true, options: true },
    });
    if (!question) continue;

    // F19 (bug real corregido): `parseQuestionOptions`/`isAnswerCorrect` LANZAN
    // ante un reactivo corrupto (options malformadas, o 0/≥2 opciones marcadas
    // como correctas). Antes ese throw escapaba del bucle y tumbaba TODO el
    // lote: un solo reactivo dañado hacía que el beacon devolviera 500 y el
    // alumno perdiera las otras 119 respuestas de su simulacro. Ahora el fallo
    // se aísla al reactivo culpable — se registra y se salta, el resto del
    // lote se persiste igual. Nunca se marca "correcta" a la fuerza: si no se
    // puede puntuar con certeza, esa respuesta simplemente no se guarda.
    let options;
    let correct: boolean;
    try {
      options = parseQuestionOptions(question.options);
      // Opción inexistente ⇒ se ignora (defensa; la UI solo manda ids válidos).
      if (answer.selectedOption !== null && !options.some((o) => o.id === answer.selectedOption)) {
        continue;
      }
      // Correctitud SIEMPRE server-side (guardrail CLAUDE.md).
      correct = isAnswerCorrect(options, answer.selectedOption);
    } catch (err) {
      console.error('[simulator/sync] Reactivo no puntuable, se omite del lote', {
        sessionId: session.id,
        questionId: answer.questionId,
        err,
      });
      continue;
    }

    await prisma.sessionAnswer.upsert({
      where: { sessionId_questionId: { sessionId: session.id, questionId: answer.questionId } },
      create: {
        sessionId: session.id,
        questionId: answer.questionId,
        selectedOption: answer.selectedOption,
        isCorrect: correct,
        timeSpentSecs: answer.timeSpentSecs,
        position: answer.position,
      },
      update: {
        selectedOption: answer.selectedOption,
        isCorrect: correct,
        timeSpentSecs: answer.timeSpentSecs,
        position: answer.position,
      },
    });
    recorded++;
  }

  const merged = mergeIntegrityCounters(
    {
      tabBlurCount: session.tabBlurCount,
      rightClickAttempts: session.rightClickAttempts,
      keyboardShortcutAttempts: session.keyboardShortcutAttempts,
    },
    input.integrity
  );

  await prisma.examSession.update({
    where: { id: session.id },
    data: {
      ...merged,
      completedFullscreen: session.completedFullscreen || input.completedFullscreen,
      suspicionEvents: input.suspicionEvents as unknown as Prisma.InputJsonValue,
    },
  });

  return { ok: true, recorded };
}

// ─────────────────────────────── Resultados ───────────────────────────────

/**
 * Carga la sesión con el guard de F13 tarea 1: SOLO el dueño, y SOLO si ya
 * terminó. Único punto de esta verificación — lo comparten `loadSimulatorResult`
 * y `loadSimulatorReview` para que ninguno pueda quedar desalineado del otro.
 */
async function loadOwnedFinishedSession(
  userProfileId: string,
  sessionId: string
): Promise<SimulatorSessionWithAnswers | null> {
  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: simulatorSessionInclude,
  });
  if (!session || session.userProfileId !== userProfileId) return null;
  if (!FINISHED_STATUSES.includes(session.status)) return null;
  return session;
}

export interface SubjectResult {
  subjectId: string;
  subjectName: string;
  correct: number;
  total: number;
  /** Color determinista para el desglose (F13 tarea 3) — ver subjectColors.ts. */
  colorHex: string;
}

export interface SimulatorResultData {
  sessionId: string;
  examId: string;
  score: number;
  servedCount: number;
  examTotalQuestions: number;
  elapsedSecs: number;
  timeLimitSecs: number;
  status: SessionStatus;
  avgSecsPerQuestion: number;
  subjects: SubjectResult[];
  integrity: IntegrityCounters;
  suspicionEvents: SuspicionInfoEvent[];
  strategy: CareerStrategyResponse | null;
  /** Cambio del Aciertómetro causado por ESTA sesión. `null` sin línea base (F13 tarea 5). */
  predictionDelta: number | null;
  /** Percentil vs. otros usuarios del mismo examen. `null` con muestra chica (F13 tarea 6). */
  percentile: number | null;
}

/** Sesión terminada del usuario, con desglose por materia (para resultados). */
export async function loadSimulatorResult(
  userProfileId: string,
  sessionId: string
): Promise<SimulatorResultData | null> {
  const session = await loadOwnedFinishedSession(userProfileId, sessionId);
  if (!session) return null;

  const [exam, strategy, predictionDelta, otherScores] = await Promise.all([
    prisma.exam.findUnique({
      where: { id: session.examId },
      select: { totalQuestions: true },
    }),
    computeCareerStrategy(userProfileId),
    computeSessionPredictionDelta(userProfileId, sessionId),
    // Percentil (F13 tarea 6): otras sesiones COMPLETADAS del MISMO examen
    // (mismo examId ⇒ misma institución+nivel+año, "mismo ciclo"), excluyendo
    // esta sesión. Cualquier alumno, no solo este usuario — es una comparación
    // contra la comunidad.
    prisma.examSession.findMany({
      where: {
        examId: session.examId,
        mode: 'FULL_SIMULATION',
        status: { in: [...FINISHED_STATUSES] },
        id: { not: sessionId },
        score: { not: null },
      },
      select: { score: true },
    }),
  ]);

  const bySubject = new Map<string, { subjectName: string; correct: number; total: number }>();
  for (const a of session.answers) {
    const subject = a.question.topic.subject;
    const prev = bySubject.get(subject.id) ?? { subjectName: subject.name, correct: 0, total: 0 };
    bySubject.set(subject.id, {
      ...prev,
      correct: prev.correct + (a.isCorrect ? 1 : 0),
      total: prev.total + 1,
    });
  }

  const elapsedSecs = session.finishedAt
    ? computeElapsedSecs(session.startedAt, session.finishedAt)
    : session.timeLimitSecs;
  const servedCount = session.answers.length;
  const score = session.score ?? 0;

  const percentile = computePercentileRank(
    score,
    otherScores.map((s) => s.score as number)
  );

  return {
    sessionId: session.id,
    examId: session.examId,
    score,
    servedCount,
    examTotalQuestions: exam?.totalQuestions ?? servedCount,
    elapsedSecs,
    timeLimitSecs: session.timeLimitSecs,
    status: session.status,
    avgSecsPerQuestion: servedCount > 0 ? Math.round(elapsedSecs / servedCount) : 0,
    subjects: [...bySubject.entries()]
      .map(([subjectId, s]) => ({ subjectId, colorHex: subjectColorFor(subjectId), ...s }))
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName)),
    integrity: readIntegrity(session),
    suspicionEvents: readSuspicionEvents(session.suspicionEvents),
    strategy,
    predictionDelta,
    percentile,
  };
}

// ─────────────────────────────── Revisión de preguntas falladas ───────────────────────────────

export interface RevealedOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface RevealedQuestion {
  id: string;
  stem: string;
  imageUrl: string | null;
  subjectName: string;
  topicName: string;
  options: RevealedOption[];
  selectedOption: string | null;
  /** Capa 1 de explicación (siempre gratis — F9) si el reactivo la tiene generada. */
  explanation: { title: string; content: string } | null;
}

/**
 * Preguntas FALLADAS de una sesión terminada, con la respuesta correcta ya
 * revelada (F13 tareas 8 y 9 — legítimo solo porque `loadOwnedFinishedSession`
 * ya confirmó que la sesión es del dueño Y ya terminó). Trae la Capa 1 de
 * explicación (siempre gratis, F9 `canViewExplanationLayer`) si existe; capas
 * 2+ son alcance de F14 (drill + capas de profundidad), no de esta pantalla.
 */
export async function loadSimulatorReview(
  userProfileId: string,
  sessionId: string
): Promise<RevealedQuestion[] | null> {
  const session = await loadOwnedFinishedSession(userProfileId, sessionId);
  if (!session) return null;

  const failed = session.answers.filter((a) => !a.isCorrect);
  const questionIds = failed.map((a) => a.question.id);
  const explanations = await prisma.explanationLayer.findMany({
    where: { questionId: { in: questionIds }, layer: 1 },
    select: { questionId: true, title: true, content: true },
  });
  const explanationByQuestion = new Map(explanations.map((e) => [e.questionId, e]));

  return failed.map((a) => {
    const options = parseQuestionOptions(a.question.options);
    const explanation = explanationByQuestion.get(a.question.id);
    return {
      id: a.question.id,
      stem: a.question.stem,
      imageUrl: a.question.imageUrl,
      subjectName: a.question.topic.subject.name,
      topicName: a.question.topic.name,
      options: options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
      selectedOption: a.selectedOption,
      explanation: explanation ? { title: explanation.title, content: explanation.content } : null,
    };
  });
}
