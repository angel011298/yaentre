/**
 * Resolución de la IP del cliente (G65). Módulo PURO: recibe un lector de
 * cabeceras, así lo pueden usar tanto `proxy.ts` (Edge, `NextRequest`) como
 * las Server Actions (`headers()` de `next/headers`) y los Route Handlers.
 *
 * Orden de preferencia y por qué:
 *   1. `x-vercel-forwarded-for` — la pone la PLATAFORMA y el cliente no puede
 *      sobreescribirla. Es la única que no se puede falsear desde fuera.
 *   2. `x-forwarded-for` — Vercel también la reescribe, pero es la cabecera
 *      que cualquier proxy intermedio toca; se toma solo el PRIMER salto.
 *   3. `x-real-ip`.
 *
 * Importa el orden porque de esta cadena cuelga el límite de tasa: si un
 * atacante pudiera elegir su propia "IP" en cada petición, cada intento caería
 * en un cubo distinto y el límite por IP no valdría nada.
 */

export type HeaderReader = (name: string) => string | null | undefined;

export const UNKNOWN_IP = 'ip-desconocida';

export function resolveClientIp(getHeader: HeaderReader): string {
  const vercel = firstHop(getHeader('x-vercel-forwarded-for'));
  if (vercel) return vercel;

  const forwarded = firstHop(getHeader('x-forwarded-for'));
  if (forwarded) return forwarded;

  const real = normalize(getHeader('x-real-ip'));
  if (real) return real;

  return UNKNOWN_IP;
}

function firstHop(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return normalize(raw.split(',')[0]);
}

function normalize(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Se acota la longitud: la llave del límite de tasa va a un índice de
  // Postgres y una cabecera es texto arbitrario del exterior.
  const value = raw.trim().slice(0, 45);
  return value.length > 0 ? value : null;
}
