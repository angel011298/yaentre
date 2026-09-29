import { errorResponse, resultResponse } from '@/lib/api/respond';
import { listFraudAlertsForAdmin } from '@/lib/referrals/admin-service';

/** GET /api/admin/referrals/fraud (spec §5) — alertas de fraude. ADMIN (el servicio lo exige por su cuenta). */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return resultResponse(await listFraudAlertsForAdmin());
  } catch (err) {
    return errorResponse(err, { route: 'admin.referrals.fraud' }, 'staff_api');
  }
}
