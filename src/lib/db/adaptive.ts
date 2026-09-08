import type { ConfidenceLevel } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';
import { reportSilentDegradation } from '@/lib/observability/report';
import {
  loadAnswerHistory,
  loadRecentlyAnsweredQuestionIds,
  type AnswerHistoryRow,
} from './answer-history';
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
import { aggregateSharedSubjectPerformance } from '@/lib/content/shared-subjects';
import { loadAreaSharedContent, loadEquivalentSubjectIds } from './shared-content';
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

/**
 * Objetivo de predicción del alumno resuelto en UNA consulta (G59): perfil →
 * carrera meta → área → examen, más la predicción ya persistida.
 *
 * Antes cada consumidor (`recomputeLearningProfile`, los dos deltas del
 * Entrometro y `computeCareerStrategy`) recorría esa cadena por su cuenta con
 * `findUnique` anidados — y como el dashboard llama a tres de ellos en el
 * mismo render, la misma fila de `user_profiles`, `careers`, `areas` y `exams`
 * se leía hasta cuatro veces por página. Un JOIN de cuatro tablas por PK es
 * trabajo despreciable para Postgres; los viajes de red no lo eran.
 */
interface PredictionTarget {
  targetCareerId: string;
  areaId: string;
  totalQuestions: number;
  predictedScore: number | null;
  confidence: number | null;
}

