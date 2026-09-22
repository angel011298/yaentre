import 'server-only';
import type { PricingSeason, SubscriptionPlan, UserRole } from '@prisma/client';
import { prisma } from './prisma';
import { activateSubscriptionTx } from './billing';
import { getAuthIdentities, searchProfileIdsByEmail, type AuthIdentity } from './auth-users';
import { isOnboardingComplete } from '@/lib/onboarding/steps';

/**
 * G99 — capa de datos de la pestaña Usuarios del panel de administración.
 *
 * Regla que gobierna todo este archivo: **nada de material de contraseñas**.
 * Supabase Auth guarda el hash en `auth.users.encrypted_password` y
 * `UserProfile.userId` es solo el UID. Esta capa no lee ese campo, no lo
 * deriva, no mide su fuerza y no lo expone. El requisito de "ver contraseñas"
 * del encargo se sustituyó por forzar restablecimiento y cerrar sesiones, que
 * es lo que de verdad resuelve el problema operativo sin crear uno peor.
 */

export const USERS_PAGE_SIZE = 20;

export interface AdminUserRow {
  id: string;
  role: UserRole;
  displayName: string | null;
  email: string | null;
  emailVerified: boolean;
  createdAt: Date;
  onboardingComplete: boolean;
  diagnosticDone: boolean;
  targetExamLabel: string | null;
  currentStreak: number;
  lastSignInAt: Date | null;
  lastSessionAt: Date | null;
  activeSubscriptions: number;
  compSubscriptions: number;
}

export interface AdminUsersPage {
  rows: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
}

function examLabel(exam: { institutionCode: string; levelName: string } | null): string | null {
  return exam ? `${exam.institutionCode} · ${exam.levelName}` : null;
}

/**
 * Búsqueda paginada por correo O nombre, resuelta EN EL SERVIDOR.
 *
 * El nombre vive en `user_profiles` y el correo en `auth.users`, que están en
 * esquemas distintos y no se pueden unir desde Prisma (el rol de la app no
 * alcanza `auth`). Se resuelven por separado —los ids por correo con la
 * función definer de la migración 0016— y se unen por id. Lo que NUNCA se hace
 * es traerse la tabla entera a memoria para filtrar (G69).
 */
export async function searchUsers(input: { q: string; page: number }): Promise<AdminUsersPage> {
  const page = Math.max(1, input.page);
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
      skip: (page - 1) * USERS_PAGE_SIZE,
      take: USERS_PAGE_SIZE,
      select: {
        id: true,
        role: true,
        displayName: true,
        createdAt: true,
        onboardingStep: true,
        diagnosticDone: true,
        targetExam: {
          select: { level: { select: { name: true, institution: { select: { code: true } } } } },
        },
        streak: { select: { currentStreak: true } },
        subscriptions: { select: { status: true, isComp: true } },
      },
    }),
  ]);

  const ids = profiles.map((p) => p.id);
  const [identities, lastSessions] = await Promise.all([
    getAuthIdentities(ids),
    ids.length
      ? prisma.examSession.groupBy({
          by: ['userProfileId'],
          where: { userProfileId: { in: ids } },
          _max: { startedAt: true },
        })
      : Promise.resolve([] as Array<{ userProfileId: string; _max: { startedAt: Date | null } }>),
  ]);
  const lastSessionByProfile = new Map(
    lastSessions.map((r) => [r.userProfileId, r._max.startedAt ?? null])
  );

  const rows: AdminUserRow[] = profiles.map((p) => {
    const identity: AuthIdentity | undefined = identities.get(p.id);
    const exam = p.targetExam
      ? { institutionCode: p.targetExam.level.institution.code, levelName: p.targetExam.level.name }
      : null;
    return {
      id: p.id,
      role: p.role,
      displayName: p.displayName,
      email: identity?.email ?? null,
      emailVerified: Boolean(identity?.emailConfirmedAt),
      createdAt: p.createdAt,
      onboardingComplete: isOnboardingComplete(p.onboardingStep),
      diagnosticDone: p.diagnosticDone,
      targetExamLabel: examLabel(exam),
      currentStreak: p.streak?.currentStreak ?? 0,
      lastSignInAt: identity?.lastSignInAt ?? null,
      lastSessionAt: lastSessionByProfile.get(p.id) ?? null,
      activeSubscriptions: p.subscriptions.filter((s) => s.status === 'ACTIVE').length,
      compSubscriptions: p.subscriptions.filter((s) => s.isComp).length,
    };
  });

  return { rows, total, page, pageSize: USERS_PAGE_SIZE };
}

export interface AdminUserDetail extends AdminUserRow {
  subscriptions: Array<{
    id: string;
    plan: SubscriptionPlan;
    season: PricingSeason;
    status: string;
    isComp: boolean;
    hasGuarantee: boolean;
    startedAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
    payments: Array<{ id: string; amountMxn: number; method: string; status: string; createdAt: Date }>;
  }>;
}

