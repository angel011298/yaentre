import { Prisma, type NotificationType } from '@prisma/client';
import { prisma } from './prisma';
import { getAuthEmails } from './auth-users';
import { readTimestampSetting, writeSystemSetting } from './system-settings';
import { sendEmail } from '@/lib/email/client';
import { buildUnsubscribeUrl } from '@/lib/email/links';
import { simulationReminderEmail, studyReminderEmail } from '@/lib/email/templates';
import { getSiteUrl } from '@/lib/auth/site-url';
import { reportSilentDegradation } from '@/lib/observability/report';
import { startOfMexicoDay } from '@/lib/paywall/mexico-time';
import { normalizeDailyGoal, normalizeReminderDays } from '@/lib/profile/settings';
import {
  isHeartbeatStale,
  isReminderDue,
  mexicoClock,
  reminderHoursInWindow,
  type ReminderType,
} from '@/lib/notifications/reminders';

/**
 * G100 — recordatorios con horario (STUDY_REMINDER, SIMULATION_REMINDER).
 *
 * Corre CADA HORA desde `/api/cron/reminders`. Vercel Hobby solo programa
 * crons diarios, así que el disparador es `pg_cron` + `pg_net` en Supabase
 * (migración 0020); el cron diario de Vercel vigila el latido que deja este
 * job y lo reporta si se apaga (`checkReminderHeartbeat`).
 *
 * Idempotencia: la fila de `notification_deliveries` se inserta ANTES de
 * enviar; el índice único (usuario, tipo, día) hace que una corrida repetida
 * o el margen de recuperación no dupliquen correos. Si el envío falla, la
 * fila se borra para que la siguiente hora de la ventana lo reintente.
 */

interface Candidate {
  userProfileId: string;
  reminderHour: number;
  reminderDays: number[];
  dailyGoalMins: number;
  examName: string | null;
  durationMins: number | null;
}

async function loadCandidates(type: ReminderType, hours: number[]): Promise<Candidate[]> {
  // Opt-in: solo quien tiene la fila `enabled = true` (sin fila = apagado).
  const rows = await prisma.userProfile.findMany({
    where: {
      role: 'STUDENT',
      reminderHour: { in: hours },
      notificationPrefs: { some: { type, enabled: true } },
    },
    select: {
      id: true,
      reminderHour: true,
      reminderDays: true,
      dailyGoalMins: true,
      targetExam: { select: { name: true, durationMins: true } },
    },
  });
  return rows.map((r) => ({
    userProfileId: r.id,
    reminderHour: r.reminderHour,
    reminderDays: normalizeReminderDays(r.reminderDays),
    dailyGoalMins: normalizeDailyGoal(r.dailyGoalMins),
    examName: r.targetExam?.name ?? null,
    durationMins: r.targetExam?.durationMins ?? null,
  }));
}

/** Quién ya estudió hoy: un recordatorio para estudiar a quien ya lo hizo es ruido. */
async function studiedToday(userProfileIds: string[], now: Date): Promise<Set<string>> {
  if (userProfileIds.length === 0) return new Set();
  const rows = await prisma.examSession.findMany({
    where: {
      userProfileId: { in: userProfileIds },
      startedAt: { gte: startOfMexicoDay(now) },
    },
    select: { userProfileId: true },
    distinct: ['userProfileId'],
  });
  return new Set(rows.map((r) => r.userProfileId));
}

/** `true` si este proceso reclamó el envío; `false` si ya estaba reclamado. */
async function claimDelivery(userProfileId: string, type: NotificationType, dayKey: string): Promise<boolean> {
  try {
    await prisma.notificationDelivery.create({ data: { userProfileId, type, dayKey } });
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return false;
    throw err;
  }
}

async function releaseDelivery(userProfileId: string, type: NotificationType, dayKey: string): Promise<void> {
  await prisma.notificationDelivery
    .delete({ where: { userProfileId_type_dayKey: { userProfileId, type, dayKey } } })
    .catch((err: unknown) => reportSilentDegradation('scheduled_job', err, { job: 'releaseDelivery', type }));
}

