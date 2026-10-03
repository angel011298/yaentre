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
 *
 * ── Servidor propio detrás de Cloudflare (`TRUSTED_PROXY=cloudflare`) ──
 * Fuera de Vercel NADIE reescribe esas tres cabeceras: Cloudflare deja pasar
 * tal cual una `x-vercel-forwarded-for` que mande el cliente, y AÑADE su IP al
 * final de `x-forwarded-for` en vez de reemplazarla, así que el primer salto lo
 * elige el atacante. Ahí la única cabecera que el cliente no controla es
 * `cf-connecting-ip`, que el borde de Cloudflare sobreescribe siempre. Vale
 * solo porque el contenedor no publica ningún puerto: todo lo que llega a la
 * app pasó por el túnel. En ese modo NO se cae a las otras tres —serían otra vez
 * elegibles por el cliente—: sin `cf-connecting-ip` (peticiones internas del
 * propio servidor) se usa el cubo desconocido, el más restrictivo. La variable
 * la fija la imagen Docker (Dockerfile y deploy/docker-compose.yml); en Vercel
 * no existe y el orden de arriba queda exactamente igual.
 */

export type HeaderReader = (name: string) => string | null | undefined;

export type TrustedProxy = 'vercel' | 'cloudflare';

export const UNKNOWN_IP = 'ip-desconocida';

/** Coincidencia EXACTA: cualquier otro valor deja el comportamiento de Vercel. */
export function trustedProxyFromEnv(value: string | undefined = process.env.TRUSTED_PROXY): TrustedProxy {
  return value === 'cloudflare' ? 'cloudflare' : 'vercel';
}

export function resolveClientIp(
  getHeader: HeaderReader,
  proxy: TrustedProxy = trustedProxyFromEnv()
): string {
  if (proxy === 'cloudflare') {
    return normalize(getHeader('cf-connecting-ip')) ?? UNKNOWN_IP;
  }

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
