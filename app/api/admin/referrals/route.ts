import { errorResponse, resultResponse } from '@/lib/api/respond';
import { listReferrersForAdmin } from '@/lib/referrals/admin-service';

/** GET /api/admin/referrals (spec §5) — todos los referidores. ADMIN (el servicio lo exige por su cuenta). */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return resultResponse(await listReferrersForAdmin());
  } catch (err) {
    return errorResponse(err, { route: 'admin.referrals.list' }, 'staff_api');
  }
}
