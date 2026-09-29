import { errorResponse, jsonOk } from '@/lib/api/respond';
import { requireCapability } from '@/lib/auth/guards';
import { getResicoStatus } from '@/lib/db/resico';

/**
 * GET /api/admin/resico (spec §10): semáforo del ingreso anual contra el techo de
 * RESICO. Solo lectura: `fiscal.read` (admin y contador). El layout de `/admin` no
 * cubre a un Route Handler, así que la capacidad se exige aquí.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireCapability('fiscal.read');
    return jsonOk(await getResicoStatus());
  } catch (err) {
    return errorResponse(err, { route: 'admin.resico' }, 'staff_api');
  }
}
