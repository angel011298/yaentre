import { errorResponse, jsonOk } from '@/lib/api/respond';
import { requireRole } from '@/lib/auth/guards';
import { getResicoStatus } from '@/lib/db/resico';

/** GET /api/admin/resico (spec §10): semáforo del ingreso anual contra el techo de RESICO. Solo ADMIN. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRole('ADMIN');
    return jsonOk(await getResicoStatus());
  } catch (err) {
    return errorResponse(err, { route: 'admin.resico' });
  }
}
