import { prisma } from './prisma';
import { loadAnswerHistory } from './answer-history';
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

  // G59: una sola consulta. La versión anterior pedía las sesiones con sus
  // respuestas anidadas, y eso en Prisma son CUATRO viajes (sesiones →
  // respuestas → reactivos → temas). Aquí el JOIN lo hace Postgres y las filas
  // ya vienen en el orden cronológico que necesita la reconstrucción.
  const rows = await prisma.$queryRaw<
    { sessionId: string; finishedAt: Date; subjectId: string; isCorrect: boolean }[]
  >`
    SELECT s."id"          AS "sessionId",
           s."finishedAt"  AS "finishedAt",
           t."subjectId"   AS "subjectId",
           sa."isCorrect"  AS "isCorrect"
      FROM "exam_sessions" s
      JOIN "session_answers" sa ON sa."sessionId" = s."id"
      JOIN "questions"       q  ON q."id" = sa."questionId"
      JOIN "topics"          t  ON t."id" = q."topicId"
     WHERE s."userProfileId" = ${userProfileId}
       AND s."status" IN ('COMPLETED', 'COMPLETED_BY_TIMEOUT')
       AND s."finishedAt" IS NOT NULL
     ORDER BY s."finishedAt" ASC, s."id" ASC
  `;
  if (rows.length === 0) return [];

  const answersSoFar: SubjectAnswer[] = [];
  const byDay = new Map<string, number>();
  const dayOrder: string[] = [];

  // Un punto por SESIÓN (colapsado por día más abajo): se acumula hasta que
  // cambia el id de sesión, exactamente como el bucle anterior.
  let currentSessionId: string | null = null;
  let currentFinishedAt: Date | null = null;

  const snapshot = (finishedAt: Date): void => {
    const perf = aggregateSharedSubjectPerformance(
      answersSoFar,
      shared.areaSubjects,
      shared.keyBySubjectId,
    );
    const { predictedScore } = predictScore({ subjects: perf, totalQuestions });
    const dateKey = toDateKey(startOfMexicoDay(finishedAt));
    if (!byDay.has(dateKey)) dayOrder.push(dateKey);
    byDay.set(dateKey, predictedScore);
  };

  for (const row of rows) {
    if (currentSessionId !== null && row.sessionId !== currentSessionId) {
      snapshot(currentFinishedAt as Date);
    }
    currentSessionId = row.sessionId;
    currentFinishedAt = row.finishedAt;
    answersSoFar.push({ subjectId: row.subjectId, isCorrect: row.isCorrect });
  }
  if (currentFinishedAt !== null) snapshot(currentFinishedAt);

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

  // G59: el nombre de la materia ya viene con la taxonomía cacheada (una
  // consulta menos) y el historial se acota a las materias del pool en la
  // misma consulta que lo trae.
  const nameById = new Map(shared.areaSubjects.map((s) => [s.subjectId, s.subjectName]));

  const answers = await loadAnswerHistory(userProfileId, { subjectIds: shared.poolSubjectIds });

  // Agregación por clave canónica: la respuesta a una materia hermana suma a la
  // materia del área del alumno.
  const canonicalOfAreaSubject = new Map(
    shared.areaSubjects.map((s) => [s.subjectId, s.sharedContentKey ?? s.subjectId]),
  );
  const byCanonical = new Map<string, { correct: number; attempts: number }>();
  for (const a of answers) {
    const key = canonicalSubjectKey(a.subjectId, shared.keyBySubjectId);
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

/**
 * G59: tres consultas que traían FILAS (todas las respuestas del alumno, todas
 * sus sesiones) solo para contarlas y sumar duraciones, colapsadas en un solo
 * agregado. Contar y sumar es trabajo de la base de datos: el resultado son
 * cuatro números, no miles de renglones cruzando la red.
 */
export async function loadCumulativeStats(userProfileId: string): Promise<CumulativeStats> {
  const rows = await prisma.$queryRaw<
    { totalAnswered: number; correct: number; studySecs: number; longestStreak: number }[]
  >`
    SELECT
      (SELECT count(*)::int
         FROM "session_answers" sa
         JOIN "exam_sessions" s2 ON s2."id" = sa."sessionId"
        WHERE s2."userProfileId" = ${userProfileId}
          AND s2."status" IN ('COMPLETED', 'COMPLETED_BY_TIMEOUT')
          AND sa."selectedOption" IS NOT NULL)                        AS "totalAnswered",
      (SELECT count(*)::int
         FROM "session_answers" sa
         JOIN "exam_sessions" s2 ON s2."id" = sa."sessionId"
        WHERE s2."userProfileId" = ${userProfileId}
          AND s2."status" IN ('COMPLETED', 'COMPLETED_BY_TIMEOUT')
          AND sa."selectedOption" IS NOT NULL
          AND sa."isCorrect")                                         AS "correct",
      (SELECT COALESCE(sum(EXTRACT(EPOCH FROM (s3."finishedAt" - s3."startedAt"))), 0)::int
         FROM "exam_sessions" s3
        WHERE s3."userProfileId" = ${userProfileId}
          AND s3."status" IN ('COMPLETED', 'COMPLETED_BY_TIMEOUT')
          AND s3."finishedAt" IS NOT NULL)                            AS "studySecs",
      (SELECT COALESCE(sr."longestStreak", 0)
         FROM "streak_records" sr
        WHERE sr."userProfileId" = ${userProfileId})                  AS "longestStreak"
  `;

  const r = rows[0] ?? { totalAnswered: 0, correct: 0, studySecs: 0, longestStreak: 0 };

  return {
    totalAnswered: r.totalAnswered,
    overallHitRate: r.totalAnswered > 0 ? r.correct / r.totalAnswered : 0,
    studyHours: r.studySecs / 3600,
    longestStreak: r.longestStreak ?? 0,
  };
}
