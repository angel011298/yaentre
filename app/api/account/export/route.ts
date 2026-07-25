import { NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';
import { buildUserDataExport } from '@/lib/db/account';

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
    throw err;
  }

  const data = await buildUserDataExport(profileId, authUser.email ?? null);
  const json = JSON.stringify(data, null, 2);

  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="acierta-datos-${profileId}.json"`,
    },
  });
}
