import { NextResponse, type NextRequest } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cron/auth';
import { runHourlyReminderJobs } from '@/lib/db/reminder-jobs';

/**
 * G100 — cron HORARIO de recordatorios con horario elegido por el alumno.
 *
 * Vercel Hobby solo programa crons diarios, así que este endpoint NO está en
 * `vercel.json`: lo llama `pg_cron` + `pg_net` desde Supabase cada hora
 * (migración 0020), con el mismo `Authorization: Bearer $CRON_SECRET` que usa
 * Vercel Cron. El secreto vive en Supabase Vault, nunca en una migración.
 * `POST` además de `GET` porque `net.http_post` es la forma natural de pg_net.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(request: NextRequest): Promise<NextResponse> {
  const authorized = isAuthorizedCronRequest(
    request.headers.get('authorization'),
    process.env.CRON_SECRET
  );
  if (!authorized) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const results = await runHourlyReminderJobs(new Date());
    return NextResponse.json({ ok: true, ...results });
  } catch (err) {
    console.error('[cron/reminders] Falló la corrida horaria', err);
    return NextResponse.json({ ok: false, error: 'CRON_FAILED' }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
