import type { SubscriptionPlan } from '@prisma/client';

/**
 * Motor de decisiones del muro suave (F9). Módulo PURO: recibe los CONTEOS ya
 * resueltos (por la capa DB, src/lib/db/paywall.ts) y decide si la acción se
 * permite — sin Prisma, sin fechas de sistema, 100% testeable con objetos
 * planos. Es la "capa central reutilizable" que pide la tarea: cualquier
 * Server Action, Route Handler o página consulta estas mismas funciones en
 * vez de reimplementar el límite.
 *
 * Matriz de gates (Flujo_App §9.1):
 *   - Simulacro completo: 1 gratis (revisar resultados después NO cuenta).
 *   - Drill / práctica libre: 10 reactivos/día, se reinicia a medianoche MX.
 *   - Resolución por capas: Capa 1 siempre gratis; Capa 2+ requiere plan.
 *   - Panel parental: requiere Pase de Temporada o Premium (Mensual NO alcanza).
 */

export const FREE_FULL_SIMULATION_LIMIT = 1;
export const FREE_DRILL_DAILY_LIMIT = 10;
export const FREE_EXPLANATION_LAYER = 1;

/**
 * Bloque 1 (handoff §3.2): el plan Free deja de regalar el simulacro COMPLETO
 * (120/140) y ofrece un MEDIO simulacro de 60 reactivos, una sola vez. El resto
 * del muro suave no cambia (sigue siendo 1 intento). Este es el tope de
 * reactivos que se le SIRVEN a un usuario gratuito en su simulacro.
 */
export const FREE_HALF_SIMULATION_QUESTION_COUNT = 60;

/**
 * Cuántos reactivos se sirven en un simulacro según el plan. Pagado → el total
 * oficial del examen (120/140). Free → el medio simulacro (60), acotado por si
 * el examen tuviera menos reactivos oficiales que 60. Puro y testeable; la capa
 * DB (`startSimulation`) solo lo aplica.
 */
export function simulationQuestionTarget(input: {
  isPaid: boolean;
  officialTotal: number;
}): number {
  if (input.isPaid) return input.officialTotal;
  return Math.min(FREE_HALF_SIMULATION_QUESTION_COUNT, input.officialTotal);
}

/**
 * Tiempo límite del simulacro, en segundos. Pagado → la duración oficial
 * completa. Free → proporcional al número de reactivos servidos frente al total
 * oficial (un medio simulacro se resuelve con medio tiempo), para que la presión
 * de reloj siga siendo fiel al examen real. Puro y testeable.
 */
export function simulationTimeLimitSecs(input: {
  isPaid: boolean;
  officialTotal: number;
  officialDurationMins: number;
  servedTarget: number;
}): number {
  const fullSecs = input.officialDurationMins * 60;
  if (input.isPaid || input.officialTotal <= 0) return fullSecs;
  return Math.round((fullSecs * input.servedTarget) / input.officialTotal);
}

/** Planes que sí desbloquean el panel parental (PRD §9: Mensual no incluye). */
export const PARENT_DASHBOARD_PLANS: readonly SubscriptionPlan[] = ['SEASON_PASS', 'PREMIUM'];

export type PaywallTrigger =
  | 'FULL_SIMULATION_LIMIT'
  | 'DRILL_DAILY_LIMIT'
  | 'EXPLANATION_LAYER'
  | 'PARENT_DASHBOARD';

export type GateDecision = { allowed: true } | { allowed: false; trigger: PaywallTrigger };

const ALLOWED: GateDecision = { allowed: true };

export function canStartFullSimulation(input: {
  isPaid: boolean;
  completedCount: number;
}): GateDecision {
  if (input.isPaid) return ALLOWED;
  return input.completedCount < FREE_FULL_SIMULATION_LIMIT
    ? ALLOWED
    : { allowed: false, trigger: 'FULL_SIMULATION_LIMIT' };
}

export function canAnswerDrillQuestion(input: {
  isPaid: boolean;
  answeredToday: number;
}): GateDecision {
  if (input.isPaid) return ALLOWED;
  return input.answeredToday < FREE_DRILL_DAILY_LIMIT
    ? ALLOWED
    : { allowed: false, trigger: 'DRILL_DAILY_LIMIT' };
}

/** Cuántos reactivos de práctica libre le quedan hoy. `null` = ilimitado (plan pagado). */
export function drillQuestionsRemainingToday(input: {
  isPaid: boolean;
  answeredToday: number;
}): number | null {
  if (input.isPaid) return null;
  return Math.max(0, FREE_DRILL_DAILY_LIMIT - input.answeredToday);
}

export function canViewExplanationLayer(input: { isPaid: boolean; layer: number }): GateDecision {
  if (input.layer <= FREE_EXPLANATION_LAYER) return ALLOWED;
  return input.isPaid ? ALLOWED : { allowed: false, trigger: 'EXPLANATION_LAYER' };
}

export function canAccessParentDashboard(input: {
  plan: SubscriptionPlan | null;
  isActive: boolean;
}): GateDecision {
  if (input.isActive && input.plan && PARENT_DASHBOARD_PLANS.includes(input.plan)) return ALLOWED;
  return { allowed: false, trigger: 'PARENT_DASHBOARD' };
}
