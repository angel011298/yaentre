import { errorResponse, readJson, resultResponse } from '@/lib/api/respond';
import { resolveFlagAdmin } from '@/lib/referrals/admin-service';

/**
 * POST /api/admin/referrals/{id}/resolve-flag — `{id}` es la VENTA marcada por el
 * antifraude. `decision`: CLEAR (falsa alarma: se acredita en la próxima corrida)
 * o CONFIRM (fraude: se revierte). Admin MAESTRO, con motivo.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, route: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await route.params;
    const body = ((await readJson(request)) ?? {}) as { decision?: unknown; reason?: unknown };
    return resultResponse(await resolveFlagAdmin({ saleId: id, decision: body.decision, reason: body.reason }));
  } catch (err) {
    return errorResponse(err, { route: 'admin.referrals.resolve_flag' }, 'staff_api');
  }
}
