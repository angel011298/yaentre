import type { StreakRecord } from '@prisma/client';
import { prisma } from './prisma';
import {
  computeCurrentStreak,
  computeLongestStreak,
  isQualifyingStreakSession,
  toActiveDaySet,
} from '@/lib/streak/compute';

/**
 * Orquestación de racha (F11): conecta el motor puro (`src/lib/streak/
 * compute.ts`) con Prisma y persiste en `StreakRecord` — la fuente de datos
 * que el PRD ya nombra para este widget (F-05: `StreakRecord.currentStreak`)
 * y que el futuro panel parental (F16) también leerá.
 *
 * Se recalcula desde CERO a partir del historial completo de sesiones
 * terminadas en cada llamada (no incremental): es la forma más simple de
 * mantenerlo siempre correcto sin lógica de "¿ya se contó hoy?" con estado
 * mutable — el volumen de sesiones de un alumno nunca es tan alto como para
 * que esto sea un problema de rendimiento real.
 */

const FINISHED_STATUSES = ['COMPLETED', 'COMPLETED_BY_TIMEOUT'] as const;

export async function recomputeStreak(
  userProfileId: string,
  now: Date = new Date()
): Promise<StreakRecord> {
  const sessions = await prisma.examSession.findMany({
    where: { userProfileId, status: { in: [...FINISHED_STATUSES] } },
    select: { startedAt: true, finishedAt: true },
  });

  const qualifyingDates = sessions.filter(isQualifyingStreakSession).map((s) => s.startedAt);
  const activeDays = toActiveDaySet(qualifyingDates);

  const currentStreak = computeCurrentStreak(activeDays, now);
  const longestStreak = computeLongestStreak(activeDays);
  const totalActiveDays = activeDays.size;
  const lastActivityDate = activeDays.size > 0 ? new Date(Math.max(...activeDays)) : null;

  return prisma.streakRecord.upsert({
    where: { userProfileId },
    create: { userProfileId, currentStreak, longestStreak, totalActiveDays, lastActivityDate },
    update: { currentStreak, longestStreak, totalActiveDays, lastActivityDate },
  });
}

/** Lectura simple para el TopBar/dashboard — sin recalcular (eso lo hace
 *  `onSessionFinished`). `null` si el alumno aún no tiene ninguna sesión. */
export async function getStreak(userProfileId: string): Promise<StreakRecord | null> {
  return prisma.streakRecord.findUnique({ where: { userProfileId } });
}
