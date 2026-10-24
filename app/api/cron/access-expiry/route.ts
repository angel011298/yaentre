import { NextResponse, type NextRequest } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cron/auth';
import { runAccessExpiryJob } from '@/lib/db/access-expiry-jobs';

/**
 * G103 — avisos de vigencia (30/7/1 días, día de expiración y fin de gracia).
 *
 * El aviso diario ya corre dentro de `/api/cron/notifications` (un cron menos
 * en `vercel.json`); esta ruta existe para dispararlo aparte —a mano, desde el
 * servidor propio o para verificarlo— con el MISMO secreto. Correr ambas el
 * mismo día no duplica nada: cada aviso se reclama en la base antes de salir.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const sent = await runAccessExpiryJob(new Date());
    return NextResponse.json({ ok: true, accessExpiry: sent });
  } catch (err) {
    console.error('[cron/access-expiry] Falló la corrida', err);
    return NextResponse.json({ ok: false, error: 'CRON_FAILED' }, { status: 500 });
  }
}
