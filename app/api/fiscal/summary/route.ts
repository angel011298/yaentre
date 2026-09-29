import { errorResponse, jsonError, jsonOk } from '@/lib/api/respond';
import { parseFiscalYear } from '@/lib/api/fiscal-params';
import { requireCapability } from '@/lib/auth/guards';
import { getFiscalSnapshot } from '@/lib/db/fiscal';
import { consumeRateLimit } from '@/lib/rate-limit/store';

/**
 * GET /api/fiscal/summary?year=2026 — el estado fiscal de un año (IVA trasladado
 * por mes, ESCENARIOS de retención, reserva de desempeño y cobertura de datos).
 * SOLO LECTURA: `fiscal.read` (contador y admin). Un Route Handler es su propio
 * endpoint: la capacidad se exige aquí, no en ningún layout.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { profile } = await requireCapability('fiscal.read');

    const gate = await consumeRateLimit('FISCAL_READ', profile.id);
    if (!gate.allowed) {
      return jsonError('RATE_LIMIT', 'Consultaste el tablero muchas veces seguidas. Espera un momento.', 429);
    }

    const now = new Date();
    const year = parseFiscalYear(new URL(request.url).searchParams.get('year'), now);
    if (!year.ok) return jsonError('VALIDATION', 'Ese año fiscal no es válido.', 400);

    return jsonOk(await getFiscalSnapshot(year.year, now));
  } catch (err) {
    return errorResponse(err, { route: 'fiscal.summary' });
  }
}
