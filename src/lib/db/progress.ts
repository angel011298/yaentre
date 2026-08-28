import { prisma } from './prisma';
import { toDateKey } from './dashboard';
import { loadAreaSharedContent } from './shared-content';
import { startOfMexicoDay } from '@/lib/paywall/mexico-time';
import { predictScore, subjectHasSufficientData } from '@/lib/adaptive/predictor';
import {
  aggregateSharedSubjectPerformance,
  canonicalSubjectKey,
  type SubjectAnswer,
} from '@/lib/content/shared-subjects';

/**
 * Orquestación de la pantalla de progreso (F18): mismo estilo que
 * `src/lib/db/dashboard.ts` (F11) — cada loader es una consulta enfocada de
 * solo lectura, la página las combina con Promise.all. Nada de datos de
 * ejemplo: sin historial real, cada loader devuelve `[]`/valores en 0 y la
 * página decide el estado vacío.
 */

const FINISHED_STATUSES = ['COMPLETED', 'COMPLETED_BY_TIMEOUT'] as const;

/** Tope de puntos en el gráfico histórico — evita un eje ilegible con
 *  alumnos muy activos; siempre conserva los más recientes. */
const HISTORY_MAX_POINTS = 30;

// ───────────────────────── Evolución del Entrómetro ─────────────────────────

export interface EntrometroHistoryPoint {
  /** YYYY-MM-DD en huso de México. */
  date: string;
  predictedScore: number;
}

/**
 * Reconstruye la evolución del Entrómetro a lo largo del tiempo. NO existe
 * una tabla de snapshots (y no se agrega una — CLAUDE.md prohíbe tocar el
 * schema sin instrucción explícita): en vez de eso, se recorren las sesiones
 * terminadas en orden cronológico acumulando aciertos/intentos por materia y
 * se llama a `predictScore` (puro, F6) después de cada una — exactamente la
 * misma técnica de reconstrucción que ya usa `computeWeekOverWeekDelta`
 * (src/lib/db/adaptive.ts) para el delta semanal, aquí aplicada punto por
 * punto en vez de a un solo corte. Un día con varias sesiones se colapsa a un
 * único punto (el valor tras la última sesión de ese día).
 */
export async function loadEntrometroHistory(
  userProfileId: string
): Promise<EntrometroHistoryPoint[]> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: { targetCareer: { select: { areaId: true, area: { select: { exam: { select: { totalQuestions: true } } } } } } },
  });
  const areaId = profile?.targetCareer?.areaId;
  const totalQuestions = profile?.targetCareer?.area.exam.totalQuestions;
  if (!areaId || totalQuestions == null) return [];

  // G26: agregación por materia equivalente del área (contenido compartido).
  const shared = await loadAreaSharedContent(areaId);
  if (shared.areaSubjects.length === 0) return [];

  const sessions = await prisma.examSession.findMany({
    where: { userProfileId, status: { in: [...FINISHED_STATUSES] }, finishedAt: { not: null } },
    orderBy: { finishedAt: 'asc' },
    select: {
      finishedAt: true,
      answers: {
        select: { isCorrect: true, question: { select: { topic: { select: { subjectId: true } } } } },
      },
    },
  });
  if (sessions.length === 0) return [];

  const answersSoFar: SubjectAnswer[] = [];
  const byDay = new Map<string, number>();
  const dayOrder: string[] = [];

  for (const session of sessions) {
    for (const a of session.answers) {
      answersSoFar.push({ subjectId: a.question.topic.subjectId, isCorrect: a.isCorrect });
    }

    const perf = aggregateSharedSubjectPerformance(
      answersSoFar,
      shared.areaSubjects,
      shared.keyBySubjectId,
    );
    const { predictedScore } = predictScore({ subjects: perf, totalQuestions });

    const dateKey = toDateKey(startOfMexicoDay(session.finishedAt as Date));
    if (!byDay.has(dateKey)) dayOrder.push(dateKey);
    byDay.set(dateKey, predictedScore);
  }

  return dayOrder.slice(-HISTORY_MAX_POINTS).map((date) => ({ date, predictedScore: byDay.get(date)! }));
}

// ───────────────────────── Dominio por materia ─────────────────────────

export interface SubjectMastery {
  subjectId: string;
  subjectName: string;
  hitRate: number;
  attempts: number;
  hasEnoughData: boolean;
}

/**
 * Dominio por materia del ÁREA elegida, de más débil a más fuerte. Incluye
 * las materias SIN ningún intento (0%, "sin intentos todavía") — así el
 * alumno ve el mapa completo de su área, no solo lo que ya practicó.
 */
