import type { Subscription } from '@prisma/client';
import { prisma } from './prisma';
import { startOfMexicoDay } from '@/lib/paywall/mexico-time';
import {
  canAccessParentDashboard,
  canAnswerDrillQuestion,
  canStartFullSimulation,
  canViewExplanationLayer,
  drillQuestionsRemainingToday,
  type GateDecision,
} from '@/lib/paywall/gates';

/**
 * Orquestación del muro suave (F9): conecta el motor puro de decisiones
 * (`src/lib/paywall/gates.ts`) con Prisma. Cualquier Server Action, Route
 * Handler o página que necesite saber "¿puede este usuario hacer X?" importa
 * las funciones `evaluate*Gate` de aquí — es el único lugar que sabe CÓMO se
 * calculan los conteos reales.
 */

const FINISHED_STATUSES = ['COMPLETED', 'COMPLETED_BY_TIMEOUT'] as const;

/** Suscripción activa y VIGENTE (no basta el status: una `expiresAt` pasada
 *  ya no da acceso aunque el status siga en ACTIVE hasta que un cron la
 *  transicione a EXPIRED — ver F22). */
export async function getActiveSubscription(userProfileId: string): Promise<Subscription | null> {
  const now = new Date();
  return prisma.subscription.findFirst({
    where: {
      userProfileId,
      status: 'ACTIVE',
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function isUserPaid(userProfileId: string): Promise<boolean> {
  return (await getActiveSubscription(userProfileId)) !== null;
}

/** Simulacros completos históricos (F9: solo el conteo de terminados cuenta —
 *  ver resultados después, o abandonar uno, no gasta el gratuito). */
export async function countCompletedFullSimulations(userProfileId: string): Promise<number> {
  return prisma.examSession.count({
    where: {
      userProfileId,
      mode: 'FULL_SIMULATION',
      status: { in: [...FINISHED_STATUSES] },
    },
  });
}

/**
 * Reactivos de práctica libre (TOPIC_DRILL/AREA_PRACTICE) respondidos "hoy"
 * en huso horario de México. `SessionAnswer` no tiene timestamp propio —
 * se usa `session.startedAt` como proxy, la misma convención ya establecida
 * en el motor adaptativo (F6, `loadRecentlyAnsweredIds`).
 */
export async function countDrillAnswersToday(
  userProfileId: string,
  now: Date = new Date()
): Promise<number> {
  const dayStart = startOfMexicoDay(now);
  return prisma.sessionAnswer.count({
    where: {
      selectedOption: { not: null },
      session: {
        userProfileId,
        mode: { in: ['TOPIC_DRILL', 'AREA_PRACTICE'] },
        startedAt: { gte: dayStart },
      },
    },
  });
}

export async function evaluateSimulationGate(userProfileId: string): Promise<GateDecision> {
  const [isPaid, completedCount] = await Promise.all([
    isUserPaid(userProfileId),
    countCompletedFullSimulations(userProfileId),
  ]);
  return canStartFullSimulation({ isPaid, completedCount });
}

export interface DrillGateResult {
  decision: GateDecision;
  remainingToday: number | null;
}

export async function evaluateDrillGate(
  userProfileId: string,
  now: Date = new Date()
): Promise<DrillGateResult> {
  const [isPaid, answeredToday] = await Promise.all([
    isUserPaid(userProfileId),
    countDrillAnswersToday(userProfileId, now),
  ]);
  return {
    decision: canAnswerDrillQuestion({ isPaid, answeredToday }),
    remainingToday: drillQuestionsRemainingToday({ isPaid, answeredToday }),
  };
}

export async function evaluateExplanationLayerGate(
  userProfileId: string,
  layer: number
): Promise<GateDecision> {
  if (layer <= 1) return { allowed: true };
  const isPaid = await isUserPaid(userProfileId);
  return canViewExplanationLayer({ isPaid, layer });
}

export async function evaluateParentDashboardGate(userProfileId: string): Promise<GateDecision> {
  const sub = await getActiveSubscription(userProfileId);
  return canAccessParentDashboard({ plan: sub?.plan ?? null, isActive: sub !== null });
}
