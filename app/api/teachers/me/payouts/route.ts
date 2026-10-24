import { getTeacherPayoutOverview } from '@/lib/db/payouts';
import { apiJson, beginTeacherApi } from '@/lib/teachers/api-helpers';
import { payoutReference } from '@/lib/teachers/payout-sheet';

/**
 * G103 — mis liquidaciones (spec del marketplace §11). Solo lectura: el
 * profesor sale de la SESIÓN. Ningún dato bancario en la respuesta.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const begin = await beginTeacherApi(request, { write: false, flag: 'any' });
  if (!begin.ok) return begin.response;
  const o = await getTeacherPayoutOverview(begin.ctx.teacher.id, new Date());
  return apiJson({
    accumulatingCents: o.preview.netCents,
    heldRetentionCents: o.heldRetentionCents,
    nextReleaseAt: o.nextReleaseAt,
    payouts: o.payouts.map((p) => ({ ...p, reference: payoutReference(p.id) })),
  });
}
