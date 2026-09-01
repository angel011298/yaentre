import { Prisma } from '@prisma/client';
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

function badgeKey(subjectId: string): string {
  return `MATERIA_DOMINADA:${subjectId}`;
}

/** Materias tocadas por una sesión (vía los temas de las preguntas respondidas). */
async function loadSessionSubjectIds(sessionId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ subjectId: string }[]>`
    SELECT DISTINCT t."subjectId"
      FROM "session_answers" sa
      JOIN "questions" q ON q."id" = sa."questionId"
      JOIN "topics"    t ON t."id" = q."topicId"
     WHERE sa."sessionId" = ${sessionId}
  `;
  return rows.map((r) => r.subjectId);
}

interface SubjectTopicStatRow {
  subjectId: string;
  topicId: string;
  attempts: number;
  correct: number;
}

/**
 * Stats acumuladas del ALUMNO (todo su historial finalizado) para cada tema de
 * las materias indicadas, incluyendo los temas sin ningún intento
 * (`attempts: 0`) — necesario para que `isSubjectMastered` los cuente como
 * "sin evidencia" en vez de simplemente no verlos.
 *
 * ── G59: dos defectos corregidos aquí ──
 *
 * 1. CORRECCIÓN. La versión anterior NO filtraba por alumno: agregaba las
 *    respuestas de TODOS los usuarios. La insignia "materia dominada" es
 *    personal, así que el veredicto era sencillamente el equivocado — con un
 *    solo usuario de prueba coincidía por accidente, y con tráfico real habría
 *    otorgado (o negado) la insignia según cómo le fuera al resto del mundo.
 *
 * 2. RENDIMIENTO. La versión anterior corría una consulta POR MATERIA tocada
 *    por la sesión (un simulacro completo las toca todas) y cada una traía a
 *    Node cada respuesta individual. Medido en G59 sobre 857 k respuestas:
 *    204 ms y 102 564 filas por materia — por ~11 materias, más de 2 s de base
 *    de datos en el cierre de cada simulacro, creciendo con el total de
 *    respuestas de TODA la plataforma. Ahora es UNA consulta para todas las
 *    materias y devuelve un renglón por tema (decenas), porque la agregación
 *    la hace Postgres.
 */
async function loadSubjectTopicMastery(
  userProfileId: string,
  subjectIds: readonly string[]
): Promise<Map<string, TopicMasteryInput[]>> {
  const bySubject = new Map<string, TopicMasteryInput[]>();
  if (subjectIds.length === 0) return bySubject;

  const rows = await prisma.$queryRaw<SubjectTopicStatRow[]>`
    SELECT t."subjectId"                   AS "subjectId",
           t."id"                          AS "topicId",
           COALESCE(st."attempts", 0)::int AS "attempts",
           COALESCE(st."correct", 0)::int  AS "correct"
      FROM "topics" t
      LEFT JOIN (
        SELECT q."topicId"                                 AS "topicId",
               count(*)::int                               AS "attempts",
               count(*) FILTER (WHERE sa."isCorrect")::int AS "correct"
          FROM "session_answers" sa
          JOIN "exam_sessions" s ON s."id" = sa."sessionId"
          JOIN "questions"     q ON q."id" = sa."questionId"
         WHERE s."userProfileId" = ${userProfileId}
           AND s."status" IN ('COMPLETED', 'COMPLETED_BY_TIMEOUT')
         GROUP BY q."topicId"
      ) st ON st."topicId" = t."id"
     WHERE t."subjectId" IN (${Prisma.join([...subjectIds])})
  `;

  for (const r of rows) {
    const list = bySubject.get(r.subjectId) ?? [];
    list.push({
      topicId: r.topicId,
      attempts: r.attempts,
      hitRate: r.attempts > 0 ? r.correct / r.attempts : 0,
    });
    bySubject.set(r.subjectId, list);
  }
  return bySubject;
}

/**
 * Otorga la insignia de "materia dominada" (idempotente — mismo patrón que
 * `grantEarlyBirdBadge` en billing.ts) para las materias tocadas en esta
 * sesión que ACABAN de cumplir el umbral en TODOS sus temas y aún no tenían
 * la insignia. Devuelve solo las recién otorgadas en ESTA llamada.
 *
 * G59: el bucle por materia (2 consultas de stats + 1 de nombre + 1 update
 * cada una) se colapsó a cuatro consultas fijas, independientes de cuántas
 * materias tocó la sesión.
 */
async function grantNewlyMasteredSubjects(
  userProfileId: string,
  sessionId: string
): Promise<{ subjectId: string; subjectName: string }[]> {
  const [subjectIds, profile] = await Promise.all([
    loadSessionSubjectIds(sessionId),
    prisma.userProfile.findUnique({ where: { id: userProfileId }, select: { badges: true } }),
  ]);
  if (subjectIds.length === 0 || !profile) return [];

  const candidates = subjectIds.filter((id) => !profile.badges.includes(badgeKey(id)));
  if (candidates.length === 0) return [];

  const masteryBySubject = await loadSubjectTopicMastery(userProfileId, candidates);
  const mastered = candidates.filter((id) => isSubjectMastered(masteryBySubject.get(id) ?? []));
  if (mastered.length === 0) return [];

  const subjects = await prisma.subject.findMany({
    where: { id: { in: mastered } },
    select: { id: true, name: true },
  });
  if (subjects.length === 0) return [];

  // Un solo `push` con todas las claves: el bucle anterior hacía un UPDATE por
  // materia sobre la misma fila.
  await prisma.userProfile.update({
    where: { id: userProfileId },
    data: { badges: { push: subjects.map((s) => badgeKey(s.id)) } },
  });

  return subjects.map((s) => ({ subjectId: s.id, subjectName: s.name }));
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
