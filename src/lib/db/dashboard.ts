import { prisma } from './prisma';
import { countCompletedFullSimulations, isUserPaid } from './paywall';
import { startOfMexicoDay } from '@/lib/paywall/mexico-time';

/**
 * Orquestación del dashboard del alumno (F11): cada loader es una consulta
 * enfocada y de solo lectura — se llaman todas en paralelo desde la página
 * (Promise.all) en vez de armar aquí una mega-función, siguiendo el mismo
 * patrón que F7/F9. Nada de datos de ejemplo: si no hay historial real, cada
 * loader devuelve `null`/`[]` y la página decide el estado vacío.
 */

const FINISHED_STATUSES = ['COMPLETED', 'COMPLETED_BY_TIMEOUT'] as const;
const HEATMAP_DAYS = 90;
const HEATMAP_FULL_MINUTES = 30;

// ─────────────────────────── Saludo + cuenta regresiva ───────────────────────────

export interface ExamCountdown {
  examName: string;
  examDate: Date;
  daysRemaining: number;
  totalQuestions: number;
}

export async function loadExamCountdown(
  userProfileId: string,
  now: Date = new Date()
): Promise<ExamCountdown | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: { targetExam: { select: { name: true, examDate: true, totalQuestions: true } } },
  });
  const exam = profile?.targetExam;
  if (!exam?.examDate) return null;

  const daysRemaining = Math.ceil((exam.examDate.getTime() - now.getTime()) / (24 * 3600 * 1000));
  return {
    examName: exam.name,
    examDate: exam.examDate,
    daysRemaining,
    totalQuestions: exam.totalQuestions,
  };
}

// ─────────────────────────────── Temas a reforzar ───────────────────────────────

export interface WeakTopicSummary {
  topicId: string;
  topicName: string;
  subjectName: string;
  hitRate: number;
}

/**
 * Ranking de TODO el historial de respuestas, sin el umbral de ≥3 intentos
 * que exige `WeakTopic` (F6). Mismo problema que F7 ya resolvió para la
 * pantalla de resultados del diagnóstico: justo después del diagnóstico casi
 * ningún tema llega a 3 intentos (30 reactivos repartidos entre docenas de
 * temas), así que `WeakTopic` suele estar vacía cuando el alumno más
 * necesita ver una recomendación. Aquí "débil" es simplemente "le fue peor",
 * con la muestra que haya — mejor que un mensaje genérico.
 */
