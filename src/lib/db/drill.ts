import type { SessionMode } from '@prisma/client';
import { prisma } from './prisma';
import { startSessionWithQuestions } from './sessions';
import {
  selectNextAdaptiveQuestions,
  selectSubjectAdaptiveQuestions,
  selectTopicQuestions,
} from './adaptive';
import { loadWeakestTopics, type WeakTopicSummary } from './dashboard';
import { evaluateDrillGate, evaluateExplanationLayerGate } from './paywall';
import { toRunnerQuestion, type RunnerQuestion } from './diagnostic';
import { isSessionStale } from '@/lib/sessions/scoring';
import type { GateDecision, PaywallTrigger } from '@/lib/paywall/gates';
import { DEFAULT_ADAPTIVE_COUNT } from '@/lib/adaptive/api';
import { modeForScopeKind } from '@/lib/drill/scope';

/**
 * Orquestación de la práctica libre (F14): conecta el selector adaptativo real
 * (F6) y el muro suave (F9, ya construido) con el motor genérico de sesiones
 * (F2). Reusa `submitAnswer`/`finishSession` de sessions.ts SIN modificarlos —
 * ambos modos de drill (TOPIC_DRILL/AREA_PRACTICE) ya revelan correctitud al
 * responder (`revealsCorrectnessOnSubmit`) y ya disparan el recálculo
 * adaptativo + racha al terminar (`onSessionFinished`, F6/F11).
 */

// Sin límite de tiempo real (Flujo_App §7); se usa un techo generoso porque
// `timeLimitSecs` es NOT NULL en el schema — nadie debería acercarse a esto
// practicando 10 reactivos.
export const DRILL_TIME_LIMIT_SECS = 4 * 3600;

// ─────────────────────────────── Opciones de práctica ───────────────────────────────

export interface PracticeTopic {
  topicId: string;
  topicName: string;
}

export interface PracticeSubject {
  subjectId: string;
  subjectName: string;
  topics: PracticeTopic[];
}

export interface PracticeOptions {
  examId: string;
  examActive: boolean;
  areaId: string;
  subjects: PracticeSubject[];
  /** Temas más débiles reales (F6/F11) — para destacar "reforzar débiles". */
  weakTopics: WeakTopicSummary[];
}

/** Materias/temas del área del alumno + sus temas más débiles reales (Task 1). */
export async function loadPracticeOptions(userProfileId: string): Promise<PracticeOptions | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: {
      targetExamId: true,
      targetExam: { select: { isActive: true } },
      targetCareer: { select: { areaId: true } },
    },
  });
  const areaId = profile?.targetCareer?.areaId;
  if (!profile?.targetExamId || !areaId) return null;

  const [subjects, weakTopics] = await Promise.all([
    prisma.subject.findMany({
      where: { areaId },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        name: true,
        topics: { orderBy: { position: 'asc' }, select: { id: true, name: true } },
      },
    }),
    loadWeakestTopics(userProfileId, 3),
  ]);

  return {
    examId: profile.targetExamId,
    examActive: profile.targetExam?.isActive ?? true,
    areaId,
    subjects: subjects.map((s) => ({
      subjectId: s.id,
      subjectName: s.name,
      topics: s.topics.map((t) => ({ topicId: t.id, topicName: t.name })),
    })),
    weakTopics,
  };
}

// ─────────────────────────────── Acceso (muro suave F9) ───────────────────────────────

export interface DrillAccess {
  decision: GateDecision;
  remainingToday: number | null;
}

export async function evaluateDrillAccess(userProfileId: string): Promise<DrillAccess> {
  const { decision, remainingToday } = await evaluateDrillGate(userProfileId);
  return { decision, remainingToday };
}

// ─────────────────────────────── Sesión de práctica ───────────────────────────────

export type PracticeScope =
  | { kind: 'area' }
  | { kind: 'subject'; subjectId: string }
  | { kind: 'topic'; topicId: string };

export interface DrillPayload {
  sessionId: string;
  mode: SessionMode;
  scopeLabel: string;
  questions: RunnerQuestion[];
  initialSelections: Array<string | null>;
  remainingToday: number | null;
}

