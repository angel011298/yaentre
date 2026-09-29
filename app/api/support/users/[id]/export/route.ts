import { NextResponse } from 'next/server';
import { errorResponse, resultResponse } from '@/lib/api/respond';
import { exportUserDataForSupport } from '@/lib/support/service';

/**
 * GET /api/support/users/{id}/export — ARCO, ACCESO: los datos de un titular en
 * JSON, como archivo. Capacidad `arco.handle` (soporte y admin). Toda la
 * verificación —guard, id cuid, límite de tasa, bitácora ANTES de entregar el
 * archivo— vive en el servicio.
 *
 * `no-store` y `attachment`: son datos personales de una persona, a veces de un
 * menor; ni el CDN ni el navegador los guardan, y el service worker excluye esta
 * ruta por su cuenta (`public/sw.js`).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, route: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await route.params;
    const result = await exportUserDataForSupport({ userProfileId: id });
    if (!result.ok) return resultResponse(result);

    return new NextResponse(result.data.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${result.data.filename}"`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    return errorResponse(err, { route: 'support.export' }, 'support_action');
  }
}