async function loadPredictionTarget(userProfileId: string): Promise<PredictionTarget | null> {
  const rows = await prisma.$queryRaw<PredictionTarget[]>`
    SELECT c."id"              AS "targetCareerId",
           a."id"              AS "areaId",
           e."totalQuestions"  AS "totalQuestions",
           lp."predictedScore" AS "predictedScore",
           lp."confidence"     AS "confidence"
      FROM "user_profiles" up
      JOIN "careers" c ON c."id" = up."targetCareerId"
      JOIN "areas"   a ON a."id" = c."areaId"
      JOIN "exams"   e ON e."id" = a."examId"
      LEFT JOIN "learning_profiles" lp ON lp."userProfileId" = up."id"
     WHERE up."id" = ${userProfileId}
     LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * Recalcula los temas débiles del alumno a partir de TODO su historial y
 * reemplaza sus filas WeakTopic. La tabla queda con exactamente los temas que
 * cumplen la regla de debilidad (hitRate < 0.60 con ≥ 3 intentos): un tema que
 * mejoró y dejó de ser débil se elimina de la tabla.
 */
export async function recomputeWeakTopics(
  userProfileId: string,
  history?: AnswerHistoryRow[]
): Promise<number> {
  const answers = history ?? (await loadAnswerHistory(userProfileId));
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
 * Recalcula la predicción de aciertos (Entrómetro) y la persiste en
 * LearningProfile. El alcance de la predicción son las materias del ÁREA
 * elegida por el alumno (su carrera meta define el área); el total de reactivos
 * es el del examen real. Devuelve null si el alumno aún no tiene carrera meta
 * (sin área no hay materias que ponderar).
 */
export async function recomputeLearningProfile(
  userProfileId: string,
  history?: AnswerHistoryRow[]
): Promise<LearningProfilePrediction | null> {
  const target = await loadPredictionTarget(userProfileId);
  if (!target) return null;

  // G26: las materias del área CON su clave de contenido compartido, y el mapa
  // de claves de TODO el examen — así una respuesta a una materia hermana
  // (mismo temario, otra área) cuenta para la materia del área del alumno.
  const [shared, answers] = await Promise.all([
    loadAreaSharedContent(target.areaId),
    history ? Promise.resolve(history) : loadAnswerHistory(userProfileId),
  ]);

  // TODAS las materias del área (las que el alumno no tocó — ni directamente ni
  // por contenido compartido — entran con 0 intentos → default pesimista 0.30).
  const perf: SubjectPerformance[] = aggregateSharedSubjectPerformance(
    answers.map((a) => ({ subjectId: a.subjectId, isCorrect: a.isCorrect })),
    shared.areaSubjects,
    shared.keyBySubjectId,
  );

  const prediction = predictScore({ subjects: perf, totalQuestions: target.totalQuestions });

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
 * Predice aciertos a partir de un conjunto de respuestas, agregándolas por la
 * materia EQUIVALENTE del área del alumno (G26: una respuesta a una materia
 * hermana con el mismo temario cuenta para la materia del área). Base común de
 * los dos deltas del Entrómetro de abajo — el mismo método que
 * `recomputeLearningProfile`, aplicado a un corte del historial.
 */
async function predictFromAnswers(
  areaId: string,
  totalQuestions: number,
  answers: { subjectId: string; isCorrect: boolean }[]
): Promise<number> {
  const shared = await loadAreaSharedContent(areaId);
  const perf = aggregateSharedSubjectPerformance(answers, shared.areaSubjects, shared.keyBySubjectId);
  return predictScore({ subjects: perf, totalQuestions }).predictedScore;
}

/**
 * Cambio del Entrómetro respecto a hace una semana (F11 Task 2). NO existe
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
  const target = await loadPredictionTarget(userProfileId);
  if (!target || target.predictedScore == null) return null;

  const historicalAnswers = await loadAnswerHistory(userProfileId, {
    startedBefore: new Date(now.getTime() - WEEK_MS),
  });
  if (historicalAnswers.length === 0) return null;

  const historical = await predictFromAnswers(
    target.areaId,
    target.totalQuestions,
    historicalAnswers
  );

  return target.predictedScore - historical;
}

/**
 * Cambio del Entrómetro causado ESPECÍFICAMENTE por una sesión (F13 tarea
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
  const target = await loadPredictionTarget(userProfileId);
  if (!target || target.predictedScore == null) return null;

  const beforeAnswers = await loadAnswerHistory(userProfileId, { excludeSessionId: sessionId });
  if (beforeAnswers.length === 0) return null;

  const before = await predictFromAnswers(
    target.areaId,
    target.totalQuestions,
    beforeAnswers
  );

  return target.predictedScore - before;
}

/**
 * Disparador único tras finalizar una sesión (Task 6): recalcula temas débiles
 * y predicción. Robusto — un fallo del recálculo NUNCA debe romper el cierre de
 * la sesión del usuario (la sesión ya quedó finalizada y persistida). Por eso
 * cada paso se envuelve y los errores se registran sin propagarse.
 */
export async function onSessionFinished(userProfileId: string): Promise<void> {
  // G59: el historial se lee UNA vez y se comparte. Antes cada recálculo lo
  // pedía por su cuenta — dos lecturas completas del historial (seis viajes de
  // red con el `select` anidado de entonces) en el camino crítico del cierre de
  // sesión, que es cuando el alumno está esperando su resultado.
  let history: AnswerHistoryRow[] | undefined;
  try {
    history = await loadAnswerHistory(userProfileId);
  } catch (err) {
    reportSilentDegradation('adaptive_recompute', err, { userProfileId, stage: 'historial' });
  }

  try {
    await recomputeWeakTopics(userProfileId, history);
  } catch (err) {
    reportSilentDegradation('adaptive_recompute', err, { userProfileId, stage: 'weakTopics' });
  }
  try {
    await recomputeLearningProfile(userProfileId, history);
  } catch (err) {
    reportSilentDegradation('adaptive_recompute', err, { userProfileId, stage: 'learningProfile' });
  }
  try {
    await recomputeStreak(userProfileId);
  } catch (err) {
    reportSilentDegradation('adaptive_recompute', err, { userProfileId, stage: 'streak' });
  }
}

/** Clasificación fresca (topicId → tier) de TODOS los temas con historial. */
async function computeTopicTiers(userProfileId: string): Promise<Map<string, TopicTier>> {
  const answers = await loadAnswerHistory(userProfileId);
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
function loadRecentlyAnsweredIds(userProfileId: string): Promise<Set<string>> {
  return loadRecentlyAnsweredQuestionIds(userProfileId, RECENT_EXCLUSION_HOURS);
}

/** F20 tarea 3: mismo criterio de caché que src/lib/db/question-read.ts. */
const QUESTION_BANK_REVALIDATE_SECS = 300;

/**
 * Pool de reactivos servibles del área (GUARDRAIL: usage SERVABLE + verificado).
 * F20 tarea 3: cacheado — no personalizado, mismo pool para cualquier alumno
 * del área, y se pide en CADA inicio de práctica/sesión adaptativa.
 *
 * G26: el pool incluye los reactivos de las materias con contenido equivalente
 * en otras áreas del MISMO examen (`Subject.sharedContentKey`) — p. ej. un
 * alumno de UNAM Área 3 practica Español con los reactivos compuestos para
 * Español de Área 1, porque el temario oficial es el mismo.
 */
const loadAreaServablePool = unstable_cache(
  async (areaId: string): Promise<SelectableQuestion[]> => {
    const { poolSubjectIds } = await loadAreaSharedContent(areaId);
    if (poolSubjectIds.length === 0) return [];
    const rows = await prisma.question.findMany({
      where: {
        usage: 'SERVABLE',
        isVerified: true,
        topic: { subjectId: { in: poolSubjectIds } },
      },
      select: { id: true, topicId: true },
    });
    return rows.map((r) => ({ id: r.id, topicId: r.topicId }));
  },
  ['loadAreaServablePool'],
  { revalidate: QUESTION_BANK_REVALIDATE_SECS }
);

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
    // G73b: el motor adaptativo ES el producto. Caer al respaldo ALEATORIO y
    // no decírselo a nadie convierte la ruta personalizada en un sorteo sin
    // que ninguna métrica lo note — el alumno solo ve reactivos.
    reportSilentDegradation('adaptive_selection', err, { userProfileId, areaId, fallback: 'random' });
    const questionIds = selectRandomFallback(pool, excludeQuestionIds, count);
    return { questionIds, fallbackUsed: true };
  }
}

/**
 * Pool de reactivos servibles de UNA materia (GUARDRAIL: usage SERVABLE +
 * verificado). Cacheado, ver loadAreaServablePool. G26: incluye las materias
 * con contenido equivalente (`Subject.sharedContentKey`) del mismo examen.
 */
const loadSubjectServablePool = unstable_cache(
  async (subjectId: string): Promise<SelectableQuestion[]> => {
    const subjectIds = await loadEquivalentSubjectIds(subjectId);
    const rows = await prisma.question.findMany({
      where: { usage: 'SERVABLE', isVerified: true, topic: { subjectId: { in: subjectIds } } },
      select: { id: true, topicId: true },
    });
    return rows.map((r) => ({ id: r.id, topicId: r.topicId }));
  },
  ['loadSubjectServablePool'],
  { revalidate: QUESTION_BANK_REVALIDATE_SECS }
);

/**
 * Selección adaptativa acotada a UNA materia (F14 Task 1: "practicar por
 * materia"). Mismo motor y misma mezcla 60/25/15 que `selectNextAdaptiveQuestions`
 * — la única diferencia es el pool de origen (una materia en vez de toda el
 * área) — así que reusa exactamente la misma lógica de clasificación y respaldo.
 */
export async function selectSubjectAdaptiveQuestions(
  userProfileId: string,
  subjectId: string,
  count: number
): Promise<AdaptiveSelectionResult> {
  const [pool, excludeQuestionIds] = await Promise.all([
    loadSubjectServablePool(subjectId),
    loadRecentlyAnsweredIds(userProfileId),
  ]);

  try {
    const topicTier = await computeTopicTiers(userProfileId);
    const questionIds = selectAdaptiveQuestions({ questions: pool, topicTier, excludeQuestionIds, count });
    return { questionIds, fallbackUsed: false };
  } catch (err) {
    reportSilentDegradation('adaptive_selection', err, { userProfileId, subjectId, fallback: 'random' });
    const questionIds = selectRandomFallback(pool, excludeQuestionIds, count);
    return { questionIds, fallbackUsed: true };
  }
}

/**
 * Selección acotada a UN tema (F14 Task 1: "practicar por tema específico").
 * Sin mezcla por tier: con un solo tema, la proporción 60/25/15 no aplica (no
 * hay "otros temas" entre los que repartir) — simplemente aleatoria dentro del
 * tema, excluyendo lo respondido en las últimas 72h.
 */
export async function selectTopicQuestions(
  userProfileId: string,
  topicId: string,
  count: number
): Promise<AdaptiveSelectionResult> {
  const [rows, excludeQuestionIds] = await Promise.all([
    prisma.question.findMany({
      where: { usage: 'SERVABLE', isVerified: true, topicId },
      select: { id: true, topicId: true },
    }),
    loadRecentlyAnsweredIds(userProfileId),
  ]);
  const questionIds = selectRandomFallback(rows, excludeQuestionIds, count);
  return { questionIds, fallbackUsed: false };
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
  const target = await loadPredictionTarget(userProfileId);
  if (!target) return null;

  // Todas las carreras del área en UNA consulta (la elegida sale de aquí
  // mismo: ya se sabe que pertenece a esta área).
  const areaCareers = await prisma.career.findMany({
    where: { areaId: target.areaId },
    select: {
      id: true,
      name: true,
      minAciertos: true,
      minAciertosYear: true,
      minAciertosConfidence: true,
    },
  });
  const chosen = areaCareers.find((c) => c.id === target.targetCareerId);
  if (!chosen) return null;

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
  const predictedScore = target.predictedScore ?? 0;

  const strategy = recommendCareerStrategy({
    predictedScore,
    chosenCareer: toTarget(chosen),
    areaCareers: areaCareers.map(toTarget),
  });

  return {
    ...strategy,
    predictedScore,
    predictionConfidence: target.confidence ?? null,
  };
}
