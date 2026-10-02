import { startOfMexicoDay } from '@/lib/paywall/mexico-time';

/**
 * G100 — meta diaria de estudio. Módulo PURO (sin Prisma), probado en
 * `tests/study/daily-goal.test.ts`.
 *
 * Minutos de HOY = suma de la duración de las sesiones terminadas que
 * empezaron hoy en la Ciudad de México, cada una acotada a su propio límite
 * de tiempo. La cota importa: una práctica que se queda abierta en una
 * pestaña y se cierra al día siguiente por inactividad duraría 20 horas, y
 * una meta que se cumple sola dejando el celular prendido no mide estudio.
 */
export interface StudySessionSpan {
  startedAt: Date;
  finishedAt: Date | null;
  timeLimitSecs: number;
}

export function studyMinutesToday(sessions: readonly StudySessionSpan[], now: Date): number {
  const dayStart = startOfMexicoDay(now).getTime();
  let secs = 0;
  for (const s of sessions) {
    if (!s.finishedAt) continue;
    if (s.startedAt.getTime() < dayStart) continue;
    const elapsed = Math.max(0, (s.finishedAt.getTime() - s.startedAt.getTime()) / 1000);
    secs += Math.min(elapsed, Math.max(0, s.timeLimitSecs));
  }
  return Math.floor(secs / 60);
}

export interface DailyGoalProgress {
  minutes: number;
  goal: number;
  /** 0-100, entero, acotado. */
  percent: number;
  done: boolean;
}

export function dailyGoalProgress(minutes: number, goal: number): DailyGoalProgress {
  const safeGoal = Math.max(1, goal);
  const percent = Math.min(100, Math.round((Math.max(0, minutes) / safeGoal) * 100));
  return { minutes: Math.max(0, minutes), goal: safeGoal, percent, done: minutes >= safeGoal };
}

/**
 * Horas de práctica acumuladas hasta el examen al ritmo elegido. Lo usa el
 * ajuste de meta diaria para que el número signifique algo («con 30 min al
 * día llegas con 45 horas»). `null` sin fecha de examen o si ya pasó.
 */
export function hoursUntilExamAtPace(
  dailyGoalMins: number,
  examDate: Date | null,
  now: Date
): number | null {
  if (!examDate) return null;
  const days = Math.floor(
    (startOfMexicoDay(examDate).getTime() - startOfMexicoDay(now).getTime()) / (24 * 3600 * 1000)
  );
  if (days <= 0) return null;
  return Math.round((days * dailyGoalMins) / 60);
}
