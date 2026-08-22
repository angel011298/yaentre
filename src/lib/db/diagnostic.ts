import { Prisma, type ExamSession, type SessionStatus } from '@prisma/client';
import { prisma } from './prisma';
import * as sessionsDb from './sessions';
import { computeCareerStrategy, type CareerStrategyResponse } from './adaptive';
import { allocateDiagnosticQuestions, type SubjectAvailability } from '@/lib/diagnostic/distribution';
import { isSessionStale, parseQuestionOptions } from '@/lib/sessions/scoring';

/**
 * Orquestación del diagnóstico inicial (F7): arma el set de 30 reactivos
 * ponderado por materia (src/lib/diagnostic/distribution.ts), abre la sesión
 * con límite de 45 min, y resuelve el estado a mostrar en /diagnostico
 * (retomar / resultados / ninguno). El scoring y el motor adaptativo ya
 * existen (F2/F6) y se reusan sin modificarlos.
 */

export const DIAGNOSTIC_QUESTION_COUNT = 30;
export const DIAGNOSTIC_TIME_LIMIT_SECS = 45 * 60;

/** Baraja Fisher-Yates. Impuro a propósito: qué reactivo específico le toca
 * a cada alumno no es una regla de negocio que deba ser determinista/testeada
 * (a diferencia de CUÁNTOS reactivos le tocan a cada materia). */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface SubjectPool {
  subjectId: string;
  weight: number;
  questionIds: string[];
}

/** Pool de reactivos servibles del área, agrupado por materia (GUARDRAIL: usage SERVABLE + verificado). */
async function loadAreaSubjectPools(areaId: string): Promise<SubjectPool[]> {
  const subjects = await prisma.subject.findMany({
    where: { areaId },
    select: {
      id: true,
      questionWeight: true,
      topics: {
        select: {
          questions: {
            where: { usage: 'SERVABLE', isVerified: true },
            select: { id: true },
          },
        },
      },
    },
  });

  return subjects.map((s) => ({
    subjectId: s.id,
    weight: s.questionWeight,
    questionIds: s.topics.flatMap((t) => t.questions.map((q) => q.id)),
  }));
}

export interface DiagnosticQuestionSet {
  questionIds: string[];
  subjectsCovered: number;
}

/**
 * Arma el set de reactivos del diagnóstico: reparto por peso de materia
 * (Task 1) recortado a la disponibilidad real, selección aleatoria dentro de
 * cada materia y orden final mezclado (no agrupado por materia). Puede
 * devolver MENOS de `total` si el área no tiene contenido suficiente — un
 * diagnóstico corto es preferible a uno que falla.
 */
export async function buildDiagnosticQuestionSet(
  areaId: string,
  total: number = DIAGNOSTIC_QUESTION_COUNT
): Promise<DiagnosticQuestionSet> {
  const pools = await loadAreaSubjectPools(areaId);
  const availability: SubjectAvailability[] = pools.map((p) => ({
    subjectId: p.subjectId,
    weight: p.weight,
    available: p.questionIds.length,
  }));

  const allocation = allocateDiagnosticQuestions(availability, total);

  const selected: string[] = [];
  for (const pool of pools) {
    const count = allocation.get(pool.subjectId) ?? 0;
    if (count <= 0) continue;
    selected.push(...shuffle(pool.questionIds).slice(0, count));
  }

  const subjectsCovered = [...allocation.values()].filter((c) => c > 0).length;
  return { questionIds: shuffle(selected), subjectsCovered };
}

export type DiagnosticStartError = 'NO_TARGET' | 'NO_CONTENT';
export type DiagnosticStartResult =
  | { ok: true; session: ExamSession }
  | { ok: false; code: DiagnosticStartError };

/**
 * Abre la sesión diagnóstica real: 45 min (a diferencia del examen completo,
 * que usaría `exam.durationMins`), y pre-crea las 30 filas `SessionAnswer`
 * (selectedOption=null) desde el arranque. Esto es lo que permite retomar un
 * diagnóstico a medias sin guardar el set de preguntas en ningún otro lado:
 * el set completo de 30 SIEMPRE vive en `session.answers`, respondidas o no.
 */
