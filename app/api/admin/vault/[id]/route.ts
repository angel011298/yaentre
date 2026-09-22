import { NextResponse, type NextRequest } from 'next/server';
import { AuthError } from '@/lib/auth/errors';
import { requireRole } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { logAdminAction } from '@/lib/admin/audit-log';
import { getVaultFile } from '@/lib/db/admin-vault';
import { vaultResponseHeaders, VAULT_BUCKET } from '@/lib/admin/vault';
import { consumeRateLimit } from '@/lib/rate-limit/store';
import { reportControlFailure } from '@/lib/observability/report';

/**
 * G99 — sirve un archivo de la bóveda.
 *
 * ⚠️ ESTE HANDLER VERIFICA EL ROL POR SU CUENTA. `app/admin/layout.tsx` no lo
 * cubre: una Route Handler es su propio endpoint y se alcanza con un GET
 * directo, sin renderizar ningún layout.
 *
 * `?download=1` cambia `Content-Disposition` a `attachment`. Sin él, `inline`:
 * el navegador MUESTRA el archivo y no lo escribe en Descargas.
 *
 * `dynamic = 'force-dynamic'` y `revalidate = 0` para que ni Next ni el CDN
 * de Vercel guarden nada de esta ruta; las cabeceras `no-store` lo repiten
 * hacia el navegador y hacia cualquier proxy intermedio.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  let actor: { userProfileId: string; email: string | null | undefined };
  try {
    const { profile, authUser } = await requireRole('ADMIN');
    actor = { userProfileId: profile.id, email: authUser.email };
  } catch (err) {
    if (err instanceof AuthError) {
      // 404, no 403: a quien no tiene permiso no se le confirma siquiera que
      // el archivo exista.
      return new NextResponse('No encontrado', {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      });
    }
    throw err;
  }

  const limit = await consumeRateLimit('ADMIN_VAULT_READ', actor.userProfileId);
  if (!limit.allowed) {
    return new NextResponse('Demasiadas peticiones', {
      status: 429,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': String(limit.retryAfterSecs) },
    });
  }

  const file = await getVaultFile(id);
  if (!file) {
    return new NextResponse('No encontrado', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const download = request.nextUrl.searchParams.get('download') === '1';

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(VAULT_BUCKET).download(file.path);
  if (error || !data) {
    reportControlFailure('admin_vault_storage', 'fail-closed', error ?? new Error('sin cuerpo'), {
      operation: 'download',
      fileId: file.id,
    });
    return new NextResponse('No pudimos leer el archivo', {
      status: 502,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  await logAdminAction(download ? 'vault.downloaded' : 'vault.viewed', actor, {
    targetKind: 'file',
    metadata: { fileId: file.id, originalName: file.originalName },
  });

  return new NextResponse(await data.arrayBuffer(), {
    status: 200,
    headers: vaultResponseHeaders({
      mimeType: file.mimeType,
      originalName: file.originalName,
      download,
    }),
  });
}
