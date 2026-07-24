import type { ConfidenceLevel } from '@prisma/client';
import { prisma } from './prisma';
import {
  aggregateTopicStats,
  classifyTopicTier,
  isWeakTopic,
  type AnsweredQuestion,
  type TopicTier,
} from '@/lib/adaptive/topic-stats';
import { predictScore, type SubjectPerformance } from '@/lib/adaptive/predictor';
import {
  RECENT_EXCLUSION_HOURS,
  selectAdaptiveQuestions,
  selectRandomFallback,
  type SelectableQuestion,
} from '@/lib/adaptive/selector';
import {
  recommendCareerStrategy,
  type CareerTarget,
  type StrategyResult,
} from '@/lib/adaptive/career-strategy';
import { recomputeStreak } from './streak';

/**
 * Capa de orquestación del motor adaptativo (F6): conecta el motor PURO
 * (src/lib/adaptive/*) con Prisma. Aquí viven los efectos (leer respuestas,
 * escribir WeakTopic/LearningProfile); el cálculo en sí siempre delega en las
 * funciones puras y deterministas. CERO llamadas a IA en runtime.
 *
 * Sesiones que cuentan como historial: solo las FINALIZADAS (COMPLETED /
 * COMPLETED_BY_TIMEOUT). Las IN_PROGRESS y ABANDONED no aportan a las stats
 * acumuladas. La sesión recién terminada ya está en COMPLETED* cuando se
 * dispara el recálculo (finishSession actualiza el estado antes).
 */

const FINISHED_STATUSES = ['COMPLETED', 'COMPLETED_BY_TIMEOUT'] as const;

interface RawAnswer {
  isCorrect: boolean;
  topicId: string;
  subjectId: string;
}

/** Carga todas las respuestas históricas del alumno (sesiones finalizadas). */
async function loadFinishedAnswers(userProfileId: string): Promise<RawAnswer[]> {
  const rows = await prisma.sessionAnswer.findMany({
    where: {
      session: { userProfileId, status: { in: [...FINISHED_STATUSES] } },
    },
    select: {
      isCorrect: true,
      question: { select: { topicId: true, topic: { select: { subjectId: true } } } },
    },
  });

  return rows.map((r) => ({
    isCorrect: r.isCorrect,
    topicId: r.question.topicId,
    subjectId: r.question.topic.subjectId,
  }));
}

/**
 * Recalcula los temas débiles del alumno a partir de TODO su historial y
 * reemplaza sus filas WeakTopic. La tabla queda con exactamente los temas que
 * cumplen la regla de debilidad (hitRate < 0.60 con ≥ 3 intentos): un tema que
 * mejoró y dejó de ser débil se elimina de la tabla.
 */
export async function recomputeWeakTopics(userProfileId: string): Promise<number> {
  const answers = await loadFinishedAnswers(userProfileId);
  const stats = aggregateTopicStats(
    answers.map((a): AnsweredQuestion => ({ topicId: a.topicId, isCorrect: a.isCorrect }))
  );

  const weakRows = [...stats.values()]
    .filter((s) => isWeakTopic(s.hitRate, s.attempts))
    .map((s) => ({
      userProfileId,
      topicId: s.topicId,
      hitRate: s.hitRate,
      attempts: s.attempts,
    }));

  await prisma.$transaction([
    prisma.weakTopic.deleteMany({ where: { userProfileId } }),
    ...(weakRows.length > 0 ? [prisma.weakTopic.createMany({ data: weakRows })] : []),
  ]);

  return weakRows.length;
}

export interface LearningProfilePrediction {
  predictedScore: number;
  confidence: number;
  subjectsWithData: number;
  totalSubjects: number;
}

/**
 * Recalcula la predicción de aciertos (Aciertómetro) y la persiste en
 * LearningProfile. El alcance de la predicción son las materias del ÁREA
 * elegida por el alumno (su carrera meta define el área); el total de reactivos
 * es el del examen real. Devuelve null si el alumno aún no tiene carrera meta
 * (sin área no hay materias que ponderar).
 */
