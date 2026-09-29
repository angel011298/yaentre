import { NextResponse, type NextRequest } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cron/auth';
import { runPaymentReconciliation } from '@/lib/db/billing';
import { runReferralJobs, stripeRefundLookup } from '@/lib/db/referral-jobs';
import { getStripe } from '@/lib/stripe/client';

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
    const referrals = await runReferralJobs(now, stripeDeps);

    return NextResponse.json(
      { ok: referrals.failedSteps.length === 0, ...summary, referrals },
      { status: referrals.failedSteps.length === 0 ? 200 : 500 }
    );
  } catch (err) {
    // Seguro de re-ejecutar: cada activación pasa por `runIdempotent` +
    // la guarda `status !== 'ACTIVE'`, así que un reintento tras un fallo
    // parcial no doble-activa ni doble-cobra.
    console.error('[cron/reconcile-payments] Falló la corrida', err);
    return NextResponse.json({ ok: false, error: 'CRON_FAILED' }, { status: 500 });
  }
}