export type DrillStartError = 'NO_TARGET' | 'NO_CONTENT' | 'PAYWALL';
export type DrillStartResult =
  | { ok: true; payload: DrillPayload }
  | { ok: false; code: DrillStartError; trigger?: PaywallTrigger };

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
} as const;

/**
 * Abre una sesión de práctica libre. El scope decide TANTO el pool de origen
 * COMO el `SessionMode` que se persiste: `topic` ⇒ TOPIC_DRILL (drilling
 * exactamente un tema, el nombre le queda perfecto); `subject` y `area`
 * ("reforzar débiles", el default) ⇒ AREA_PRACTICE — el schema no distingue
 * "una materia" de "toda el área" con un tercer valor de enum, así que ambos
 * comparten el modo más amplio (no se toca prisma/schema.prisma sin
 * instrucción explícita — CLAUDE.md). El límite diario del muro suave (F9) se
 * valida ANTES de crear nada; el tamaño del lote se recorta a lo que quede hoy.
 */
export async function startDrillSession(
  userProfileId: string,
  scope: PracticeScope
): Promise<DrillStartResult> {
  const options = await loadPracticeOptions(userProfileId);
  if (!options) return { ok: false, code: 'NO_TARGET' };
  if (!options.examActive) return { ok: false, code: 'NO_CONTENT' };

  const access = await evaluateDrillAccess(userProfileId);
  if (!access.decision.allowed) {
    return { ok: false, code: 'PAYWALL', trigger: access.decision.trigger };
  }

  const requestedCount = DEFAULT_ADAPTIVE_COUNT;
  const count =
    access.remainingToday === null ? requestedCount : Math.min(requestedCount, access.remainingToday);
  if (count <= 0) return { ok: false, code: 'PAYWALL', trigger: 'DRILL_DAILY_LIMIT' };

  const mode = modeForScopeKind(scope.kind);
  let scopeLabel: string;
  let selection: { questionIds: string[] };

  if (scope.kind === 'topic') {
    const topic = options.subjects.flatMap((s) => s.topics).find((t) => t.topicId === scope.topicId);
    if (!topic) return { ok: false, code: 'NO_CONTENT' };
    scopeLabel = topic.topicName;
    selection = await selectTopicQuestions(userProfileId, scope.topicId, count);
  } else if (scope.kind === 'subject') {
    const subject = options.subjects.find((s) => s.subjectId === scope.subjectId);
    if (!subject) return { ok: false, code: 'NO_CONTENT' };
    scopeLabel = subject.subjectName;
    selection = await selectSubjectAdaptiveQuestions(userProfileId, scope.subjectId, count);
  } else {
    scopeLabel = 'Reforzar mis temas débiles';
    selection = await selectNextAdaptiveQuestions(userProfileId, options.areaId, count);
  }

  if (selection.questionIds.length === 0) return { ok: false, code: 'NO_CONTENT' };

  // G60: sesión + filas de respuesta en una sola operación atómica — nunca
  // queda una sesión IN_PROGRESS sin reactivos si el segundo INSERT falla.
  const session = await startSessionWithQuestions({
    userProfileId,
    examId: options.examId,
    mode,
    timeLimitSecs: DRILL_TIME_LIMIT_SECS,
    questionIds: selection.questionIds,
  });

  const full = await prisma.examSession.findUniqueOrThrow({
    where: { id: session.id },
    include: { answers: { orderBy: { position: 'asc' }, include: questionInclude } },
  });

  return {
    ok: true,
    payload: {
      sessionId: full.id,
      mode: full.mode,
      scopeLabel,
      questions: full.answers.map((a) => toRunnerQuestion(a.question)),
      initialSelections: full.answers.map((a) => a.selectedOption),
      remainingToday: access.remainingToday,
    },
  };
}

export type DrillState =
  | { kind: 'active'; payload: DrillPayload }
  | { kind: 'none' };

