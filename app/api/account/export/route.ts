import { NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';
import { buildUserDataExport } from '@/lib/db/account';
import { consumeRateLimit } from '@/lib/rate-limit/store';

/**
 * Exportar todos los datos del usuario (F17 tarea 3). Route Handler (no
 * Server Action): así el navegador puede descargarlo como archivo real vía
 * `Content-Disposition: attachment`, sin JS de por medio para "guardarlo".
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  let authUser;
  let profileId: string;
  try {
    const result = await requireUser();
    authUser = result.authUser;
    profileId = result.profile.id;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[account/export] Error de autenticación inesperado', err);
    return NextResponse.json({ error: 'No pudimos verificar tu sesión.' }, { status: 500 });
  }

  // G65: la exportación lee TODO el historial del alumno (sesiones con sus
  // respuestas incluidas) en una sola consulta pesada. Es el endpoint
  // autenticado más caro del producto y no tenía tope propio — el de
  // `proxy.ts` no cuenta entre instancias.
  const gate = await consumeRateLimit('ACCOUNT_EXPORT', profileId);
  if (!gate.allowed) {
    return NextResponse.json(
      { error: 'Ya pediste tu exportación varias veces. Intenta de nuevo en un rato.' },
      { status: 429, headers: { 'Retry-After': String(gate.retryAfterSecs) } }
    );
  }

  let json: string;
  try {
    const data = await buildUserDataExport(profileId, authUser.email ?? null);
    json = JSON.stringify(data, null, 2);
  } catch (err) {
    console.error('[account/export] No se pudo construir la exportación', { profileId, err });
    return NextResponse.json(
      { error: 'No pudimos generar tu exportación ahora. Intenta de nuevo en un momento.' },
      { status: 500 }
    );
  }

  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="yaentre-datos-${profileId}.json"`,
    },
  });
}
