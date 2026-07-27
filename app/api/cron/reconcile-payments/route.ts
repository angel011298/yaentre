import { NextResponse, type NextRequest } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cron/auth';
import { runPaymentReconciliation } from '@/lib/db/billing';

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

  const summary = await runPaymentReconciliation(new Date());
  return NextResponse.json({ ok: true, ...summary });
}