export async function recomputeLearningProfile(
  userProfileId: string
): Promise<LearningProfilePrediction | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: { targetCareerId: true },
  });
  if (!profile?.targetCareerId) return null;

  const career = await prisma.career.findUnique({
    where: { id: profile.targetCareerId },
    select: {
      area: {
        select: {
          exam: { select: { totalQuestions: true } },
          subjects: { select: { id: true, questionWeight: true } },
        },
      },
    },
  });
  if (!career) return null;

  const { exam, subjects } = career.area;

  const answers = await loadFinishedAnswers(userProfileId);

  // Aciertos e intentos acumulados por materia.
  const bySubject = new Map<string, { correct: number; attempts: number }>();
  for (const a of answers) {
    const prev = bySubject.get(a.subjectId) ?? { correct: 0, attempts: 0 };
    bySubject.set(a.subjectId, {
      correct: prev.correct + (a.isCorrect ? 1 : 0),
      attempts: prev.attempts + 1,
    });
  }

  // TODAS las materias del área (las que el alumno no tocó entran con 0
  // intentos → default pesimista 0.30, bajando la predicción y la confianza).
  const perf: SubjectPerformance[] = subjects.map((s) => {
    const agg = bySubject.get(s.id) ?? { correct: 0, attempts: 0 };
    return {
      subjectId: s.id,
      weight: s.questionWeight,
      correct: agg.correct,
      attempts: agg.attempts,
    };
  });

  const prediction = predictScore({ subjects: perf, totalQuestions: exam.totalQuestions });

  const totalAttempts = answers.length;
  const totalCorrect = answers.reduce((acc, a) => acc + (a.isCorrect ? 1 : 0), 0);

  await prisma.learningProfile.upsert({
    where: { userProfileId },
    create: {
      userProfileId,
      predictedScore: prediction.predictedScore,
      confidence: prediction.confidence,
      lastPredicted: new Date(),
      totalQuestions: totalAttempts,
      correctAnswers: totalCorrect,
    },
    update: {
      predictedScore: prediction.predictedScore,
      confidence: prediction.confidence,
      lastPredicted: new Date(),
      totalQuestions: totalAttempts,
      correctAnswers: totalCorrect,
    },
  });

  return {
    predictedScore: prediction.predictedScore,
    confidence: prediction.confidence,
    subjectsWithData: prediction.subjectsWithData,
    totalSubjects: prediction.totalSubjects,
  };
}

const WEEK_MS = 7 * 24 * 3600 * 1000;

/**
 * Cambio del Aciertómetro respecto a hace una semana (F11 Task 2). NO existe
 * una tabla de historial de predicciones (y no se agrega una — CLAUDE.md
 * prohíbe tocar el schema sin instrucción explícita); en vez de eso, se
 * RECALCULA qué habría predicho el motor hace una semana usando solo las
 * respuestas de ese entonces (`predictScore` es puro y determinista, así que
 * recalcular con un corte de fecha da el mismo resultado que si se hubiera
 * guardado en su momento). El lado "actual" reusa el `LearningProfile.
 * predictedScore` ya persistido (mismo método, sin recalcular dos veces).
 *
 * Devuelve `null` cuando no hay línea base real hace una semana (alumno
 * nuevo) — mostrar "+87" de la nada sería inventar un dato, no medirlo.
 */
export async function computeWeekOverWeekDelta(
  userProfileId: string,
  now: Date = new Date()
): Promise<number | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: { targetCareerId: true, learningProfile: { select: { predictedScore: true } } },
  });
  if (!profile?.targetCareerId || profile.learningProfile?.predictedScore == null) return null;

  const career = await prisma.career.findUnique({
    where: { id: profile.targetCareerId },
    select: {
      area: {
        select: {
          exam: { select: { totalQuestions: true } },
          subjects: { select: { id: true, questionWeight: true } },
        },
      },
    },
  });
  if (!career) return null;
  const { exam, subjects } = career.area;

  const weekAgo = new Date(now.getTime() - WEEK_MS);

  const historicalAnswers = await prisma.sessionAnswer.findMany({
    where: {
      session: {
        userProfileId,
        status: { in: [...FINISHED_STATUSES] },
        startedAt: { lt: weekAgo },
      },
    },
    select: { isCorrect: true, question: { select: { topic: { select: { subjectId: true } } } } },
  });

  if (historicalAnswers.length === 0) return null;

  const bySubject = new Map<string, { correct: number; attempts: number }>();
  for (const a of historicalAnswers) {
    const subjectId = a.question.topic.subjectId;
    const prev = bySubject.get(subjectId) ?? { correct: 0, attempts: 0 };
    bySubject.set(subjectId, {
      correct: prev.correct + (a.isCorrect ? 1 : 0),
      attempts: prev.attempts + 1,
    });
  }

  const perf: SubjectPerformance[] = subjects.map((s) => {
    const agg = bySubject.get(s.id) ?? { correct: 0, attempts: 0 };
    return { subjectId: s.id, weight: s.questionWeight, correct: agg.correct, attempts: agg.attempts };
  });

  const historical = predictScore({ subjects: perf, totalQuestions: exam.totalQuestions });

  return profile.learningProfile.predictedScore - historical.predictedScore;
}

