import { z } from 'zod';
import { errorResponse, jsonError, jsonOk } from '@/lib/api/respond';
import { requireRole } from '@/lib/auth/guards';
import { getReferralHistory } from '@/lib/db/referrals';
import { REFERRAL_ROLES } from '@/lib/referrals/access';
import { daysUntilAccrual } from '@/lib/referrals/presentation';
import { consumeRateLimit } from '@/lib/rate-limit/store';

/**
 * GET /api/referrals/history (spec §5) — el historial de ventas referidas.
 *
 * 🔒 NO trae ningún dato del comprador —ni nombre, ni correo, ni identificador—:
 * quien invita no tiene por qué saber quién compró, y muchos compradores son
 * menores. (La spec §4 dibuja «María G.»; esto es minimización de datos.) Tampoco
 * trae marcas de antifraude ni motivos de reversa por fraude: `underReview` dice
 * «en verificación» y nada más.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) });

export async function GET(request: Request) {
  try {
    const { profile } = await requireRole([...REFERRAL_ROLES]);

    const gate = await consumeRateLimit('REFERRAL_READ', profile.id);
    if (!gate.allowed) return jsonError('RATE_LIMIT', 'Demasiadas consultas seguidas. Espera un momento.', 429);

    const parsed = querySchema.safeParse({ limit: new URL(request.url).searchParams.get('limit') ?? undefined });
    if (!parsed.success) return jsonError('VALIDATION', 'El límite debe ser un número entre 1 y 100.', 400);

    const now = new Date();
    const items = await getReferralHistory(profile.id, parsed.data.limit);
    return jsonOk({
      items: items.map((i) => ({
        date: i.createdAt,
        commissionCents: i.commissionCents,
        status: i.status,
        underReview: i.underReview,
        daysUntilAccrual: i.status === 'PENDING' ? daysUntilAccrual(i.accrueAfter, now) : null,
      })),
    });
  } catch (err) {
    return errorResponse(err, { route: 'referrals.history' }, 'referral_api');
  }
}