export async function loadSubjectMastery(userProfileId: string): Promise<SubjectMastery[]> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: { targetCareer: { select: { areaId: true } } },
  });
  const areaId = profile?.targetCareer?.areaId;
  if (!areaId) return [];

  // G26: el pool de cada materia del área incluye sus materias equivalentes en
  // otras áreas — así el dominio de "Química" refleja TODA la práctica de
  // Química del alumno, aunque algunos reactivos vivan bajo otra área.
  const shared = await loadAreaSharedContent(areaId);
  if (shared.areaSubjects.length === 0) return [];

  const subjects = await prisma.subject.findMany({
    where: { id: { in: shared.areaSubjects.map((s) => s.subjectId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(subjects.map((s) => [s.id, s.name]));

  const answers = await prisma.sessionAnswer.findMany({
    where: {
      session: { userProfileId, status: { in: [...FINISHED_STATUSES] } },
      question: { topic: { subject: { id: { in: shared.poolSubjectIds } } } },
    },
    select: { isCorrect: true, question: { select: { topic: { select: { subjectId: true } } } } },
  });

  // Agregación por clave canónica: la respuesta a una materia hermana suma a la
  // materia del área del alumno.
  const canonicalOfAreaSubject = new Map(
    shared.areaSubjects.map((s) => [s.subjectId, s.sharedContentKey ?? s.subjectId]),
  );
  const byCanonical = new Map<string, { correct: number; attempts: number }>();
  for (const a of answers) {
    const key = canonicalSubjectKey(a.question.topic.subjectId, shared.keyBySubjectId);
    const prev = byCanonical.get(key) ?? { correct: 0, attempts: 0 };
    byCanonical.set(key, {
      correct: prev.correct + (a.isCorrect ? 1 : 0),
      attempts: prev.attempts + 1,
    });
  }

  return shared.areaSubjects
    .map((s) => {
      const agg = byCanonical.get(canonicalOfAreaSubject.get(s.subjectId)!) ?? { correct: 0, attempts: 0 };
      return {
        subjectId: s.subjectId,
        subjectName: nameById.get(s.subjectId) ?? '',
        hitRate: agg.attempts > 0 ? agg.correct / agg.attempts : 0,
        attempts: agg.attempts,
        hasEnoughData: subjectHasSufficientData(agg.attempts),
      };
    })
    .sort((a, b) => a.hitRate - b.hitRate);
}

// ───────────────────────── Historial de simulacros ─────────────────────────

export interface SimulationHistoryEntry {
  id: string;
  score: number | null;
  totalQuestions: number;
  finishedAt: Date;
  percentile: number | null;
}

/** Historial COMPLETO de simulacros terminados (a diferencia de
 *  `loadRecentSimulations`, sin límite) — cada uno enlaza a su resultado real. */
export async function loadSimulationHistory(userProfileId: string): Promise<SimulationHistoryEntry[]> {
  const rows = await prisma.examSession.findMany({
    where: { userProfileId, mode: 'FULL_SIMULATION', status: { in: [...FINISHED_STATUSES] } },
    orderBy: { finishedAt: 'desc' },
    select: {
      id: true,
      score: true,
      finishedAt: true,
      percentile: true,
      exam: { select: { totalQuestions: true } },
    },
  });

  return rows
    .filter((r) => r.finishedAt !== null)
    .map((r) => ({
      id: r.id,
      score: r.score,
      totalQuestions: r.exam.totalQuestions,
      finishedAt: r.finishedAt as Date,
      percentile: r.percentile,
    }));
}

// ───────────────────────── Estadísticas acumuladas ─────────────────────────

export interface CumulativeStats {
  totalAnswered: number;
  overallHitRate: number;
  studyHours: number;
  longestStreak: number;
}

export async function loadCumulativeStats(userProfileId: string): Promise<CumulativeStats> {
  const [answers, sessions, streak] = await Promise.all([
    prisma.sessionAnswer.findMany({
      where: {
        session: { userProfileId, status: { in: [...FINISHED_STATUSES] } },
        selectedOption: { not: null },
      },
      select: { isCorrect: true },
    }),
    prisma.examSession.findMany({
      where: { userProfileId, status: { in: [...FINISHED_STATUSES] } },
      select: { startedAt: true, finishedAt: true },
    }),
    prisma.streakRecord.findUnique({ where: { userProfileId }, select: { longestStreak: true } }),
  ]);

  const totalAnswered = answers.length;
  const overallHitRate =
    totalAnswered > 0 ? answers.filter((a) => a.isCorrect).length / totalAnswered : 0;

  const totalStudyMs = sessions.reduce(
    (acc, s) => acc + (s.finishedAt ? s.finishedAt.getTime() - s.startedAt.getTime() : 0),
    0
  );

  return {
    totalAnswered,
    overallHitRate,
    studyHours: totalStudyMs / 3_600_000,
    longestStreak: streak?.longestStreak ?? 0,
  };
}
