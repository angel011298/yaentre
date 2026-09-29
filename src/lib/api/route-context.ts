import type { NextResponse } from 'next/server';
import { requireTeacher, requireVerifiedUser } from '@/lib/auth/guards';
import { MarketplaceError } from '@/lib/classes/errors';
import { getActivePremium } from '@/lib/db/classes';
import { marketplaceGate } from '@/lib/marketplace/marketplace-gate';
import { MARKETPLACE_CLOSED_MESSAGE } from '@/lib/marketplace/marketplace-switch';
import { consumeRateLimit, type RateLimitName } from '@/lib/rate-limit/store';
import { errorResponse } from './respond';

/**
 * Preámbulos COMUNES de los Route Handlers del marketplace. Cada uno resuelve la
 * identidad con un guard —nunca con un campo de la petición— y aplica lo que le
 * toca a esa clase de ruta, en un orden fijo. Un Route Handler es su propio
 * endpoint: nada de esto lo hereda de un layout.
 */

type RouteParams = { id?: string };
type RouteArgs = { params?: Promise<RouteParams> };
type Handler<C> = (ctx: C, request: Request, params: RouteParams) => Promise<NextResponse>;

/** Ruta de ALUMNO: sesión verificada, rol STUDENT y marketplace abierto. */
export type StudentContext = Awaited<ReturnType<typeof requireVerifiedUser>>;

export function studentRoute(
  name: string,
  opts: {
    rateLimit?: RateLimitName;
    requirePremium?: boolean;
    /**
     * Exige el interruptor del marketplace ABIERTO. Solo las rutas que empiezan algo
     * nuevo (directorio, cotizar, reservar) lo piden: un alumno con una clase ya
     * pagada debe poder cancelarla, calificarla o reportarla aunque el marketplace
     * se cierre después.
     */
    requireOpen?: boolean;
  },
  handler: Handler<StudentContext>
) {
  return async (request: Request, route?: RouteArgs): Promise<NextResponse> => {
    try {
      if (opts.requireOpen && !marketplaceGate().open) throw new MarketplaceError('MARKETPLACE_CLOSED', MARKETPLACE_CLOSED_MESSAGE);
      const ctx = await requireVerifiedUser();
      if (ctx.profile.role !== 'STUDENT') {
        throw new MarketplaceError('FORBIDDEN', 'Las clases son para cuentas de alumno.');
      }
      if (opts.rateLimit) {
        const v = await consumeRateLimit(opts.rateLimit, ctx.profile.id);
        if (!v.allowed) throw new MarketplaceError('RATE_LIMIT', 'Vas muy rápido. Espera un momento e intenta de nuevo.');
      }
      if (opts.requirePremium && !(await getActivePremium(ctx.profile.id, new Date()))) {
        throw new MarketplaceError('PAYWALL', 'Las clases con profesor son parte del plan Premium.');
      }
      return await handler(ctx, request, (await route?.params) ?? {});
    } catch (err) {
      return errorResponse(err, { route: name });
    }
  };
}

/**
 * Ruta de PROFESOR. NO depende del interruptor del marketplace: un profesor debe
 * poder registrarse, completar su perfil y atender clases ya pagadas mientras la
 * venta a alumnos esté cerrada.
 */
export type TeacherContext = Awaited<ReturnType<typeof requireTeacher>>;

export function teacherRoute(
  name: string,
  opts: { statuses?: Parameters<typeof requireTeacher>[0]; rateLimit?: RateLimitName },
  handler: Handler<TeacherContext>
) {
  return async (request: Request, route?: RouteArgs): Promise<NextResponse> => {
    try {
      const ctx = await requireTeacher(opts.statuses);
      if (opts.rateLimit) {
        const v = await consumeRateLimit(opts.rateLimit, ctx.profile.id);
        if (!v.allowed) throw new MarketplaceError('RATE_LIMIT', 'Vas muy rápido. Espera un momento e intenta de nuevo.');
      }
      return await handler(ctx, request, (await route?.params) ?? {});
    } catch (err) {
      return errorResponse(err, { route: name });
    }
  };
}

/** Lee un id de ruta dinámica (`/[id]/…`) y lo valida antes de usarlo. */
export function idFrom(params: RouteParams): string {
  const id = params?.id ?? '';
  if (!/^[a-z0-9]{10,40}$/.test(id)) throw new MarketplaceError('NOT_FOUND', 'No encontramos ese recurso.');
  return id;
}
