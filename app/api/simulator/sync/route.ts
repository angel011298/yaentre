import { NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';
import { recordSimulatorSync } from '@/lib/db/simulator';
import { simulatorSyncSchema } from '@/lib/simulator/schema';

/**
 * Sincronización del simulador (F12 tarea 6). Este endpoint —y no una Server
 * Action— porque es el destino de `navigator.sendBeacon`, que solo sabe hacer
 * POST a una URL: (1) flush periódico, (2) reintento al reconectar, (3) beacon
 * en `beforeunload`/`pagehide` para no perder respuestas al cerrar el navegador.
 *
 * Idempotente (upsert por reactivo, contadores fusionados al máximo). Guardrail:
 * la respuesta NUNCA incluye la correctitud — solo cuántas respuestas registró.
 */
export async function POST(req: Request): Promise<Response> {
  let profileId: string;
  try {
    const { profile } = await requireUser();
    profileId = profile.id;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 });
  }

  // sendBeacon manda el cuerpo como texto plano; parseamos manualmente para no
  // depender del Content-Type que ponga el navegador.
  let raw: unknown;
  try {
    raw = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ ok: false, error: 'BAD_JSON' }, { status: 400 });
  }

  const parsed = simulatorSyncSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'VALIDATION' }, { status: 400 });
  }

  let result;
  try {
    result = await recordSimulatorSync({
      userProfileId: profileId,
      sessionId: parsed.data.sessionId,
      answers: parsed.data.answers,
      integrity: parsed.data.integrity,
      suspicionEvents: parsed.data.suspicionEvents,
      completedFullscreen: parsed.data.completedFullscreen,
    });
  } catch (err) {
    // El destino del `sendBeacon` del simulador: un 500 con cuerpo genérico,
    // nunca un stack. Se registra con el sessionId para diagnóstico.
    console.error('[simulator/sync] Falló al persistir el lote', {
      sessionId: parsed.data.sessionId,
      err,
    });
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 });
  }

  if (!result.ok) {
    const status = result.code === 'FORBIDDEN' ? 403 : result.code === 'NOT_FOUND' ? 404 : 409;
    return NextResponse.json({ ok: false, error: result.code }, { status });
  }

  return NextResponse.json({ ok: true, recorded: result.recorded });
}