export async function startDiagnosticSession(userProfileId: string): Promise<DiagnosticStartResult> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: { targetExamId: true, targetCareer: { select: { areaId: true } } },
  });

  const areaId = profile?.targetCareer?.areaId;
  if (!profile?.targetExamId || !areaId) {
    return { ok: false, code: 'NO_TARGET' };
  }

  const { questionIds } = await buildDiagnosticQuestionSet(areaId);
  if (questionIds.length === 0) {
    return { ok: false, code: 'NO_CONTENT' };
  }

  const session = await sessionsDb.startSession({
    userProfileId,
    examId: profile.targetExamId,
    mode: 'DIAGNOSTIC',
    timeLimitSecs: DIAGNOSTIC_TIME_LIMIT_SECS,
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

  return { ok: true, session };
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

const diagnosticSessionInclude = {
  answers: { orderBy: { position: 'asc' }, include: questionInclude },
} satisfies Prisma.ExamSessionInclude;

export type DiagnosticSessionWithAnswers = Prisma.ExamSessionGetPayload<{
  include: typeof diagnosticSessionInclude;
}>;

export type DiagnosticState =
  | { kind: 'in_progress'; session: DiagnosticSessionWithAnswers }
  | { kind: 'completed'; session: DiagnosticSessionWithAnswers }
  | { kind: 'none' };

const ACTIVE_STATUSES: SessionStatus[] = ['IN_PROGRESS'];
const FINISHED_STATUSES: SessionStatus[] = ['COMPLETED', 'COMPLETED_BY_TIMEOUT'];

/**
 * Resuelve qué mostrar en /diagnostico: la sesión diagnóstica más reciente
 * del alumno. Si sigue IN_PROGRESS pero lleva >24h abierta, se cierra como
 * ABANDONED aquí mismo (mismo umbral que assertActionable en sessions.ts) y
 * se trata como si no existiera — la página deberá abrir una nueva.
 */
export async function loadDiagnosticState(
  userProfileId: string,
  now: Date = new Date()
): Promise<DiagnosticState> {
  const session = await prisma.examSession.findFirst({
    where: { userProfileId, mode: 'DIAGNOSTIC' },
    orderBy: { startedAt: 'desc' },
    include: diagnosticSessionInclude,
  });

  if (!session) return { kind: 'none' };

  if (ACTIVE_STATUSES.includes(session.status)) {
    if (isSessionStale(session.startedAt, now)) {
      await prisma.examSession.update({
        where: { id: session.id },
        data: { status: 'ABANDONED', finishedAt: now },
      });
      return { kind: 'none' };
    }
    return { kind: 'in_progress', session };
  }

  if (FINISHED_STATUSES.includes(session.status)) {
    return { kind: 'completed', session };
  }

  return { kind: 'none' };
}

/** Reactivo saneado para el cliente: NUNCA incluye `isCorrect` (guardrail CLAUDE.md). */
export interface RunnerQuestion {
  id: string;
  stem: string;
  imageUrl: string | null;
  format: string;
  options: Array<{ id: string; text: string }>;
  passage: { title: string | null; content: string; sourceRef: string | null } | null;
  topicId: string;
  topicName: string;
  subjectName: string;
}

export interface RunnerAnswerState {
  questionId: string;
  position: number;
  selectedOption: string | null;
}

export function toRunnerQuestion(question: DiagnosticSessionWithAnswers['answers'][number]['question']): RunnerQuestion {
  const options = parseQuestionOptions(question.options).map(({ id, text }) => ({ id, text }));
  return {
    id: question.id,
    stem: question.stem,
    imageUrl: question.imageUrl,
    format: question.format,
    options,
    passage: question.passage
      ? { title: question.passage.title, content: question.passage.content, sourceRef: question.passage.sourceRef }
      : null,
    topicId: question.topic.id,
    topicName: question.topic.name,
    subjectName: question.topic.subject.name,
  };
}

export interface WeakTopicSummary {
  topicId: string;
  topicName: string;
  subjectName: string;
  hitRate: number;
}

async function loadTopWeakTopics(userProfileId: string, limit = 3): Promise<WeakTopicSummary[]> {
  const rows = await prisma.weakTopic.findMany({
    where: { userProfileId },
    orderBy: { hitRate: 'asc' },
    take: limit,
    include: { topic: { select: { name: true, subject: { select: { name: true } } } } },
  });

  return rows.map((r) => ({
    topicId: r.topicId,
    topicName: r.topic.name,
    subjectName: r.topic.subject.name,
    hitRate: r.hitRate,
  }));
}

/**
 * Ranking de temas débiles a partir de ESTA sesión únicamente (sin el umbral
 * de `MIN_TOPIC_ATTEMPTS` del motor adaptativo — F6). Necesario porque el
 * diagnóstico reparte 30 reactivos entre docenas de temas: casi ningún tema
 * llega a los 3 intentos que exige `WeakTopic` para el historial acumulado,
 * así que justo después del PRIMER diagnóstico esa tabla suele estar vacía.
 * Aquí "débil" es simplemente "le fue peor en esta sesión" — suficiente para
 * una primera prioridad, aunque la muestra sea de 1 reactivo.
 */
function rankWeakestFromSession(
  session: DiagnosticSessionWithAnswers,
  limit: number
): WeakTopicSummary[] {
  const byTopic = new Map<
    string,
    { topicName: string; subjectName: string; correct: number; attempts: number }
  >();

  for (const a of session.answers) {
    if (a.selectedOption === null) continue; // sin respuesta no es evidencia de dominio
    const topicId = a.question.topic.id;
    const prev = byTopic.get(topicId) ?? {
      topicName: a.question.topic.name,
      subjectName: a.question.topic.subject.name,
      correct: 0,
      attempts: 0,
    };
    byTopic.set(topicId, {
      ...prev,
      correct: prev.correct + (a.isCorrect ? 1 : 0),
      attempts: prev.attempts + 1,
    });
  }

  return [...byTopic.entries()]
    .map(([topicId, s]) => ({
      topicId,
      topicName: s.topicName,
      subjectName: s.subjectName,
      hitRate: s.correct / s.attempts,
    }))
    .sort((a, b) => a.hitRate - b.hitRate)
    .slice(0, limit);
}

export interface DiagnosticResultsData {
  diagnosticScore: number;
  diagnosticTotal: number;
  examTotalQuestions: number;
  weakTopics: WeakTopicSummary[];
  strategy: CareerStrategyResponse | null;
}

/** Datos completos de la pantalla de resultados (Task 3): score crudo del
 * diagnóstico, Entrómetro (predicción sobre el examen real), gap vs meta de
 * carrera y los 3 temas más débiles. Todo ya persistido por finishSession →
 * onSessionFinished (F6) antes de que esta función se llame. */
export async function loadDiagnosticResultsData(
  userProfileId: string,
  session: DiagnosticSessionWithAnswers
): Promise<DiagnosticResultsData> {
  const WEAK_TOPICS_LIMIT = 3;
  const [exam, persistedWeak, strategy] = await Promise.all([
    prisma.exam.findUnique({ where: { id: session.examId }, select: { totalQuestions: true } }),
    loadTopWeakTopics(userProfileId, WEAK_TOPICS_LIMIT),
    computeCareerStrategy(userProfileId),
  ]);

  // El historial acumulado (WeakTopic) manda cuando ya tiene suficiente
  // evidencia; el ranking de esta sesión rellena lo que falte — ver
  // rankWeakestFromSession arriba para el porqué.
  const weakTopics = [...persistedWeak];
  const seen = new Set(weakTopics.map((t) => t.topicId));
  for (const t of rankWeakestFromSession(session, WEAK_TOPICS_LIMIT)) {
    if (weakTopics.length >= WEAK_TOPICS_LIMIT) break;
    if (!seen.has(t.topicId)) {
      weakTopics.push(t);
      seen.add(t.topicId);
    }
  }

  return {
    diagnosticScore: session.score ?? 0,
    diagnosticTotal: session.answers.length,
    examTotalQuestions: exam?.totalQuestions ?? 0,
    weakTopics,
    strategy,
  };
}
