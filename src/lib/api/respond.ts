import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthError } from '@/lib/auth/errors';
import { MarketplaceError } from '@/lib/classes/errors';
import { reportSilentDegradation } from '@/lib/observability/report';

/**
 * Respuestas JSON de los Route Handlers del marketplace — Bloque 2.
 *
 * Toda respuesta lleva `Cache-Control: no-store`: traen datos de una persona
 * (clases, saldo, CLABE enmascarada) y ni el CDN de Vercel ni el navegador
 * deben guardarlas. El service worker ya excluye estas rutas por su cuenta
 * (`public/sw.js`), porque las cabeceras no lo detienen.
 */

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status, headers: NO_STORE });
}

export function jsonError(code: string, message: string, status: number, extra?: HeadersInit): NextResponse {
  return NextResponse.json(
    { ok: false, code, message },
    { status, headers: { ...NO_STORE, ...(extra as Record<string, string> | undefined) } }
  );
}

/**
 * Convierte cualquier error en una respuesta. Los errores CONOCIDOS (de
 * autorización, de validación, de dominio) se traducen con su mensaje; todo lo
 * demás es un 500 GENÉRICO —el mensaje real jamás sale al cliente, puede traer
 * un identificador, una consulta o un fragmento de un dato personal— y se
 * reporta a Sentry: un 500 que solo vive en un log de Vercel es justo el patrón
 * de G73b.
 */
export function errorResponse(err: unknown, context: Record<string, unknown> = {}): NextResponse {
  if (err instanceof AuthError) {
    // 404 en lugar de 403 lo decide cada ruta cuando conviene no confirmar que
    // el recurso existe; el resto usa el código del guard.
    const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'PAYWALL' ? 402 : 403;
    return jsonError(err.code, err.message, status);
  }
  if (err instanceof MarketplaceError) {
    return jsonError(err.code, err.message, err.status);
  }
  if (err instanceof ZodError) {
    return jsonError('VALIDATION', err.issues[0]?.message ?? 'Datos inválidos.', 400);
  }

  reportSilentDegradation('marketplace_api', err, context);
  return jsonError('UNKNOWN', 'Algo salió mal. Intenta de nuevo en un momento.', 500);
}

/** Lee el cuerpo JSON de forma segura: cuerpo ausente o malformado ⇒ `undefined`, nunca lanza. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