async function loadAllTimeTopicRanking(
  userProfileId: string,
  limit: number
): Promise<WeakTopicSummary[]> {
  const answers = await prisma.sessionAnswer.findMany({
    where: {
      selectedOption: { not: null },
      session: { userProfileId, status: { in: [...FINISHED_STATUSES] } },
    },
    select: {
      isCorrect: true,
      question: { select: { topic: { select: { id: true, name: true, subject: { select: { name: true } } } } } },
    },
  });

  const byTopic = new Map<string, { topicName: string; subjectName: string; correct: number; attempts: number }>();
  for (const a of answers) {
    const t = a.question.topic;
    const prev = byTopic.get(t.id) ?? { topicName: t.name, subjectName: t.subject.name, correct: 0, attempts: 0 };
    byTopic.set(t.id, {
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

/** Temas a reforzar (F11 Task 3 y 6): prefiere `WeakTopic` (confiable, ≥3
 *  intentos) y rellena con el ranking histórico completo si no alcanza. */
export async function loadWeakestTopics(
  userProfileId: string,
  limit = 3
): Promise<WeakTopicSummary[]> {
  const rows = await prisma.weakTopic.findMany({
    where: { userProfileId },
    orderBy: { hitRate: 'asc' },
    take: limit,
    include: { topic: { select: { name: true, subject: { select: { name: true } } } } },
  });

  const persisted: WeakTopicSummary[] = rows.map((r) => ({
    topicId: r.topicId,
    topicName: r.topic.name,
    subjectName: r.topic.subject.name,
    hitRate: r.hitRate,
  }));

  if (persisted.length >= limit) return persisted;

  const fallback = await loadAllTimeTopicRanking(userProfileId, limit);
  const merged = [...persisted];
  const seen = new Set(merged.map((t) => t.topicId));
  for (const t of fallback) {
    if (merged.length >= limit) break;
    if (!seen.has(t.topicId)) {
      merged.push(t);
      seen.add(t.topicId);
    }
  }
  return merged;
}

// ─────────────────────────────── Simulacros recientes ───────────────────────────────

export interface RecentSimulation {
  id: string;
  score: number | null;
  totalQuestions: number;
  finishedAt: Date;
}

export async function loadRecentSimulations(
  userProfileId: string,
  limit = 3
): Promise<RecentSimulation[]> {
  const rows = await prisma.examSession.findMany({
    where: { userProfileId, mode: 'FULL_SIMULATION', status: { in: [...FINISHED_STATUSES] } },
    orderBy: { finishedAt: 'desc' },
    take: limit,
    select: { id: true, score: true, finishedAt: true, exam: { select: { totalQuestions: true } } },
  });

  return rows
    .filter((r) => r.finishedAt !== null)
    .map((r) => ({
      id: r.id,
      score: r.score,
      totalQuestions: r.exam.totalQuestions,
      finishedAt: r.finishedAt as Date,
    }));
}

// ─────────────────────────────── Mapa de calor (90 días) ───────────────────────────────

export type HeatmapLevel = 0 | 1 | 2;
export interface HeatmapDay {
  /** YYYY-MM-DD en huso de México — el formato que espera react-calendar-heatmap. */
  date: string;
  level: HeatmapLevel;
}

export function toDateKey(mexicoMidnightUtc: Date): string {
  // El instante ya ES medianoche México expresada en UTC; tomar los campos UTC
  // da la fecha calendario México correcta sin reconvertir con offset.
  const y = mexicoMidnightUtc.getUTCFullYear();
  const m = String(mexicoMidnightUtc.getUTCMonth() + 1).padStart(2, '0');
  const d = String(mexicoMidnightUtc.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Actividad de los últimos 90 días (F11 Task 5). Nivel por día = la sesión
 * MÁS LARGA de ese día: 0 sin sesión, 1 "tenue" (hubo sesión, <30 min), 2
 * "lleno" (≥30 min) — la regla exacta del PRD F-05.
 */
export async function loadHeatmapData(
  userProfileId: string,
  now: Date = new Date(),
  days: number = HEATMAP_DAYS
): Promise<HeatmapDay[]> {
  const windowStart = new Date(startOfMexicoDay(now).getTime() - (days - 1) * 24 * 3600 * 1000);

  const sessions = await prisma.examSession.findMany({
    where: {
      userProfileId,
      status: { in: [...FINISHED_STATUSES] },
      startedAt: { gte: windowStart },
    },
    select: { startedAt: true, finishedAt: true },
  });

  // Nota: el umbral de 10 min de `isQualifyingStreakSession` es solo para la
  // RACHA — aquí una sesión de 3 min todavía pinta "tenue" (nivel 1), no se
  // ignora, así que NO se filtra por esa función.
  const maxMinutesByDay = new Map<string, number>();
  for (const s of sessions) {
    if (!s.finishedAt) continue;
    const key = toDateKey(startOfMexicoDay(s.startedAt));
    const minutes = (s.finishedAt.getTime() - s.startedAt.getTime()) / 60000;
    maxMinutesByDay.set(key, Math.max(maxMinutesByDay.get(key) ?? 0, minutes));
  }

  const result: HeatmapDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(startOfMexicoDay(now).getTime() - i * 24 * 3600 * 1000);
    const key = toDateKey(day);
    const minutes = maxMinutesByDay.get(key);
    const level: HeatmapLevel = minutes == null ? 0 : minutes >= HEATMAP_FULL_MINUTES ? 2 : 1;
    result.push({ date: key, level });
  }
  return result;
}

// ─────────────────────────────── Entrómetro bloqueado ───────────────────────────────

export interface EntrometroAccess {
  unlocked: boolean;
  isPaid: boolean;
  completedFullSimulations: number;
}

/**
 * F11 Task 11: un alumno FREE que aún no hizo su primer simulacro completo ve
 * el Entrómetro bloqueado. En cuanto lo hace (o paga), se desbloquea — para
 * siempre, no solo para esa sesión (reusa el mismo conteo que F9's paywall).
 */
export async function loadEntrometroAccess(userProfileId: string): Promise<EntrometroAccess> {
  const [isPaid, completedFullSimulations] = await Promise.all([
    isUserPaid(userProfileId),
    countCompletedFullSimulations(userProfileId),
  ]);
  return { unlocked: isPaid || completedFullSimulations > 0, isPaid, completedFullSimulations };
}