/** Sesión de práctica IN_PROGRESS del alumno, si hay una vigente (retomar). */
export async function loadDrillState(userProfileId: string, now: Date = new Date()): Promise<DrillState> {
  const session = await prisma.examSession.findFirst({
    where: { userProfileId, mode: { in: ['TOPIC_DRILL', 'AREA_PRACTICE'] }, status: 'IN_PROGRESS' },
    orderBy: { startedAt: 'desc' },
    include: { answers: { orderBy: { position: 'asc' }, include: questionInclude } },
  });
  if (!session) return { kind: 'none' };

  if (isSessionStale(session.startedAt, now)) {
    await prisma.examSession.update({
      where: { id: session.id },
      data: { status: 'ABANDONED', finishedAt: now },
    });
    return { kind: 'none' };
  }

  const access = await evaluateDrillAccess(userProfileId);
  const firstQuestion = session.answers[0]?.question;
  const scopeLabel =
    session.mode === 'TOPIC_DRILL'
      ? firstQuestion?.topic.name
      : firstQuestion?.topic.subject.name;

  return {
    kind: 'active',
    payload: {
      sessionId: session.id,
      mode: session.mode,
      scopeLabel: scopeLabel ?? 'Práctica libre',
      questions: session.answers.map((a) => toRunnerQuestion(a.question)),
      initialSelections: session.answers.map((a) => a.selectedOption),
      remainingToday: access.remainingToday,
    },
  };
}

// ─────────────────────────────── Explicación por capas ───────────────────────────────

export interface ExplanationLayerContent {
  layer: number;
  title: string;
  content: string;
}

export type RevealLayerError = 'NOT_FOUND' | 'PAYWALL';
export type RevealLayerResult =
  | { ok: true; data: ExplanationLayerContent }
  | { ok: false; code: RevealLayerError; trigger?: PaywallTrigger };

/**
 * Revela UNA capa de explicación (F14 tarea 4), re-validando el muro suave
 * SIEMPRE server-side en cada clic — nunca se manda contenido de capa 2+ en el
 * payload inicial de la pregunta, solo se busca bajo demanda y solo si el gate
 * lo permite. Capa 4 no vive en la DB (el pipeline de contenido, F4, solo
 * generó 1-3): es una invitación estática a practicar más — la Server Action
 * decide el CTA (topicId) sin necesitar contenido almacenado.
 */
export async function revealExplanationLayer(
  userProfileId: string,
  questionId: string,
  layer: number
): Promise<RevealLayerResult> {
  const gate = await evaluateExplanationLayerGate(userProfileId, layer);
  if (!gate.allowed) return { ok: false, code: 'PAYWALL', trigger: gate.trigger };

  if (layer === 4) {
    return {
      ok: true,
      data: {
        layer: 4,
        title: 'Practica más de esto',
        content: 'Tres reactivos más de este mismo tema, con dificultad escalonada.',
      },
    };
  }

  const row = await prisma.explanationLayer.findUnique({
    where: { questionId_layer: { questionId, layer } },
    select: { title: true, content: true },
  });
  if (!row) return { ok: false, code: 'NOT_FOUND' };

  return { ok: true, data: { layer, title: row.title, content: row.content } };
}

// ─────────────────────────────── Reportar reactivo ───────────────────────────────

export async function reportQuestion(
  reportedByAuthUserId: string,
  questionId: string,
  reason: string | null
): Promise<void> {
  // G60 — un reporte por usuario y reactivo. `QuestionReport` no tiene un
  // unique en (questionId, reportedBy) (no se toca el schema), así que sin
  // este chequeo un solo usuario podía crear N reportes del mismo reactivo y
  // empujarlo él solo al umbral de revisión admin (≥3). Si ya tiene uno sin
  // resolver, esta llamada es un no-op idempotente.
  const already = await prisma.questionReport.findFirst({
    where: { questionId, reportedBy: reportedByAuthUserId, resolved: false },
    select: { id: true },
  });
  if (already) return;

  await prisma.questionReport.create({
    data: { questionId, reportedBy: reportedByAuthUserId, reason },
  });
}
