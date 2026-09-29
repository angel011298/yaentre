import type Stripe from 'stripe';
import { reportSilentDegradation } from '@/lib/observability/report';
import {
  accrueDueSales,
  backfillMissingSales,
  releaseStaleRedemptions,
  type AccrualDeps,
  type AccrualSummary,
  type StaleRedemptionSummary,
} from './referrals';

/**
 * Job diario del programa de referidos (Bloque 3). Corre al final del cron de
 * reconciliación de pagos (`/api/cron/reconcile-payments`), que ya existe y ya
 * tiene acceso a Stripe: no se agregó un cron nuevo porque el plan Hobby de
 * Vercel solo admite dos y ambos están ocupados.
 *
 * Tres pasos, AISLADOS entre sí (mismo criterio que `runClassLifecycle`, G73b):
 *
 *  1. respaldo — compras atribuidas que no dejaron fila de venta;
 *  2. acreditación — ventas cuyo periodo antifraude de 7 días terminó;
 *  3. limpieza — apartados de crédito que quedaron sin resolver.
 *
 * Un paso que revienta NO se aplana a «0 procesadas»: se reporta y viaja en
 * `failedSteps`, y la ruta responde 500. Es lo que evita el defecto de G73b:
 * `{"accrued":0}` significando lo mismo con o sin error.
 */

export interface ReferralJobsSummary {
  backfill: { examined: number; recorded: number; failed: number } | null;
  accrual: AccrualSummary | null;
  redemptions: StaleRedemptionSummary | null;
  failedSteps: string[];
}

/** Lo reembolsado de un PaymentIntent, según Stripe (la fuente de verdad, no nuestra copia). */
export function stripeRefundLookup(stripe: Stripe): AccrualDeps {
  return {
    async getRefundedCents(paymentIntentId) {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
      const charge = pi.latest_charge;
      return charge && typeof charge !== 'string' ? charge.amount_refunded : 0;
    },
  };
}

export async function runReferralJobs(now: Date, deps: AccrualDeps | null): Promise<ReferralJobsSummary> {
  const summary: ReferralJobsSummary = { backfill: null, accrual: null, redemptions: null, failedSteps: [] };

  const step = async <T>(name: string, run: () => Promise<T>): Promise<T | null> => {
    try {
      return await run();
    } catch (err) {
      summary.failedSteps.push(name);
      reportSilentDegradation('scheduled_job', err, { job: 'referrals', step: name });
      return null;
    }
  };

  summary.backfill = await step('backfill', () => backfillMissingSales(now));

  if (deps) {
    summary.accrual = await step('accrual', () => accrueDueSales(now, deps));
    if (summary.accrual && summary.accrual.failed > 0) summary.failedSteps.push('accrual:unverified');
  } else {
    // Sin llave de Stripe no se puede COMPROBAR que no hubo reembolso, y sin
    // comprobarlo no se acredita: un paso omitido no es un paso exitoso.
    summary.failedSteps.push('accrual:no_stripe');
    reportSilentDegradation('scheduled_job', new Error('STRIPE_SECRET_KEY ausente: no se acredita sin verificar reembolsos'), {
      job: 'referrals',
      step: 'accrual',
    });
  }

  summary.redemptions = await step('redemptions', () => releaseStaleRedemptions(now));
  return summary;
}
