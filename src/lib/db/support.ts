import type { PricingSeason, SubscriptionPlan, UserRole } from '@prisma/client';
import { prisma } from './prisma';
import { getAuthIdentities, searchProfileIdsByEmail } from './auth-users';
import { isNotificationTypeEnabled } from './notifications';
import { evaluateValve, type ValveVerdict } from '@/lib/support/valve';

/**
 * Lecturas de la mesa de SOPORTE — Bloque 3. La ficha trae lo que hace falta para
 * atender una solicitud (quién es, qué compró, qué se le cobró y reembolsó, si
 * está dentro de la válvula) y NADA de su actividad de estudio: ni respuestas, ni
 * sesiones, ni racha. Tampoco material de contraseñas (nunca, en ningún rol).
 */

export interface SupportUserRow {
  id: string;
  role: UserRole;
  displayName: string | null;
  email: string | null;
  createdAt: Date;
  activePlans: number;
}

export async function searchUsersForSupportDb(input: { q: string; page: number; pageSize: number }) {
  const term = input.q.trim();
  let where = {};
  if (term) {
    const idsByEmail = await searchProfileIdsByEmail(term);
    where = {
      OR: [
        { displayName: { contains: term, mode: 'insensitive' as const } },
        ...(idsByEmail.length > 0 ? [{ id: { in: idsByEmail } }] : []),
      ],
    };
  }

  const [total, profiles] = await Promise.all([
    prisma.userProfile.count({ where }),
    prisma.userProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      select: { id: true, role: true, displayName: true, createdAt: true, subscriptions: { select: { status: true } } },
    }),
  ]);
  const identities = await getAuthIdentities(profiles.map((p) => p.id));

  const rows: SupportUserRow[] = profiles.map((p) => ({
    id: p.id,
    role: p.role,
    displayName: p.displayName,
    email: identities.get(p.id)?.email ?? null,
    createdAt: p.createdAt,
    activePlans: p.subscriptions.filter((s) => s.status === 'ACTIVE').length,
  }));
  return { rows, total };
}

export interface SupportPlanRow {
  id: string;
  plan: SubscriptionPlan;
  season: PricingSeason;
  status: string;
  isComp: boolean;
  startedAt: Date | null;
  expiresAt: Date | null;
  paidCents: number;
  refundedCents: number;
  refundableCents: number;
  paidAt: Date | null;
  valve: ValveVerdict;
}

export interface SupportFicha {
  id: string;
  role: UserRole;
  displayName: string | null;
  email: string | null;
  emailVerified: boolean;
  createdAt: Date;
  lastSignInAt: Date | null;
  marketingEnabled: boolean;
  plans: SupportPlanRow[];
}

export async function loadSupportFicha(userProfileId: string, now: Date): Promise<SupportFicha | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: {
      id: true,
      role: true,
      displayName: true,
      createdAt: true,
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          plan: true,
          season: true,
          status: true,
          isComp: true,
          startedAt: true,
          expiresAt: true,
          payments: {
            where: { status: 'SUCCEEDED' },
            select: { amountMxn: true, paidAt: true, refunds: { select: { amountMxn: true } } },
          },
        },
      },
    },
  });
  if (!profile) return null;

  const [identities, marketingEnabled] = await Promise.all([
    getAuthIdentities([profile.id]),
    isNotificationTypeEnabled(profile.id, 'MARKETING'),
  ]);
  const identity = identities.get(profile.id);

  const plans: SupportPlanRow[] = [];
  for (const sub of profile.subscriptions) {
    const paidCents = sub.payments.reduce((s, p) => s + p.amountMxn, 0);
    const refundedCents = sub.payments.reduce((s, p) => s + p.refunds.reduce((r, x) => r + x.amountMxn, 0), 0);
    const paidAt = sub.payments.map((p) => p.paidAt).filter((d): d is Date => d !== null).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
    const since = sub.startedAt ?? paidAt;
    const sessions = since ? await prisma.examSession.count({ where: { userProfileId: profile.id, startedAt: { gte: since } } }) : 0;
    plans.push({
      id: sub.id,
      plan: sub.plan,
      season: sub.season,
      status: sub.status,
      isComp: sub.isComp,
      startedAt: sub.startedAt,
      expiresAt: sub.expiresAt,
      paidCents,
      refundedCents,
      refundableCents: Math.max(0, paidCents - refundedCents),
      paidAt,
      valve: evaluateValve({ paidAt, now, sessionsSinceActivation: sessions }),
    });
  }

  return {
    id: profile.id,
    role: profile.role,
    displayName: profile.displayName,
    email: identity?.email ?? null,
    emailVerified: Boolean(identity?.emailConfirmedAt),
    createdAt: profile.createdAt,
    lastSignInAt: identity?.lastSignInAt ?? null,
    marketingEnabled,
    plans,
  };
}

/** Los hechos de UN plan para decidir un reembolso: lo cobrado, lo ya devuelto y el consumo. */
export async function loadRefundFacts(subscriptionId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    select: {
      id: true,
      plan: true,
      status: true,
      isComp: true,
      startedAt: true,
      userProfileId: true,
      payments: {
        where: { status: 'SUCCEEDED' },
        select: { id: true, amountMxn: true, paidAt: true, stripePaymentIntentId: true, refunds: { select: { amountMxn: true } } },
      },
    },
  });
  if (!sub) return null;

  const paidAt = sub.payments.map((p) => p.paidAt).filter((d): d is Date => d !== null).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  const since = sub.startedAt ?? paidAt;
  const sessionsSinceActivation = since
    ? await prisma.examSession.count({ where: { userProfileId: sub.userProfileId, startedAt: { gte: since } } })
    : 0;

  return {
    id: sub.id,
    plan: sub.plan,
    status: sub.status,
    isComp: sub.isComp,
    userProfileId: sub.userProfileId,
    paidAt,
    sessionsSinceActivation,
    payments: sub.payments.map((p) => ({
      id: p.id,
      amountCents: p.amountMxn,
      paymentIntentId: p.stripePaymentIntentId,
      refundedCents: p.refunds.reduce((s, r) => s + r.amountMxn, 0),
    })),
  };
}
