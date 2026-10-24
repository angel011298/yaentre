import { NextResponse, type NextRequest } from 'next/server';
import { AuthError } from '@/lib/auth/errors';
import { requireRole } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { logAdminAction } from '@/lib/admin/audit-log';
import { getTeacherForAdmin } from '@/lib/db/teachers';
import { reportControlFailure } from '@/lib/observability/report';
import { consumeRateLimit } from '@/lib/rate-limit/store';
import { isPdf, TEACHER_DOCS_BUCKET } from '@/lib/teachers/documents';

/**
 * G103 — descarga de la constancia de situación fiscal de un profesor.
 * Mismo trato que la bóveda (G99): el rol se verifica AQUÍ, sin rol responde
 * 404 (no se confirma que exista), `no-store`, `nosniff`, siempre como
 * DESCARGA (`attachment`) y con nombre fijo. La lectura en Storage usa la
 * sesión del admin y la política `teacher_documents_select` (is_admin()).
 * Cada descarga deja fila en la bitácora: son datos fiscales de una persona.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const notFound = () => new NextResponse('No encontrado', { status: 404, headers: { 'Cache-Control': 'no-store' } });

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  let actor: { userProfileId: string; email: string | null | undefined };
  try {
    const { profile, authUser } = await requireRole('ADMIN');
    actor = { userProfileId: profile.id, email: authUser.email };
  } catch (err) {
    if (err instanceof AuthError) return notFound();
    throw err;
  }
  if (!/^c[a-z0-9]{20,40}$/.test(id)) return notFound();

  const limit = await consumeRateLimit('ADMIN_VAULT_READ', actor.userProfileId);
  if (!limit.allowed) return new NextResponse('Demasiadas peticiones', { status: 429, headers: { 'Cache-Control': 'no-store' } });

  const teacher = await getTeacherForAdmin(id);
  if (!teacher?.csfDocumentPath) return notFound();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(TEACHER_DOCS_BUCKET).download(teacher.csfDocumentPath);
  if (error || !data) {
    reportControlFailure('marketplace_storage', 'fail-closed', error ?? new Error('sin cuerpo'), { operation: 'csf_download' });
    return notFound();
  }
  const bytes = new Uint8Array(await data.arrayBuffer());
  if (!isPdf(bytes)) return notFound();

  await logAdminAction('teacher.reviewed', actor, {
    targetKind: 'teacher',
    targetUserProfileId: teacher.userProfileId,
    metadata: { teacherId: teacher.id, viewed: 'csf' },
  });

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="constancia-situacion-fiscal.pdf"',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store, max-age=0',
      Pragma: 'no-cache',
    },
  });
}