export async function runReminderJob(type: ReminderType, now: Date = new Date()): Promise<number> {
  const clock = mexicoClock(now);
  const candidates = (await loadCandidates(type, reminderHoursInWindow(clock.hour))).filter((c) =>
    isReminderDue(type, c, clock)
  );
  if (candidates.length === 0) return 0;

  let targets = candidates;
  if (type === 'STUDY_REMINDER') {
    const already = await studiedToday(candidates.map((c) => c.userProfileId), now);
    targets = candidates.filter((c) => !already.has(c.userProfileId));
  }
  if (targets.length === 0) return 0;

  const emails = await getAuthEmails(targets.map((t) => t.userProfileId));
  if (emails.size < targets.length) {
    reportSilentDegradation(
      'email_recipients',
      new Error(`${targets.length - emails.size} de ${targets.length} destinatarios sin correo resoluble`),
      { job: type, expected: targets.length, resolved: emails.size }
    );
  }

  const site = getSiteUrl();
  let sent = 0;
  for (const t of targets) {
    const to = emails.get(t.userProfileId);
    if (!to) continue;
    if (!(await claimDelivery(t.userProfileId, type, clock.dayKey))) continue;

    const unsubscribeUrl = buildUnsubscribeUrl(t.userProfileId, type);
    const { subject, html } =
      type === 'STUDY_REMINDER'
        ? studyReminderEmail({ goalMins: t.dailyGoalMins, practiceUrl: `${site}/practicar`, unsubscribeUrl })
        : simulationReminderEmail({
            examName: t.examName,
            durationMins: t.durationMins,
            simulatorUrl: `${site}/simulador`,
            unsubscribeUrl,
          });

    // G73b: solo cuenta lo que Resend ACEPTÓ; un fallo libera el candado para
    // que la siguiente hora de la ventana lo reintente.
    if ((await sendEmail({ to, subject, html })).ok) sent++;
    else await releaseDelivery(t.userProfileId, type, clock.dayKey);
  }
  return sent;
}

export interface HourlyReminderResults {
  studyReminder: number;
  simulationReminder: number;
}

export async function runHourlyReminderJobs(now: Date = new Date()): Promise<HourlyReminderResults> {
  // El latido va PRIMERO: registra que el disparador llegó, aunque después un
  // job falle (eso ya lo reporta `scheduled_job`). Lo que vigila el cron
  // diario es que el disparador exista, no que haya correos que mandar.
  await writeSystemSetting('cron.reminders.lastRunAt', { at: now.toISOString() });

  const [study, sim] = await Promise.allSettled([
    runReminderJob('STUDY_REMINDER', now),
    runReminderJob('SIMULATION_REMINDER', now),
  ]);
  const value = (r: PromiseSettledResult<number>, label: string): number => {
    if (r.status === 'fulfilled') return r.value;
    reportSilentDegradation('scheduled_job', r.reason, { job: label });
    return 0;
  };
  return {
    studyReminder: value(study, 'studyReminder'),
    simulationReminder: value(sim, 'simulationReminder'),
  };
}

/**
 * Lo llama el cron DIARIO de Vercel. Solo vale la pena alarmar si hay alguien
 * esperando un recordatorio: sin ningún alumno con uno activado, un
 * disparador apagado no le cuesta nada a nadie.
 */
export async function checkReminderHeartbeat(now: Date = new Date()): Promise<{ stale: boolean }> {
  const [lastRunAt, subscribers] = await Promise.all([
    readTimestampSetting('cron.reminders.lastRunAt'),
    prisma.notificationPreference.count({
      where: { type: { in: ['STUDY_REMINDER', 'SIMULATION_REMINDER'] }, enabled: true },
    }),
  ]);
  const stale = isHeartbeatStale(lastRunAt, now);
  if (stale && subscribers > 0) {
    reportSilentDegradation(
      'reminder_trigger',
      new Error('El disparador horario de recordatorios no ha corrido en las últimas horas'),
      { lastRunAt: lastRunAt?.toISOString() ?? null, subscribers }
    );
  }
  return { stale };
}
