import { normalizeThemePref, type ThemePref } from '@/lib/profile/theme';
import {
  normalizeDailyGoal,
  normalizeFontScale,
  normalizeReminderDays,
  normalizeReminderHour,
  type FontScale,
} from '@/lib/profile/settings';
import { prisma } from './prisma';
import { getActiveSubscription } from './paywall';
import { getStripe } from '@/lib/stripe/client';
import { reportSilentDegradation } from '@/lib/observability/report';

/**
 * Orquestación de la pantalla de perfil (F17): lecturas/escrituras chicas y
 * enfocadas sobre `UserProfile`, en el mismo estilo que `src/lib/db/dashboard.ts`
 * (F11) — cada función hace una cosa, la página las combina.
 */

export interface ProfileOverview {
  displayName: string | null;
  avatarUrl: string | null;
  themePref: ThemePref;
  fontScale: FontScale;
  dailyGoalMins: number;
  focusSubjectIds: string[];
  reminderHour: number;
  reminderDays: number[];
  badges: string[];
  targetExamName: string | null;
  targetCareerId: string | null;
  targetCareerName: string | null;
}

export async function loadProfileOverview(userProfileId: string): Promise<ProfileOverview | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: {
      displayName: true,
      avatarUrl: true,
      themePref: true,
      fontScale: true,
      dailyGoalMins: true,
      focusSubjectIds: true,
      reminderHour: true,
      reminderDays: true,
      badges: true,
      targetExam: { select: { name: true } },
      targetCareerId: true,
      targetCareer: { select: { name: true } },
    },
  });
  if (!profile) return null;

  return {
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    themePref: normalizeThemePref(profile.themePref),
    fontScale: normalizeFontScale(profile.fontScale),
    dailyGoalMins: normalizeDailyGoal(profile.dailyGoalMins),
    focusSubjectIds: profile.focusSubjectIds,
    reminderHour: normalizeReminderHour(profile.reminderHour),
    reminderDays: normalizeReminderDays(profile.reminderDays),
    badges: profile.badges,
    targetExamName: profile.targetExam?.name ?? null,
    targetCareerId: profile.targetCareerId,
    targetCareerName: profile.targetCareer?.name ?? null,
  };
}

export async function updateDisplayName(userProfileId: string, displayName: string): Promise<void> {
  await prisma.userProfile.update({ where: { id: userProfileId }, data: { displayName } });
}

export async function updateAvatarUrl(userProfileId: string, avatarUrl: string): Promise<void> {
  await prisma.userProfile.update({ where: { id: userProfileId }, data: { avatarUrl } });
}

export async function updateThemePref(userProfileId: string, themePref: ThemePref): Promise<void> {
  await prisma.userProfile.update({ where: { id: userProfileId }, data: { themePref } });
}

// ─────────────────────────────── G100: ajustes ───────────────────────────────

export async function updateFontScale(userProfileId: string, fontScale: FontScale): Promise<void> {
  await prisma.userProfile.update({ where: { id: userProfileId }, data: { fontScale } });
}

export async function updateDailyGoal(userProfileId: string, dailyGoalMins: number): Promise<void> {
  await prisma.userProfile.update({ where: { id: userProfileId }, data: { dailyGoalMins } });
}

export async function updateReminderSchedule(
  userProfileId: string,
  reminderHour: number,
  reminderDays: number[]
): Promise<void> {
  await prisma.userProfile.update({
    where: { id: userProfileId },
    data: { reminderHour, reminderDays },
  });
}

export interface FocusSubjectOption {
  id: string;
  name: string;
}

/**
 * Materias del área del alumno que puede marcar para reforzar, en el orden
 * del examen. Vacío si aún no tiene carrera meta. Es también la LISTA BLANCA
 * de la Server Action: un id que no esté aquí no se guarda.
 */
export async function loadFocusSubjectOptions(userProfileId: string): Promise<FocusSubjectOption[]> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: { targetCareer: { select: { areaId: true } } },
  });
  const areaId = profile?.targetCareer?.areaId;
  if (!areaId) return [];
  return prisma.subject.findMany({
    where: { areaId },
    orderBy: { position: 'asc' },
    select: { id: true, name: true },
  });
}

export async function updateFocusSubjects(userProfileId: string, subjectIds: string[]): Promise<void> {
  await prisma.userProfile.update({
    where: { id: userProfileId },
    data: { focusSubjectIds: subjectIds },
  });
}

// ─────────────────────────────── Mi plan ───────────────────────────────

export interface PlanStatus {
  plan: 'MONTHLY' | 'SEASON_PASS' | 'PREMIUM' | null;
  expiresAt: Date | null;
  isMonthly: boolean;
  /** Solo tiene sentido para MONTHLY — leído en vivo de Stripe (F17 tarea 2):
   *  no se duplica en la DB, Stripe ya es la fuente de verdad de esto. */
  cancelAtPeriodEnd: boolean;
}

export async function loadPlanStatus(userProfileId: string): Promise<PlanStatus> {
  const sub = await getActiveSubscription(userProfileId);
  if (!sub) {
    return { plan: null, expiresAt: null, isMonthly: false, cancelAtPeriodEnd: false };
  }

  let cancelAtPeriodEnd = false;
  if (sub.plan === 'MONTHLY' && sub.stripeSubscriptionId) {
    try {
      const stripeSub = await getStripe().subscriptions.retrieve(sub.stripeSubscriptionId);
      cancelAtPeriodEnd = stripeSub.cancel_at_period_end;
    } catch (err) {
      reportSilentDegradation('billing_status', err);
    }
  }

  return {
    plan: sub.plan,
    expiresAt: sub.expiresAt,
    isMonthly: sub.plan === 'MONTHLY',
    cancelAtPeriodEnd,
  };
}
