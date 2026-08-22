import type { ThemePref } from '@/lib/profile/theme';
import { prisma } from './prisma';
import { getActiveSubscription } from './paywall';
import { getStripe } from '@/lib/stripe/client';

/**
 * Orquestación de la pantalla de perfil (F17): lecturas/escrituras chicas y
 * enfocadas sobre `UserProfile`, en el mismo estilo que `src/lib/db/dashboard.ts`
 * (F11) — cada función hace una cosa, la página las combina.
 */

export interface ProfileOverview {
  displayName: string | null;
  avatarUrl: string | null;
  themePref: ThemePref;
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
    themePref: profile.themePref === 'light' ? 'light' : 'dark',
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

// ─────────────────────────────── Carrera meta ───────────────────────────────

export interface CareerOption {
  id: string;
  name: string;
  minAciertos: number | null;
}

/**
 * Carreras a las que el alumno puede cambiar su meta (F17 tarea 2) — SOLO
 * dentro de la misma área que ya eligió en onboarding (F5). Cambiar de área
 * por completo es un cambio de fondo (temario, materias) que corresponde al
 * asistente de onboarding, no a un selector de ajustes.
 */
export async function loadCareerOptions(userProfileId: string): Promise<CareerOption[]> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: { targetCareer: { select: { areaId: true } } },
  });
  const areaId = profile?.targetCareer?.areaId;
  if (!areaId) return [];

  return prisma.career.findMany({
    where: { areaId },
    select: { id: true, name: true, minAciertos: true },
    orderBy: { name: 'asc' },
  });
}

export type UpdateTargetCareerResult = 'OK' | 'INVALID_CAREER';

/**
 * Cambia la carrera meta (F17 tarea 2). Verificado contra la DB (nunca se
 * confía en el `careerId` del cliente): debe pertenecer a la MISMA área que
 * la carrera actual. El Entrómetro no necesita recomputar `predictedScore`
 * (depende de las materias del ÁREA, no de la carrera) — el "hueco" contra
 * la meta ya se recalcula solo en cada carga, porque `computeCareerStrategy`
 * (F6) siempre lee `targetCareerId` fresco desde la DB.
 */
export async function updateTargetCareer(
  userProfileId: string,
  careerId: string
): Promise<UpdateTargetCareerResult> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: { targetCareer: { select: { areaId: true } } },
  });
  const currentAreaId = profile?.targetCareer?.areaId;
  if (!currentAreaId) return 'INVALID_CAREER';

  const career = await prisma.career.findUnique({
    where: { id: careerId },
    select: { areaId: true },
  });
  if (!career || career.areaId !== currentAreaId) return 'INVALID_CAREER';

  await prisma.userProfile.update({ where: { id: userProfileId }, data: { targetCareerId: careerId } });
  return 'OK';
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
      console.error('[profile] No se pudo leer el estado de la suscripción en Stripe', err);
    }
  }

  return {
    plan: sub.plan,
    expiresAt: sub.expiresAt,
    isMonthly: sub.plan === 'MONTHLY',
    cancelAtPeriodEnd,
  };
}
