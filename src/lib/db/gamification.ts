import { prisma } from './prisma';
import { isSubjectMastered, type TopicMasteryInput } from '@/lib/gamification/mastery';
import { isStreakAtRisk, newlyReachedStreakMilestone } from '@/lib/gamification/streak-signals';
import { selectCelebration, type Celebration } from '@/lib/gamification/celebrations';
import { isPerfectRound } from '@/lib/simulator/config';
import { trackServerEvent } from '@/lib/analytics/server';

/**
 * Orquestación de gamificación (F15): conecta los motores puros
 * (`src/lib/gamification/*`) con Prisma. Aquí viven los efectos (otorgar
 * insignias, leer stats por materia); la decisión de QUÉ celebrar siempre
 * delega en `selectCelebration` (puro).
 */

const FINISHED_STATUSES = ['COMPLETED', 'COMPLETED_BY_TIMEOUT'] as const;

function badgeKey(subjectId: string): string {
  return `MATERIA_DOMINADA:${subjectId}`;
}

/** Materias tocadas por una sesión (vía los temas de las preguntas respondidas). */
async function loadSessionSubjectIds(sessionId: string): Promise<string[]> {
  const rows = await prisma.sessionAnswer.findMany({
    where: { sessionId },
    select: { question: { select: { topic: { select: { subjectId: true } } } } },
  });
  return [...new Set(rows.map((r) => r.question.topic.subjectId))];
}

/**
 * Stats acumuladas (TODO el historial finalizado) de CADA tema de una materia,
 * incluyendo temas sin ningún intento (attempts: 0) — necesario para que
 * `isSubjectMastered` los excluya correctamente en vez de simplemente no
 * verlos.
 */
async function loadSubjectTopicMastery(subjectId: string): Promise<TopicMasteryInput[]> {
  const topics = await prisma.topic.findMany({
    where: { subjectId },
    select: { id: true },
  });
  if (topics.length === 0) return [];

  const answers = await prisma.sessionAnswer.findMany({
    where: {
      session: { status: { in: [...FINISHED_STATUSES] } },
      question: { topic: { subjectId } },
    },
    select: { isCorrect: true, question: { select: { topicId: true } } },
  });

  const acc = new Map<string, { attempts: number; correct: number }>();
  for (const a of answers) {
    const prev = acc.get(a.question.topicId) ?? { attempts: 0, correct: 0 };
    acc.set(a.question.topicId, {
      attempts: prev.attempts + 1,
      correct: prev.correct + (a.isCorrect ? 1 : 0),
    });
  }

  return topics.map((t) => {
    const stat = acc.get(t.id);
    return {
      topicId: t.id,
      attempts: stat?.attempts ?? 0,
      hitRate: stat && stat.attempts > 0 ? stat.correct / stat.attempts : 0,
    };
  });
}

/**
 * Otorga la insignia de "materia dominada" (idempotente — mismo patrón que
 * `grantEarlyBirdBadge` en billing.ts) para las materias tocadas en esta
 * sesión que ACABAN de cumplir el umbral en TODOS sus temas y aún no tenían
 * la insignia. Devuelve solo las recién otorgadas en ESTA llamada.
 */
async function grantNewlyMasteredSubjects(
  userProfileId: string,
  sessionId: string
): Promise<{ subjectId: string; subjectName: string }[]> {
  const subjectIds = await loadSessionSubjectIds(sessionId);
  if (subjectIds.length === 0) return [];

  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: { badges: true },
  });
  if (!profile) return [];

  const granted: { subjectId: string; subjectName: string }[] = [];

  for (const subjectId of subjectIds) {
    const key = badgeKey(subjectId);
    if (profile.badges.includes(key)) continue;

    const topics = await loadSubjectTopicMastery(subjectId);
    if (!isSubjectMastered(topics)) continue;

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { name: true },
    });
    if (!subject) continue;

    await prisma.userProfile.update({
      where: { id: userProfileId },
      data: { badges: { push: key } },
    });
    granted.push({ subjectId, subjectName: subject.name });
  }

  return granted;
}

/**
 * Punto único de decisión tras finalizar una sesión (F15 tareas 2 y 3):
 * calcula los tres candidatos a celebración grande y delega en
 * `selectCelebration` (puro) cuál — como máximo una — se muestra.
 *
 * `previousStreak`/`currentStreak` deben capturarse ANTES/DESPUÉS de
 * `onSessionFinished` respectivamente (el segundo ya recalculado por
 * `recomputeStreak`).
 */
export async function computeSessionCelebration(params: {
  userProfileId: string;
  sessionId: string;
  score: number;
  servedCount: number;
  previousStreak: number;
  currentStreak: number;
}): Promise<Celebration | null> {
  const { userProfileId, sessionId, score, servedCount, previousStreak, currentStreak } = params;

  const masteredSubjects = await grantNewlyMasteredSubjects(userProfileId, sessionId);
  // F20 tarea 2: hito de retención — se registra por cada materia recién
  // dominada, incluso si `selectCelebration` termina mostrando solo una (la
  // insignia ya quedó otorgada de verdad para todas, así que el evento de
  // negocio también debe reflejarlas todas).
  for (const _subject of masteredSubjects) {
    await trackServerEvent(userProfileId, 'badge_earned', { badgeType: 'MATERIA_DOMINADA' });
  }

  const streakMilestone = newlyReachedStreakMilestone(previousStreak, currentStreak);
  if (streakMilestone) {
    await trackServerEvent(userProfileId, 'streak_milestone', { days: streakMilestone });
  }

  return selectCelebration({
    masteredSubjects,
    perfectRound: isPerfectRound(score, servedCount),
    streakMilestone,
  });
}

export interface StreakStatus {
  currentStreak: number;
  atRisk: boolean;
}

/** Estado de racha para el dashboard/banner (F15 tarea 4: "racha en riesgo"). */
export async function loadStreakStatus(
  userProfileId: string,
  now: Date = new Date()
): Promise<StreakStatus> {
  const record = await prisma.streakRecord.findUnique({ where: { userProfileId } });
  if (!record) return { currentStreak: 0, atRisk: false };

  return {
    currentStreak: record.currentStreak,
    atRisk: isStreakAtRisk(record.currentStreak, record.lastActivityDate, now),
  };
}

/** Insignias de "materia dominada" del alumno, con nombre de materia resuelto. */
export async function loadMasteredSubjectBadges(
  userProfileId: string
): Promise<{ subjectId: string; subjectName: string }[]> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: { badges: true },
  });
  if (!profile) return [];

  const subjectIds = profile.badges
    .filter((b) => b.startsWith('MATERIA_DOMINADA:'))
    .map((b) => b.slice('MATERIA_DOMINADA:'.length));
  if (subjectIds.length === 0) return [];

  const subjects = await prisma.subject.findMany({
    where: { id: { in: subjectIds } },
    select: { id: true, name: true },
  });
  return subjects.map((s) => ({ subjectId: s.id, subjectName: s.name }));
}
