import type { SubscriptionPlan } from '@prisma/client';
import { prisma } from './prisma';
import {
  checkAccessStatus,
  effectiveGraceEndsAt,
  mexicoCalendarDaysBetween,
  type AccessStatus,
} from '@/lib/subscriptions/access-check';
import { evaluateExtensionEligibility, type ExtensionEligibility } from '@/lib/subscriptions/extension';

/**
 * G103 — resumen de acceso para banners, perfil y la API del alumno.
 *
 * Toma la suscripción que MÁS acceso da (si hay varias: una vencida y una
 * nueva, manda la nueva) entre las que alguna vez estuvieron activas, para
 * poder mostrar también el estado EXPIRED («tu acceso terminó; tu progreso
 * sigue guardado») y no confundirlo con «nunca compraste».
 */
export interface AccessSummary {
  accessStatus: AccessStatus;
  plan: SubscriptionPlan | null;
  expiresAt: Date | null;
  graceEndsAt: Date | null;
  extendedAt: Date | null;
  /** Días de calendario (México) hasta `expiresAt`; null si no aplica. */
  daysLeft: number | null;
  extension: ExtensionEligibility;
}

const RANK: Record<AccessStatus, number> = { ACTIVE: 3, GRACE: 2, EXPIRED: 1, NONE: 0 };

export async function loadAccessSummary(userProfileId: string, now: Date): Promise<AccessSummary> {
  const subs = await prisma.subscription.findMany({
    where: { userProfileId, status: { in: ['ACTIVE', 'EXPIRED', 'CANCELED'] } },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });

  let best: (typeof subs)[number] | null = null;
  let bestStatus: AccessStatus = 'NONE';
  for (const sub of subs) {
    const status = checkAccessStatus(sub, now);
    const better =
      RANK[status] > RANK[bestStatus] ||
      (RANK[status] === RANK[bestStatus] &&
        best !== null &&
        (sub.expiresAt?.getTime() ?? Infinity) > (best.expiresAt?.getTime() ?? Infinity));
    if (!best || better) {
      best = sub;
      bestStatus = status;
    }
  }

  if (!best) {
    return {
      accessStatus: 'NONE',
      plan: null,
      expiresAt: null,
      graceEndsAt: null,
      extendedAt: null,
      daysLeft: null,
      extension: { ok: false, reason: 'NO_PLAN' },
    };
  }

  return {
    accessStatus: bestStatus,
    plan: best.plan,
    expiresAt: best.expiresAt,
    graceEndsAt: effectiveGraceEndsAt(best),
    extendedAt: best.extendedAt,
    daysLeft: best.expiresAt ? mexicoCalendarDaysBetween(now, best.expiresAt) : null,
    extension: evaluateExtensionEligibility(best, now),
  };
}
