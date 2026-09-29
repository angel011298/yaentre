import { NextResponse, type NextRequest } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cron/auth';
import { runPaymentReconciliation } from '@/lib/db/billing';
import { runReferralJobs, stripeRefundLookup } from '@/lib/db/referral-jobs';
import { getStripe } from '@/lib/stripe/client';
import { reconcileRecentRefunds } from '@/lib/stripe/refund-webhook';
import { reportSilentDegradation } from '@/lib/observability/report';

/**
 * Cron diario de reconciliación de pagos (F22 — edge case documentado desde
 * F8: "Webhook nunca llega → Job de reconciliación consulta Stripe; alerta
 * a soporte", Flujo_App §15.1). Mismo patrón de protección que
 * `/api/cron/notifications` (F16): `CRON_SECRET` vía header
 * `Authorization: Bearer`, que Vercel Cron agrega automáticamente.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authorized = isAuthorizedCronRequest(
    request.headers.get('authorization'),
    process.env.CRON_SECRET
  );
  if (!authorized) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const now = new Date();
    const summary = await runPaymentReconciliation(now);

    // Bloque 3: el programa de referidos corre DESPUÉS de reconciliar los pagos
    // (un cobro rescatado ya puede generar su venta atribuida) y aislado: su
    // fallo no invalida el resultado de la reconciliación, pero SÍ se ve — un
    // paso que falló responde 500 y no un `accrued: 0` limpio (G73b).
    let stripeDeps = null;
    try {
      stripeDeps = process.env.STRIPE_SECRET_KEY ? stripeRefundLookup(getStripe()) : null;
    } catch {
      stripeDeps = null;
    }
    // Bloque 3: reembolsos que el webhook no dejó (endpoint sin suscribir a
    // `charge.refunded`, caída, reintentos agotados). ANTES de acreditar referidos:
    // una venta reembolsada no debe acreditarse.
    let refunds: { examined: number; inserted: number } | null = null;
    let refundsFailed = false;
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        refunds = await reconcileRecentRefunds(getStripe(), now);
      } catch (err) {
        refundsFailed = true;
        reportSilentDegradation('scheduled_job', err, { job: 'refund-reconciliation' });
      }
    }

    const referrals = await runReferralJobs(now, stripeDeps);
    const failed = referrals.failedSteps.length > 0 || refundsFailed;

    return NextResponse.json(
      { ok: !failed, ...summary, refunds, refundsFailed, referrals },
      { status: failed ? 500 : 200 }
    );
  } catch (err) {
    // Seguro de re-ejecutar: cada activación pasa por `runIdempotent` +
    // la guarda `status !== 'ACTIVE'`, así que un reintento tras un fallo
    // parcial no doble-activa ni doble-cobra.
    console.error('[cron/reconcile-payments] Falló la corrida', err);
    return NextResponse.json({ ok: false, error: 'CRON_FAILED' }, { status: 500 });
  }
}
