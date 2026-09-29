import { NextResponse, type NextRequest } from 'next/server';
import { getSiteUrl } from '@/lib/auth/site-url';
import { resolveClientIp } from '@/lib/rate-limit/client-ip';
import { checkRateLimit } from '@/lib/rate-limit/limiter';
import { reportSilentDegradation } from '@/lib/observability/report';
import {
  REFERRAL_COOKIE_MAX_AGE_SECS,
  REFERRAL_COOKIE_NAME,
  hasReferralAttribution,
  normalizeReferralCode,
} from '@/lib/referrals/code';
import { resolveCodeForAttribution } from '@/lib/db/referrals';

/**
 * GET /r/{código} — el enlace y el QR de un referidor (ESPECIFICACION_QR §3.2).
 *
 * Escribe la cookie de atribución y redirige a la landing. Reglas:
 *
 *  · FIRST TOUCH WINS: si el visitante ya trae una atribución bien formada, NO se
 *    sobreescribe. Ni la de un enlace posterior ni la de un código distinto.
 *  · Solo se escribe la cookie para un código REAL y ACTIVO (Nivel 1). Un código
 *    inventado o suspendido redirige igual, sin cookie: el enlace nunca «falla» de
 *    cara al visitante.
 *  · La cookie es `httpOnly` (ningún script de la página la lee ni la altera),
 *    `sameSite=lax` y `secure` en producción, 30 días.
 *  · Es una ruta PÚBLICA que consulta la base: lleva el limitador barato en
 *    memoria por IP para que un barrido de códigos al azar no se convierta en
 *    carga. No cuenta entre instancias (G65 §5) y no lo pretende; lo único que
 *    protege es la base, y un código inventado no atribuye nada de todos modos.
 *
 * `?ref={código}` en el redirect es solo para las analíticas (spec §3.2); la
 * atribución sale de la cookie, y NADA lee ese parámetro.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LINK_LIMIT = 30;
const LINK_WINDOW_MS = 60_000;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  const { code: rawCode } = await context.params;
  const code = normalizeReferralCode(rawCode);
  const landing = new URL('/', getSiteUrl());
  if (code) landing.searchParams.set('ref', code);

  const redirect = () => {
    const res = NextResponse.redirect(landing, 307);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  };

  if (!code) return NextResponse.redirect(new URL('/', getSiteUrl()), 307);

  // First touch wins: ya hay una atribución, no se consulta ni se escribe nada.
  if (hasReferralAttribution(request.cookies.get(REFERRAL_COOKIE_NAME)?.value)) return redirect();

  const ip = resolveClientIp((name) => request.headers.get(name));
  if (!checkRateLimit(`ref:${ip}`, LINK_LIMIT, LINK_WINDOW_MS).allowed) return redirect();

  let valid = false;
  try {
    valid = (await resolveCodeForAttribution(code)) !== null;
  } catch (err) {
    // La visita no se rompe por esto, pero una atribución perdida es un referidor
    // que no cobra por una venta suya: tiene que verse.
    reportSilentDegradation('referral_attribution', err, { stage: 'link' });
  }

  const res = redirect();
  if (valid) {
    res.cookies.set(REFERRAL_COOKIE_NAME, code, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: REFERRAL_COOKIE_MAX_AGE_SECS,
      path: '/',
    });
  }
  return res;
}
