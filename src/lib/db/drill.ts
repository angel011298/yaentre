import type { SessionMode } from '@prisma/client';
import { prisma } from './prisma';
import { startSessionWithQuestions } from './sessions';
import {
  selectNextAdaptiveQuestions,
  selectSubjectAdaptiveQuestions,
  selectTopicQuestions,
} from './adaptive';
import { loadWeakestTopics, type WeakTopicSummary } from './dashboard';
import { loadAreaCoverage } from './area-coverage';
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
  /**
   * G74 — reactivos servibles de ESTE tema. La práctica por tema
   * (`selectTopicQuestions`) no expande el pool compartido de G26 —es la única
   * selección que no lo hace, a propósito: «practicar Ortografía» significa
   * ese tema y no su equivalente de otra área—, así que aquí la cuenta es la
   * propia, no la efectiva de la materia.
   */
  servable: number;
}

export interface PracticeSubject {
  subjectId: string;
  subjectName: string;
  topics: PracticeTopic[];
  /**
   * G74 — reactivos servibles que el alumno puede recibir de esta materia,
   * incluido el pool compartido (`selectSubjectAdaptiveQuestions` sí lo
   * expande). 0 ⇒ la materia no se ofrece como botón: se explica.
   */
  servable: number;
}

export interface PracticeOptions {
  examId: string;
  examActive: boolean;
  areaId: string;
  subjects: PracticeSubject[];
  /** Temas más débiles reales (F6/F11) — para destacar "reforzar débiles". */
  weakTopics: WeakTopicSummary[];
}

/**
 * Materias/temas del área del alumno + sus temas más débiles reales (Task 1).
 *
 * G74: cada materia y cada tema vienen con su censo REAL de reactivos
 * servibles. Antes no: la pantalla ofrecía «Inglés» a un alumno de la UNAM
 * igual que «Matemáticas», y el pool de `UNAM:INGLES` está vacío en las cuatro
 * áreas — clic, `NO_CONTENT`, una línea roja de error, y ninguna explicación
 * de por qué. El censo se calcula aquí para que la UI no tenga que adivinarlo
 * ni descubrirlo fallando.
 */
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

  const [subjects, weakTopics, coverage, topicCounts] = await Promise.all([
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
    loadAreaCoverage(areaId),
    prisma.question.groupBy({
      by: ['topicId'],
      where: { usage: 'SERVABLE', isVerified: true, topic: { subject: { areaId } } },
      _count: { _all: true },
    }),
  ]);

  // Pool EFECTIVO por materia (incluye el compartido de G26), tal como lo verá
  // `selectSubjectAdaptiveQuestions`.
  const servableBySubject = new Map(
    (coverage?.subjects ?? []).map((s) => [s.subjectId, s.servable])
  );
  const servableByTopic = new Map(topicCounts.map((t) => [t.topicId, t._count._all]));

  return {
    examId: profile.targetExamId,
    examActive: profile.targetExam?.isActive ?? true,
    areaId,
    subjects: subjects.map((s) => ({
      subjectId: s.id,
      subjectName: s.name,
      servable: servableBySubject.get(s.id) ?? 0,
      topics: s.topics.map((t) => ({
        topicId: t.id,
        topicName: t.name,
        servable: servableByTopic.get(t.id) ?? 0,
      })),
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

  // G74: `servable === 0` se rechaza ANTES de tocar el selector. El resultado
  // para el alumno es el mismo `NO_CONTENT`, pero así la razón queda dicha en
  // un solo sitio y la pantalla puede explicarla sin haber hecho el viaje.
  if (scope.kind === 'topic') {
    const topic = options.subjects.flatMap((s) => s.topics).find((t) => t.topicId === scope.topicId);
    if (!topic || topic.servable === 0) return { ok: false, code: 'NO_CONTENT' };
    scopeLabel = topic.topicName;
    selection = await selectTopicQuestions(userProfileId, scope.topicId, count);
  } else if (scope.kind === 'subject') {
    const subject = options.subjects.find((s) => s.subjectId === scope.subjectId);
    if (!subject || subject.servable === 0) return { ok: false, code: 'NO_CONTENT' };
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

export type RevealLayerError = 'NOT_FOUND' | 'PAYWALL' | 'NOT_ANSWERED';
export type RevealLayerResult =
  | { ok: true; data: ExplanationLayerContent }
  | { ok: false; code: RevealLayerError; trigger?: PaywallTrigger };

/**
 * G65 🟠 — ¿este alumno ya se ganó el derecho a ver la explicación de este
 * reactivo?
 *
 * La capa 1 («¿Por qué es correcta?») dice, literalmente, cuál es la respuesta
 * correcta, y era gratis y sin contexto: `revealExplanationLayer` aceptaba
 * cualquier `questionId`. Comprobado en vivo — durante un simulacro en curso,
 * pedir la capa 1 de un reactivo del propio examen devolvía la explicación con
 * la clave dentro. Misma fuga que la de `submitAnswer`, por otra puerta.
 *
 * La regla que sí distingue el uso legítimo del abuso: solo se explica un
 * reactivo que el alumno YA RESPONDIÓ, y en una sesión que ya reveló (o va a
 * revelar) la correctitud de todas formas —
 *
 *   • sesión terminada (COMPLETED / COMPLETED_BY_TIMEOUT / ABANDONED): es la
 *     pantalla de repaso, donde ver la respuesta es el propósito; o
 *   • práctica libre (TOPIC_DRILL / AREA_PRACTICE) con la respuesta ya
 *     enviada: es el flujo de `DrillRunner`, que muestra el acordeón justo
 *     después de contestar.
 *
 * Un reactivo de un simulacro o diagnóstico EN CURSO no cumple ninguna de las
 * dos, aunque ya esté contestado — que es exactamente lo que se quería cerrar.
 */
const REVEALING_MODES: SessionMode[] = ['TOPIC_DRILL', 'AREA_PRACTICE'];

async function hasEarnedExplanation(
  userProfileId: string,
  questionId: string
): Promise<boolean> {
  const answer = await prisma.sessionAnswer.findFirst({
    where: {
      questionId,
      selectedOption: { not: null },
      session: {
        userProfileId,
        OR: [
          { status: { in: ['COMPLETED', 'COMPLETED_BY_TIMEOUT', 'ABANDONED'] } },
          { mode: { in: REVEALING_MODES } },
        ],
      },
    },
    select: { id: true },
  });
  return answer !== null;
}

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
  // G65: el candado de propiedad va PRIMERO — antes que el muro de pago y
  // antes de tocar el contenido. Un reactivo que el alumno no ha respondido en
  // una sesión que revele no se explica ni aunque tenga plan de pago.
  if (!(await hasEarnedExplanation(userProfileId, questionId))) {
    return { ok: false, code: 'NOT_ANSWERED' };
  }

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
