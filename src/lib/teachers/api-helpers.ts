import 'server-only';
import { NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth/errors';
import { isSameOriginRequest } from '@/lib/auth/same-origin';
import { anyMarketplaceOn, readMarketplaceFlags } from '@/lib/marketplace/flags';
import { consumeRateLimit, type RateLimitName } from '@/lib/rate-limit/store';
import { requireTeacher, type TeacherContext } from './guard';

/**
 * G103 — preámbulo común de los Route Handlers del panel del profesor
 * (`/api/teachers/me/*`). En este orden:
 *   1. bandera del marketplace (apagada → 404, como si la ruta no existiera);
 *   2. mismo origen en escrituras (un Route Handler no trae la validación de
 *      `Origin` de las Server Actions);
 *   3. guard del profesor — el dueño sale de la SESIÓN, nunca del cuerpo;
 *   4. estado que permite editar (suspendido o rechazado: no);
 *   5. límite de tasa COMPARTIDO (Postgres).
 * Toda respuesta lleva `no-store`.
 */
export const noStore = { 'Cache-Control': 'no-store' };

export function apiJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: noStore });
}

const EDITABLE = ['PENDING_REVIEW', 'ACTIVE', 'INACTIVE'];

export async function beginTeacherApi(
  request: Request,
  opts: { write: boolean; rateLimit?: RateLimitName; flag?: 'liveClasses' | 'any' }
): Promise<{ ok: true; ctx: TeacherContext } | { ok: false; response: NextResponse }> {
  const flags = readMarketplaceFlags();
  if (!(opts.flag === 'any' ? anyMarketplaceOn(flags) : flags.liveClasses)) {
    return { ok: false, response: apiJson({ error: 'No encontrado.' }, 404) };
  }
  if (opts.write && !isSameOriginRequest(request.headers)) {
    return { ok: false, response: apiJson({ error: 'Solicitud no permitida.' }, 403) };
  }
  let ctx: TeacherContext;
  try {
    ctx = await requireTeacher();
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        ok: false,
        response: apiJson({ error: err.message }, err.code === 'UNAUTHORIZED' ? 401 : 403),
      };
    }
    throw err;
  }
  if (opts.write && !EDITABLE.includes(ctx.teacher.status)) {
    return { ok: false, response: apiJson({ error: 'Tu perfil de profesor no permite cambios por ahora.' }, 403) };
  }
  if (opts.rateLimit) {
    const v = await consumeRateLimit(opts.rateLimit, ctx.profile.id);
    if (!v.allowed) {
      return { ok: false, response: apiJson({ error: 'Demasiados cambios seguidos. Espera un momento.' }, 429) };
    }
  }
  return { ok: true, ctx };
}
