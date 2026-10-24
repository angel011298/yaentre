import type { SubscriptionPlan } from '@prisma/client';
import { calculateExpirationDate } from '@/lib/subscriptions/access-duration';

/**
 * Vigencia (expiresAt) de una suscripción ya activada. Módulo PURO.
 *
 * - MONTHLY: suscripción recurrente de Stripe. El acceso vive mientras el
 *   estado sea ACTIVE; Stripe controla las renovaciones/cancelaciones, así que
 *   NO se calcula una fecha de expiración en la app → `null`.
 * - SEASON_PASS / PREMIUM: **12 meses desde la activación** (G103, decisión de
 *   Ángel del 23-oct-2026, spec de temporalidad §3.2). El cálculo vive en
 *   `src/lib/subscriptions/access-duration.ts` (meses de calendario en hora de
 *   México).
 *
 * Hasta G102 la vigencia era «hasta la fecha del examen objetivo» con un
 * respaldo de 150 días. La regla de F19 sigue en pie y ahora se cumple por
 * construcción: un pago SIEMPRE otorga vigencia futura — 12 meses a partir del
 * instante de activar, sin depender de un dato del perfil que pueda faltar o
 * haber pasado.
 */
export function computeExpiresAt(plan: SubscriptionPlan, now: Date): Date | null {
  return calculateExpirationDate(plan, now);
}
