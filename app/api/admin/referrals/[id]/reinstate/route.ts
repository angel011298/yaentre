import { errorResponse, readJson, resultResponse } from '@/lib/api/respond';
import { reinstateReferralAdmin } from '@/lib/referrals/admin-service';

/** POST /api/admin/referrals/{id}/reinstate — reactiva un código suspendido. Admin MAESTRO, con motivo. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, route: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await route.params;
    const body = ((await readJson(request)) ?? {}) as { reason?: unknown };
    return resultResponse(await reinstateReferralAdmin({ referralId: id, reason: body.reason }));
  } catch (err) {
    return errorResponse(err, { route: 'admin.referrals.reinstate' }, 'staff_api');
  }
}
