import { errorResponse, jsonError, jsonOk } from '@/lib/api/respond';
import { getSiteUrl } from '@/lib/auth/site-url';
import { requireRole } from '@/lib/auth/guards';
import { ensureReferralCode } from '@/lib/db/referrals';
import { REFERRAL_ROLES } from '@/lib/referrals/access';
import { referralUrl } from '@/lib/referrals/code';
import { consumeRateLimit } from '@/lib/rate-limit/store';

/**
 * POST /api/referrals/generate (spec §5) — el código de referido de la persona
 * autenticada; lo crea si no existe. IDEMPOTENTE: pedirlo diez veces devuelve el
 * mismo código (una persona tiene UNO por tipo).
 *
 * No recibe cuerpo ni identificador alguno: el dueño sale del guard, nunca del
 * input (guardrail de CLAUDE.md, verificado por `security:authz`).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const { profile } = await requireRole([...REFERRAL_ROLES]);

    const gate = await consumeRateLimit('REFERRAL_GENERATE', profile.id);
    if (!gate.allowed) return jsonError('RATE_LIMIT', 'Demasiadas solicitudes seguidas. Espera un momento.', 429);

    const code = await ensureReferralCode(profile.id);
    const url = referralUrl(code.code, getSiteUrl());
    return jsonOk({ code: code.code, active: code.active, url, qrUrl: `/api/referrals/qr/${code.code}` });
  } catch (err) {
    return errorResponse(err, { route: 'referrals.generate' }, 'referral_api');
  }
}
