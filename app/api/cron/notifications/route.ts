import { NextResponse, type NextRequest } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cron/auth';
import { runDailyNotificationJobs } from '@/lib/db/notification-jobs';

/**
 * Cron diario de notificaciones (F16 tarea 8): racha en riesgo, cuenta
 * regresiva al examen (30/15/7/1 días), y resumen semanal parental (solo
 * dispara de verdad los lunes — ver `isMondayInMexico`). Una sola corrida
 * diaria de este endpoint basta para las tres reglas de cadencia.
 *
 * Protegido con `CRON_SECRET` (criterio de aceptación "protegidas contra
 * ejecución no autorizada") — Vercel Cron agrega automáticamente el header
 * `Authorization: Bearer $CRON_SECRET` a las invocaciones programadas.
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
    const results = await runDailyNotificationJobs(new Date());
    return NextResponse.json({ ok: true, ...results });
  } catch (err) {
    // El runner interno ya aísla cada job con `Promise.allSettled`; esto cubre
    // un fallo del propio orquestador (p. ej. la DB caída al arrancar).
    console.error('[cron/notifications] Falló la corrida diaria', err);
    return NextResponse.json({ ok: false, error: 'CRON_FAILED' }, { status: 500 });
  }
}
