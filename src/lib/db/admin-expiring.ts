import type { SubscriptionPlan } from '@prisma/client';
import { prisma } from './prisma';
import { getAuthEmails } from './auth-users';
import { checkAccessStatus, effectiveGraceEndsAt, type AccessStatus } from '@/lib/subscriptions/access-check';

/**
 * G103 — suscripciones que vencen en los próximos N días o que están en su
 * periodo de gracia (spec §3.6 `GET /api/admin/subscriptions/expiring`).
 * Solo lectura; lo consume el panel admin, siempre detrás de ADMIN.
 */
export interface ExpiringRow {
  subscriptionId: string;
  userProfileId: string;
  email: string | null;
  plan: SubscriptionPlan;
  isComp: boolean;
  expiresAt: Date;
  graceEndsAt: Date | null;
  accessStatus: AccessStatus;
  extendedAt: Date | null;
  noticesSent: string[];
}

export async function listExpiringSubscriptions(now: Date, days = 30): Promise<ExpiringRow[]> {
  const horizon = new Date(now.getTime() + days * 24 * 3600 * 1000);
  const graceFloor = new Date(now.getTime() - 8 * 24 * 3600 * 1000);
  const subs = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      plan: { in: ['SEASON_PASS', 'PREMIUM'] },
      expiresAt: { gte: graceFloor, lte: horizon },
    },
    orderBy: { expiresAt: 'asc' },
    take: 500,
  });
  const emails = subs.length ? await getAuthEmails([...new Set(subs.map((s) => s.userProfileId))]) : new Map();
  return subs
    .map((s) => ({
      subscriptionId: s.id,
      userProfileId: s.userProfileId,
      email: emails.get(s.userProfileId) ?? null,
      plan: s.plan,
      isComp: s.isComp,
      expiresAt: s.expiresAt!,
      graceEndsAt: effectiveGraceEndsAt(s),
      accessStatus: checkAccessStatus(s, now),
      extendedAt: s.extendedAt,
      noticesSent: s.expiryNoticesSent,
    }))
    .filter((r) => r.accessStatus === 'ACTIVE' || r.accessStatus === 'GRACE');
}
