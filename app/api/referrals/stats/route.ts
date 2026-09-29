import { errorResponse, jsonError, jsonOk } from '@/lib/api/respond';
import { getSiteUrl } from '@/lib/auth/site-url';
import { requireRole } from '@/lib/auth/guards';
import { getReferralOverview } from '@/lib/db/referrals';
import { REFERRAL_ROLES } from '@/lib/referrals/access';
import { referralUrl } from '@/lib/referrals/code';
import { consumeRateLimit } from '@/lib/rate-limit/store';

/**
 * GET /api/referrals/stats (spec §5) — el resumen del referidor autenticado:
 * su código, su crédito vigente, cuánto está en verificación y cuántos referidos
 * ya se acreditaron. Solo lo PROPIO: no acepta ningún identificador.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { profile } = await requireRole([...REFERRAL_ROLES]);

    const gate = await consumeRateLimit('REFERRAL_READ', profile.id);
    if (!gate.allowed) return jsonError('RATE_LIMIT', 'Demasiadas consultas seguidas. Espera un momento.', 429);

    const overview = await getReferralOverview(profile.id);
    return jsonOk({
      code: overview.code
        ? { code: overview.code.code, active: overview.code.active, url: referralUrl(overview.code.code, getSiteUrl()) }
        : null,
      balanceCents: overview.balanceCents,
      nextExpiryAt: overview.nextExpiryAt,
      pendingCents: overview.pendingCents,
      pendingCount: overview.pendingCount,
      successfulCount: overview.successfulCount,
    });
  } catch (err) {
    return errorResponse(err, { route: 'referrals.stats' }, 'referral_api');
  }
}
