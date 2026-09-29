import { NextResponse } from 'next/server';
import { errorResponse, jsonError } from '@/lib/api/respond';
import { getSiteUrl } from '@/lib/auth/site-url';
import { requireRole } from '@/lib/auth/guards';
import { getOwnReferralCode } from '@/lib/db/referrals';
import { REFERRAL_ROLES } from '@/lib/referrals/access';
import { normalizeReferralCode } from '@/lib/referrals/code';
import { generateReferralQR } from '@/lib/referrals/qr';
import { consumeRateLimit } from '@/lib/rate-limit/store';

/**
 * GET /api/referrals/qr/{code} (spec §5) — el QR del enlace como PNG.
 *
 * Solo el QR del código PROPIO: el código de la ruta se compara con el del
 * guard, y cualquier otro —de otra persona o inexistente— es 404 sin distinguir.
 * (El código es público a propósito, pero generar QR ajenos con CPU del servidor
 * no es un servicio que se ofrezca.) `?download=1` lo entrega como archivo.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, route: { params: Promise<{ code: string }> }) {
  try {
    const { profile } = await requireRole([...REFERRAL_ROLES]);

    const gate = await consumeRateLimit('REFERRAL_QR', profile.id);
    if (!gate.allowed) return jsonError('RATE_LIMIT', 'Descargaste muchos QR seguidos. Espera un momento.', 429);

    const wanted = normalizeReferralCode((await route.params).code);
    const own = await getOwnReferralCode(profile.id);
    if (!wanted || !own || own.code !== wanted) return jsonError('NOT_FOUND', 'No encontramos ese código.', 404);
    if (!own.active) return jsonError('FORBIDDEN', 'Tu código está suspendido. Escríbenos si crees que es un error.', 403);

    const png = await generateReferralQR(own.code, getSiteUrl());
    const download = new URL(request.url).searchParams.get('download') === '1';
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        ...(download ? { 'Content-Disposition': `attachment; filename="yaentre-qr-${own.code}.png"` } : {}),
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    return errorResponse(err, { route: 'referrals.qr' }, 'referral_api');
  }
}