/**
 * Cambio del Aciertómetro causado ESPECÍFICAMENTE por una sesión (F13 tarea
 * 5) — a diferencia de `computeWeekOverWeekDelta` (corte por FECHA), aquí el
 * corte es por SESIÓN: la línea base "antes" se recalcula con TODO el
 * historial EXCLUYENDO las respuestas de `sessionId`, y se compara contra la
 * predicción "después" ya persistida en `LearningProfile` (que `finishSession`
 * ya recalculó incluyendo esta sesión, vía `onSessionFinished`). Mismo patrón
 * defensivo: si esta fue la primera sesión del alumno, no hay "antes" real que
 * comparar — se devuelve `null` en vez de inventar un delta desde 0.
 */
export async function computeSessionPredictionDelta(
  userProfileId: string,
  sessionId: string
): Promise<number | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: { targetCareerId: true, learningProfile: { select: { predictedScore: true } } },
  });
  if (!profile?.targetCareerId || profile.learningProfile?.predictedScore == null) return null;

  const career = await prisma.career.findUnique({
    where: { id: profile.targetCareerId },
    select: {
      area: {
        select: {
          exam: { select: { totalQuestions: true } },
          subjects: { select: { id: true, questionWeight: true } },
        },
      },
    },
  });
  if (!career) return null;
  const { exam, subjects } = career.area;

  const beforeAnswers = await prisma.sessionAnswer.findMany({
    where: {
      session: { userProfileId, status: { in: [...FINISHED_STATUSES] }, id: { not: sessionId } },
    },
    select: { isCorrect: true, question: { select: { topic: { select: { subjectId: true } } } } },
  });

  if (beforeAnswers.length === 0) return null;

  const bySubject = new Map<string, { correct: number; attempts: number }>();
  for (const a of beforeAnswers) {
    const subjectId = a.question.topic.subjectId;
    const prev = bySubject.get(subjectId) ?? { correct: 0, attempts: 0 };
    bySubject.set(subjectId, {
      correct: prev.correct + (a.isCorrect ? 1 : 0),
      attempts: prev.attempts + 1,
    });
  }

  const perf: SubjectPerformance[] = subjects.map((s) => {
    const agg = bySubject.get(s.id) ?? { correct: 0, attempts: 0 };
    return { subjectId: s.id, weight: s.questionWeight, correct: agg.correct, attempts: agg.attempts };
  });

  const before = predictScore({ subjects: perf, totalQuestions: exam.totalQuestions });

  return profile.learningProfile.predictedScore - before.predictedScore;
}

/**
 * Disparador único tras finalizar una sesión (Task 6): recalcula temas débiles
 * y predicción. Robusto — un fallo del recálculo NUNCA debe romper el cierre de
 * la sesión del usuario (la sesión ya quedó finalizada y persistida). Por eso
 * cada paso se envuelve y los errores se registran sin propagarse.
 */
export async function onSessionFinished(userProfileId: string): Promise<void> {
  try {
    await recomputeWeakTopics(userProfileId);
  } catch (err) {
    console.error('[adaptive] recomputeWeakTopics falló', { userProfileId, err });
  }
  try {
    await recomputeLearningProfile(userProfileId);
  } catch (err) {
    console.error('[adaptive] recomputeLearningProfile falló', { userProfileId, err });
  }
  try {
    await recomputeStreak(userProfileId);
  } catch (err) {
    console.error('[adaptive] recomputeStreak falló', { userProfileId, err });
  }
}

/** Clasificación fresca (topicId → tier) de TODOS los temas con historial. */
async function computeTopicTiers(userProfileId: string): Promise<Map<string, TopicTier>> {
  const answers = await loadFinishedAnswers(userProfileId);
  const stats = aggregateTopicStats(
    answers.map((a): AnsweredQuestion => ({ topicId: a.topicId, isCorrect: a.isCorrect }))
  );
  const tiers = new Map<string, TopicTier>();
  for (const s of stats.values()) {
    tiers.set(s.topicId, classifyTopicTier(s.hitRate, s.attempts));
  }
  return tiers;
}

/** Ids de reactivos respondidos en las últimas 72h (no se repiten en el drill).
 *  SessionAnswer no tiene timestamp propio: se usa el startedAt de su sesión. */
