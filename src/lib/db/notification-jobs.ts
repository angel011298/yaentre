import { prisma } from './prisma';
import { loadParentDashboardData } from './parent';
import { getAuthEmails } from './auth-users';
import { filterEnabledForType } from './notifications';
import { isStreakAtRisk } from '@/lib/gamification/streak-signals';
import { isMondayInMexico } from '@/lib/notifications/schedule';
import { sendEmail } from '@/lib/email/client';
import { buildUnsubscribeUrl } from '@/lib/email/links';
import {
  examCountdownEmail,
  parentWeeklySummaryEmail,
  streakRiskEmail,
} from '@/lib/email/templates';

/**
 * Jobs de correo programado (F16 tarea 8). Cada uno es autocontenido e
 * independiente — un fallo en uno nunca debe tumbar a los demás, así que el
 * runner que los invoca (`app/api/cron/notifications/route.ts`) los corre
 * con `Promise.allSettled`, no `Promise.all`.
 *
 * Regla anti-spam "máximo una vez al día" (racha en riesgo): se cumple
 * estructuralmente por la cadencia del propio cron (una corrida diaria), no
 * con una bandera de "ya se envió hoy" en DB — evita tocar el schema para
 * guardar ese estado.
 */

const EXAM_COUNTDOWN_MILESTONES = [30, 15, 7, 1] as const;
const ONE_DAY_MS = 24 * 3600 * 1000;

export async function runStreakRiskJob(now: Date = new Date()): Promise<number> {
  const streaks = await prisma.streakRecord.findMany({
    where: { currentStreak: { gt: 0 } },
    select: { userProfileId: true, currentStreak: true, lastActivityDate: true },
  });

  const atRisk = streaks.filter((s) => isStreakAtRisk(s.currentStreak, s.lastActivityDate, now));
  if (atRisk.length === 0) return 0;

  const enabledIds = await filterEnabledForType(
    atRisk.map((s) => s.userProfileId),
    'STREAK_RISK'
  );
  const targets = atRisk.filter((s) => enabledIds.has(s.userProfileId));
  if (targets.length === 0) return 0;

  const emails = await getAuthEmails(targets.map((t) => t.userProfileId));

  let sent = 0;
  for (const t of targets) {
    const to = emails.get(t.userProfileId);
    if (!to) continue;
    const { subject, html } = streakRiskEmail({
      days: t.currentStreak,
      unsubscribeUrl: buildUnsubscribeUrl(t.userProfileId, 'STREAK_RISK'),
    });
    await sendEmail({ to, subject, html });
    sent++;
  }
  return sent;
}

export async function runExamCountdownJob(now: Date = new Date()): Promise<number> {
  const profiles = await prisma.userProfile.findMany({
    where: { role: 'STUDENT', targetExamId: { not: null } },
    select: { id: true, targetExam: { select: { examDate: true, name: true } } },
  });

  const candidates = profiles
    .filter((p) => p.targetExam?.examDate)
    .map((p) => {
      const examDate = p.targetExam!.examDate as Date;
      const daysRemaining = Math.ceil((examDate.getTime() - now.getTime()) / ONE_DAY_MS);
      return { userProfileId: p.id, examName: p.targetExam!.name, daysRemaining };
    })
    .filter((c) => (EXAM_COUNTDOWN_MILESTONES as readonly number[]).includes(c.daysRemaining));

  if (candidates.length === 0) return 0;

  const enabledIds = await filterEnabledForType(
    candidates.map((c) => c.userProfileId),
    'EXAM_COUNTDOWN'
  );
  const targets = candidates.filter((c) => enabledIds.has(c.userProfileId));
  if (targets.length === 0) return 0;

  const emails = await getAuthEmails(targets.map((t) => t.userProfileId));

  let sent = 0;
  for (const t of targets) {
    const to = emails.get(t.userProfileId);
    if (!to) continue;
    const { subject, html } = examCountdownEmail({
      daysRemaining: t.daysRemaining,
      examName: t.examName,
      unsubscribeUrl: buildUnsubscribeUrl(t.userProfileId, 'EXAM_COUNTDOWN'),
    });
    await sendEmail({ to, subject, html });
    sent++;
  }
  return sent;
}

export async function runParentWeeklySummaryJob(now: Date = new Date()): Promise<number> {
  if (!isMondayInMexico(now)) return 0;

  const links = await prisma.parentLink.findMany({
    select: { parentProfileId: true, studentProfileId: true },
  });
  if (links.length === 0) return 0;

  const enabledParents = await filterEnabledForType(
    [...new Set(links.map((l) => l.parentProfileId))],
    'PARENT_WEEKLY'
  );
  const targets = links.filter((l) => enabledParents.has(l.parentProfileId));
  if (targets.length === 0) return 0;

  const emails = await getAuthEmails(targets.map((t) => t.parentProfileId));

  let sent = 0;
  for (const t of targets) {
    const to = emails.get(t.parentProfileId);
    if (!to) continue;

    const result = await loadParentDashboardData(t.parentProfileId, t.studentProfileId, now);
    // Panel bloqueado (alumno sin Pase+): se omite el correo en vez de
    // mandar un resumen vacío o promocional — fuera de alcance de esta fase.
    if (result.kind !== 'unlocked') continue;

    const { subject, html } = parentWeeklySummaryEmail({
      studentName: result.data.studentName,
      currentStreak: result.data.currentStreak,
      predictedScore: result.data.predictedScore,
      weekDelta: result.data.weekDelta,
      recentSimulations: result.data.recentSimulations,
      unsubscribeUrl: buildUnsubscribeUrl(t.parentProfileId, 'PARENT_WEEKLY'),
    });
    await sendEmail({ to, subject, html });
    sent++;
  }
  return sent;
}

export interface DailyNotificationResults {
  streakRisk: number;
  examCountdown: number;
  parentWeeklySummary: number;
}

export async function runDailyNotificationJobs(
  now: Date = new Date()
): Promise<DailyNotificationResults> {
  const [streakRisk, examCountdown, parentWeeklySummary] = await Promise.allSettled([
    runStreakRiskJob(now),
    runExamCountdownJob(now),
    runParentWeeklySummaryJob(now),
  ]);

  const value = (r: PromiseSettledResult<number>, label: string): number => {
    if (r.status === 'fulfilled') return r.value;
    console.error(`[notifications] job "${label}" falló`, r.reason);
    return 0;
  };

  return {
    streakRisk: value(streakRisk, 'streakRisk'),
    examCountdown: value(examCountdown, 'examCountdown'),
    parentWeeklySummary: value(parentWeeklySummary, 'parentWeeklySummary'),
  };
}
