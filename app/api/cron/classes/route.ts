import { NextResponse, type NextRequest } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cron/auth';
import { getClassroomProvider } from '@/lib/classroom/google-calendar';
import { runClassLifecycle } from '@/lib/classes/lifecycle';
import { marketplaceGate } from '@/lib/marketplace/marketplace-gate';
import { reportSilentDegradation } from '@/lib/observability/report';
import { getStripe } from '@/lib/stripe/client';

/**
 * Cron del ciclo de vida de las clases (Bloque 2): suelta reservas sin pagar,
 * pide confirmaciones, manda enlaces del aula y reintenta reembolsos.
 *
 * Mismo patrón que `/api/cron/reconcile-payments`: `CRON_SECRET` por
 * `Authorization: Bearer`, sin secreto nunca autoriza.
 *
 * NO está en `vercel.json`: el plan Hobby solo admite crons diarios y este job
 * necesita correr cada 5-10 minutos (el enlace sale 15 min antes de la clase).
 * Mientras el marketplace esté cerrado no hay clases y el job no hace nada;
 * ver RETORNO_BLOQUE2.md antes de abrirlo.
 *
 * Con el marketplace cerrado NO se sale temprano: puede haber clases ya pagadas
 * (cortesías, pruebas) y sus reembolsos/avisos no deben quedar colgados.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const summary = await runClassLifecycle({
      stripe: getStripe(),
      classroom: getClassroomProvider(),
      now: new Date(),
    });
    // Un paso que reventó NO es un 200 limpio: el monitor del cron debe verlo.
    return NextResponse.json(
      { ok: summary.failedSteps.length === 0, marketplaceOpen: marketplaceGate().open, ...summary },
      { status: summary.failedSteps.length === 0 ? 200 : 500 }
    );
  } catch (err) {
    reportSilentDegradation('class_lifecycle', err, { step: 'cron' });
    return NextResponse.json({ ok: false, error: 'CRON_FAILED' }, { status: 500 });
  }
}