export async function getUserDetail(userProfileId: string): Promise<AdminUserDetail | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    select: {
      id: true,
      role: true,
      displayName: true,
      createdAt: true,
      onboardingStep: true,
      diagnosticDone: true,
      targetExam: {
        select: { level: { select: { name: true, institution: { select: { code: true } } } } },
      },
      streak: { select: { currentStreak: true } },
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          plan: true,
          season: true,
          status: true,
          isComp: true,
          hasGuarantee: true,
          startedAt: true,
          expiresAt: true,
          createdAt: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            select: { id: true, amountMxn: true, method: true, status: true, createdAt: true },
          },
        },
      },
    },
  });
  if (!profile) return null;

  const identities = await getAuthIdentities([profile.id]);
  const identity = identities.get(profile.id);
  const lastSession = await prisma.examSession.findFirst({
    where: { userProfileId: profile.id },
    orderBy: { startedAt: 'desc' },
    select: { startedAt: true },
  });

  const exam = profile.targetExam
    ? {
        institutionCode: profile.targetExam.level.institution.code,
        levelName: profile.targetExam.level.name,
      }
    : null;

  return {
    id: profile.id,
    role: profile.role,
    displayName: profile.displayName,
    email: identity?.email ?? null,
    emailVerified: Boolean(identity?.emailConfirmedAt),
    createdAt: profile.createdAt,
    onboardingComplete: isOnboardingComplete(profile.onboardingStep),
    diagnosticDone: profile.diagnosticDone,
    targetExamLabel: examLabel(exam),
    currentStreak: profile.streak?.currentStreak ?? 0,
    lastSignInAt: identity?.lastSignInAt ?? null,
    lastSessionAt: lastSession?.startedAt ?? null,
    activeSubscriptions: profile.subscriptions.filter((s) => s.status === 'ACTIVE').length,
    compSubscriptions: profile.subscriptions.filter((s) => s.isComp).length,
    subscriptions: profile.subscriptions,
  };
}

// ───────────────────────────── MUTACIONES ─────────────────────────────

export class AdminUserError extends Error {
  code: 'NOT_FOUND' | 'CONFLICT';
  constructor(code: 'NOT_FOUND' | 'CONFLICT', message: string) {
    super(message);
    this.name = 'AdminUserError';
    this.code = code;
  }
}

export interface CompGrantResult {
  subscriptionId: string;
  plan: SubscriptionPlan;
  season: PricingSeason;
  expiresAt: Date | null;
  earlyBirdBadgeGranted: boolean;
}

/**
 * Alta de un plan como CORTESÍA.
 *
 * Pasa por `activateSubscriptionTx` —la MISMA función que usa el webhook de
 * Stripe— para que el resultado sea indistinguible de una compra: `status`
 * ACTIVE, `startedAt`, `expiresAt` derivado de la fecha del examen objetivo, e
 * insignia Early Bird si aplica. Si esto se hiciera con un `create` suelto, una
 * Premium regalada quedaría sin `expiresAt` y el paywall la trataría distinto.
 *
 * Las dos únicas diferencias, ambas deliberadas:
 *   · `isComp: true` — para que el contador de licencias Early Bird la excluya;
 *   · NO se crea `Payment` — no hubo cobro, y fabricar uno ensuciaría toda la
 *     contabilidad y los reportes de ingresos.
 */
export async function grantCompSubscription(input: {
  userProfileId: string;
  plan: SubscriptionPlan;
  season: PricingSeason;
  now?: Date;
}): Promise<CompGrantResult> {
  const now = input.now ?? new Date();

  return prisma.$transaction(async (tx) => {
    const profile = await tx.userProfile.findUnique({
      where: { id: input.userProfileId },
      select: { id: true },
    });
    if (!profile) throw new AdminUserError('NOT_FOUND', 'No encontramos esa cuenta.');

    const existing = await tx.subscription.findFirst({
      where: { userProfileId: input.userProfileId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (existing) {
      throw new AdminUserError(
        'CONFLICT',
        'Esta cuenta ya tiene un plan activo. Dalo de baja antes de otorgar una cortesía.'
      );
    }

    const created = await tx.subscription.create({
      data: {
        userProfileId: input.userProfileId,
        plan: input.plan,
        season: input.season,
        status: 'PENDING',
        isComp: true,
        hasGuarantee: input.plan === 'PREMIUM',
      },
      select: { id: true },
    });

    const outcome = await activateSubscriptionTx(tx, { subscriptionId: created.id, now });
    if (!outcome || !outcome.activated) {
      throw new AdminUserError('CONFLICT', 'No se pudo activar la cortesía. Intenta de nuevo.');
    }

    return {
      subscriptionId: outcome.subscriptionId,
      plan: outcome.plan,
      season: outcome.season,
      expiresAt: outcome.expiresAt,
      earlyBirdBadgeGranted: outcome.earlyBirdBadgeGranted,
    };
  });
}

/** Baja / cancelación de un plan. Condicionada para no "cancelar" dos veces. */
export async function cancelSubscription(input: {
  userProfileId: string;
  subscriptionId: string;
}): Promise<{ subscriptionId: string; previousStatus: string }> {
  const sub = await prisma.subscription.findUnique({
    where: { id: input.subscriptionId },
    select: { id: true, status: true, userProfileId: true },
  });
  if (!sub || sub.userProfileId !== input.userProfileId) {
    throw new AdminUserError('NOT_FOUND', 'No encontramos ese plan en esta cuenta.');
  }
  if (sub.status === 'CANCELED') {
    throw new AdminUserError('CONFLICT', 'Ese plan ya estaba dado de baja.');
  }

  const updated = await prisma.subscription.updateMany({
    where: { id: sub.id, status: { not: 'CANCELED' } },
    data: { status: 'CANCELED' },
  });
  if (updated.count === 0) {
    throw new AdminUserError('CONFLICT', 'Ese plan ya estaba dado de baja.');
  }

  return { subscriptionId: sub.id, previousStatus: sub.status };
}

/** Cambio de rol. La guarda de "no degradarse a sí mismo" vive en la acción,
 *  porque depende de QUIÉN actúa, no del dato. */
export async function changeUserRole(input: {
  userProfileId: string;
  role: UserRole;
}): Promise<{ previousRole: UserRole; role: UserRole }> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: input.userProfileId },
    select: { role: true },
  });
  if (!profile) throw new AdminUserError('NOT_FOUND', 'No encontramos esa cuenta.');

  await prisma.userProfile.update({
    where: { id: input.userProfileId },
    data: { role: input.role },
  });

  return { previousRole: profile.role, role: input.role };
}
