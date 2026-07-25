'use server';

import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';
import { getActiveSubscription } from '@/lib/db/paywall';
import { getStripe } from '@/lib/stripe/client';
import type { ActionResult } from '@/lib/sessions/schemas';

/**
 * Cancelación de plan (F17 tarea 2, criterio "sin necesidad de contactar
 * soporte"). Solo MONTHLY es cancelable aquí: es el único plan recurrente
 * de Stripe (SEASON_PASS/PREMIUM son pago único, F8 — no hay nada que
 * "cancelar", su vigencia ya expira sola en la fecha del examen).
 *
 * `cancel_at_period_end: true` (no cancelación inmediata): el alumno ya
 * pagó ese periodo, sigue teniendo acceso hasta que termine — el mismo
 * webhook de F8 (`customer.subscription.deleted`) desactivará el acceso
 * cuando Stripe de verdad cierre la suscripción al final del periodo. Esta
 * acción NUNCA activa/desactiva acceso directamente (regla de oro de
 * CLAUDE.md: el acceso se controla solo por webhook).
 */
export async function cancelMonthlySubscriptionAction(): Promise<
  ActionResult<{ cancelAtPeriodEnd: true }>
> {
  try {
    const { profile } = await requireUser();
    const sub = await getActiveSubscription(profile.id);
    if (!sub || sub.plan !== 'MONTHLY' || !sub.stripeSubscriptionId) {
      return {
        ok: false,
        code: 'NOT_MONTHLY',
        message: 'No tienes un plan mensual activo para cancelar.',
      };
    }

    await getStripe().subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    return { ok: true, data: { cancelAtPeriodEnd: true } };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, code: err.code, message: err.message };
    console.error('[billing] No se pudo cancelar la suscripción', err);
    return { ok: false, code: 'STRIPE', message: 'No pudimos procesar la cancelación. Intenta de nuevo.' };
  }
}
