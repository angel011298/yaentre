import { errorResponse, readJson, resultResponse } from '@/lib/api/respond';
import { suspendReferralAdmin } from '@/lib/referrals/admin-service';

/**
 * POST /api/admin/referrals/{id}/suspend (spec §5). Admin MAESTRO, con motivo. Toda
 * la verificación (rol, id, bitácora, límite de tasa) vive en el servicio, que
 * también usa la Server Action: esta ruta no repite ni omite nada.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, route: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await route.params;
    const body = ((await readJson(request)) ?? {}) as { reason?: unknown };
    return resultResponse(await suspendReferralAdmin({ referralId: id, reason: body.reason }));
  } catch (err) {
    return errorResponse(err, { route: 'admin.referrals.suspend' }, 'staff_api');
  }
}
