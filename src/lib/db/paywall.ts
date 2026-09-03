import type { Subscription } from '@prisma/client';
import { prisma } from './prisma';
import { startOfMexicoDay } from '@/lib/paywall/mexico-time';
import {
  canAccessParentDashboard,
  canAnswerDrillQuestion,
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

/** Simulacros completos TERMINADOS (para estadística/progreso — "cuántos ha
 *  COMPLETADO", `src/lib/db/dashboard.ts`). NO es el conteo que decide el
 *  muro de pago: ver `countFullSimulationAttempts` para eso, y por qué son
 *  dos funciones distintas a propósito (G67). */
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
 * G67 🔴 — Intentos de simulacro completo, de CUALQUIER estado.
 *
 * El muro de pago debe contar esto, no `countCompletedFullSimulations`. La
 * diferencia importaba en la práctica: como el simulacro entrega TODO su
 * contenido (~120-140 reactivos con enunciado y las 4 opciones) al abrir la
 * sesión —igual que un examen real, es la razón de ser del simulador—, un
 * alumno gratuito podía arrancar uno, no terminarlo nunca (o dejar pasar el
 * tiempo límite), y como solo `COMPLETED`/`COMPLETED_BY_TIMEOUT` contaban
 * contra el "1 gratis", el muro nunca se activaba: cada ciclo
 * arrancar→abandonar→esperar a que `startSimulation` deje de poder RETOMARLo
 * (pasado `timeLimitSecs`, unas pocas horas — no hay que esperar el umbral de
 * 24h de sesión "stale") entregaba un simulacro COMPLETO nuevo, gratis, sin
 * límite. Contando cualquier intento —sin importar si se terminó— el "1
 * gratis" es real: una vez que se te sirvió el contenido, se usó tu cupo.
 */
export async function countFullSimulationAttempts(userProfileId: string): Promise<number> {
  return prisma.examSession.count({
    where: { userProfileId, mode: 'FULL_SIMULATION' },
  });
}

/**
 * G67 — Reactivos de práctica libre (TOPIC_DRILL/AREA_PRACTICE) SERVIDOS
 * "hoy" en huso horario de México — antes solo contaba los RESPONDIDOS
 * (`selectedOption IS NOT NULL`), y esa era la fuga: `startDrillSession`
 * entrega el enunciado y las opciones completas de los 10 reactivos al
 * ABRIR la sesión, antes de que el alumno responda ninguno. Como nada
 * marcaba "ya te enseñé estos 10" hasta que de verdad los contestaras, un
 * alumno (o un script) que nunca contestaba veía `answeredToday` fijo en 0
 * para siempre, y cada llamada a `startDrillSession` traía 10 reactivos
 * NUEVOS (la exclusión de 72h de `loadRecentlyAnsweredIds` sí cuenta
 * sesiones en curso, así que cada tanda era distinta a la anterior) — el
 * "10 reactivos diarios" no frenaba nada.
 *
 * `SessionAnswer` no tiene timestamp propio — se usa `session.startedAt`
 * como proxy, la misma convención ya establecida en el motor adaptativo
 * (F6, `loadRecentlyAnsweredIds`).
 */
export async function countDrillQuestionsServedToday(
  userProfileId: string,
  now: Date = new Date()
): Promise<number> {
  const dayStart = startOfMexicoDay(now);
  return prisma.sessionAnswer.count({
    where: {
      session: {
        userProfileId,
        mode: { in: ['TOPIC_DRILL', 'AREA_PRACTICE'] },
        startedAt: { gte: dayStart },
      },
    },
  });
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
    countDrillQuestionsServedToday(userProfileId, now),
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