async function loadRecentlyAnsweredIds(userProfileId: string): Promise<Set<string>> {
  const cutoff = new Date(Date.now() - RECENT_EXCLUSION_HOURS * 3600 * 1000);
  const rows = await prisma.sessionAnswer.findMany({
    where: { session: { userProfileId, startedAt: { gte: cutoff } } },
    select: { questionId: true },
  });
  return new Set(rows.map((r) => r.questionId));
}

/** Pool de reactivos servibles del área (GUARDRAIL: usage SERVABLE + verificado). */
async function loadAreaServablePool(areaId: string): Promise<SelectableQuestion[]> {
  const rows = await prisma.question.findMany({
    where: {
      usage: 'SERVABLE',
      isVerified: true,
      topic: { subject: { areaId } },
    },
    select: { id: true, topicId: true },
  });
  return rows.map((r) => ({ id: r.id, topicId: r.topicId }));
}

/** Área por defecto del alumno (la de su carrera meta). null si aún no tiene. */
export async function getDefaultAreaId(userProfileId: string): Promise<string | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: { targetCareer: { select: { areaId: true } } },
  });
  return profile?.targetCareer?.areaId ?? null;
}

export interface AdaptiveSelectionResult {
  questionIds: string[];
  fallbackUsed: boolean;
}

/**
 * Selecciona los próximos reactivos adaptativos para una práctica libre en el
 * área dada. Si el cálculo de temas débiles falla por cualquier razón, cae de
 * forma segura a una selección aleatoria del área — la sesión nunca se rompe.
 */
export async function selectNextAdaptiveQuestions(
  userProfileId: string,
  areaId: string,
  count: number
): Promise<AdaptiveSelectionResult> {
  // El pool y la exclusión de 72h son necesarios en ambos caminos (adaptativo
  // y respaldo), así que un fallo AQUÍ sí es fatal para la petición.
  const [pool, excludeQuestionIds] = await Promise.all([
    loadAreaServablePool(areaId),
    loadRecentlyAnsweredIds(userProfileId),
  ]);

  try {
    const topicTier = await computeTopicTiers(userProfileId);
    const questionIds = selectAdaptiveQuestions({
      questions: pool,
      topicTier,
      excludeQuestionIds,
      count,
    });
    return { questionIds, fallbackUsed: false };
  } catch (err) {
    console.error('[adaptive] selección adaptativa falló, usando respaldo aleatorio', {
      userProfileId,
      areaId,
      err,
    });
    const questionIds = selectRandomFallback(pool, excludeQuestionIds, count);
    return { questionIds, fallbackUsed: true };
  }
}

export interface CareerStrategyResponse extends StrategyResult {
  predictedScore: number;
  predictionConfidence: number | null;
}

/**
 * Estrategia de carrera del alumno: compara su predicción contra la meta de su
 * carrera elegida y sugiere alternativas alcanzables. Devuelve null si aún no
 * hay carrera meta. Recalcula la predicción al vuelo para reflejar el estado
 * más reciente.
 */
export async function computeCareerStrategy(
  userProfileId: string
): Promise<CareerStrategyResponse | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: {
      targetCareerId: true,
      learningProfile: { select: { predictedScore: true, confidence: true } },
    },
  });
  if (!profile?.targetCareerId) return null;

  const chosen = await prisma.career.findUnique({
    where: { id: profile.targetCareerId },
    select: {
      id: true,
      name: true,
      minAciertos: true,
      minAciertosYear: true,
      minAciertosConfidence: true,
      areaId: true,
    },
  });
  if (!chosen) return null;

  const areaCareers = await prisma.career.findMany({
    where: { areaId: chosen.areaId },
    select: {
      id: true,
      name: true,
      minAciertos: true,
      minAciertosYear: true,
      minAciertosConfidence: true,
    },
  });

  const toTarget = (c: {
    id: string;
    name: string;
    minAciertos: number | null;
    minAciertosYear: number | null;
    minAciertosConfidence: ConfidenceLevel | null;
  }): CareerTarget => ({
    careerId: c.id,
    name: c.name,
    minAciertos: c.minAciertos,
    minAciertosYear: c.minAciertosYear,
    minAciertosConfidence: c.minAciertosConfidence,
  });

  // Sin predicción previa aún, se asume el escenario más conservador (0).
  const predictedScore = profile.learningProfile?.predictedScore ?? 0;

  const strategy = recommendCareerStrategy({
    predictedScore,
    chosenCareer: toTarget(chosen),
    areaCareers: areaCareers.map(toTarget),
  });

  return {
    ...strategy,
    predictedScore,
    predictionConfidence: profile.learningProfile?.confidence ?? null,
  };
}
