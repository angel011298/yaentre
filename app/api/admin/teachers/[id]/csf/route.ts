import { NextResponse } from 'next/server';
import { errorResponse, resultResponse } from '@/lib/api/respond';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { CSF_BUCKET } from '@/lib/teachers/csf';
import { resolveCsfPathForAdmin } from '@/lib/teachers/admin-service';
import { reportSilentDegradation } from '@/lib/observability/report';

/**
 * GET /api/admin/teachers/{id}/csf — entrega la constancia (PDF) de un profesor
 * al admin MAESTRO. La lectura se audita ANTES de entregar; el archivo sale por
 * la sesión del propio admin (la política del bucket lo permite solo a ADMIN) y
 * con `no-store` + `attachment` + `nosniff`: es un documento fiscal y no debe
 * quedar en ninguna caché ni interpretarse en el navegador.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, route: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await route.params;
    const resolved = await resolveCsfPathForAdmin({ teacherId: id });
    if (!resolved.ok) return resultResponse(resolved);

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.storage.from(CSF_BUCKET).download(resolved.data.path);
    if (error || !data) {
      reportSilentDegradation('marketplace_api', error ?? new Error('Constancia sin contenido'), { stage: 'csf_download' });
      return resultResponse({ ok: false, code: 'UPSTREAM', message: 'No pudimos abrir la constancia.' });
    }
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="constancia.pdf"',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    return errorResponse(err, { route: 'admin.teachers.csf' });
  }
}
