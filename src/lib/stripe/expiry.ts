import type { SubscriptionPlan } from '@prisma/client';

/**
 * Vigencia (expiresAt) de una suscripción ya activada. Módulo PURO (Task 1):
 *
 * - MONTHLY: suscripción recurrente de Stripe. El acceso vive mientras el
 *   estado sea ACTIVE; Stripe controla las renovaciones/cancelaciones, así que
 *   NO se calcula una fecha de expiración en la app → `null`.
 * - SEASON_PASS / PREMIUM: pago único cuya vigencia es «hasta el día del examen
 *   objetivo del usuario» (PRD §9, Flujo_App §10). Se controla en la app, no en
 *   Stripe.
 *
 * Si el plan es de pase/premium pero el usuario aún no tiene examen objetivo
 * con fecha conocida (`examDate` null), se cae a un respaldo prudente: 150 días
 * desde la activación (≈ una temporada de examen). Así el acceso pagado nunca
 * queda sin vigencia por un dato faltante, sin inventar una fecha de examen.
 */

export const SEASON_PASS_FALLBACK_DAYS = 150;

export function computeExpiresAt(
  plan: SubscriptionPlan,
  examDate: Date | null,
  now: Date
): Date | null {
  if (plan === 'MONTHLY') return null;

  if (examDate) return examDate;

  const fallback = new Date(now);
  fallback.setUTCDate(fallback.getUTCDate() + SEASON_PASS_FALLBACK_DAYS);
  return fallback;
}
