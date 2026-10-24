import 'server-only';
import Stripe from 'stripe';

/**
 * Cliente de Stripe — SOLO servidor. `import 'server-only'` hace que el build
 * falle si este módulo llega a un bundle de cliente, blindando la regla de
 * CLAUDE.md: `STRIPE_SECRET_KEY` nunca debe cruzar al navegador.
 *
 * Se instancia de forma perezosa (lazy): así importar este módulo en el borde
 * (p. ej. para tipos) no explota si la env var no está presente en ese
 * contexto; solo el primer uso real exige la llave.
 */
let stripeSingleton: Stripe | null = null;

/**
 * G103 — SOLO para la pila local de e2e (`pnpm test:e2e:local`): apunta el SDK
 * a un simulador de Stripe que corre en ESTE equipo. Triple candado: se ignora
 * si existe `VERCEL_ENV` (siempre definido en Vercel y en el servidor propio),
 * solo acepta `localhost`/`127.0.0.1` (la llave nunca viaja a otro host) y solo
 * con una llave de prueba. Fuera de esa pila no cambia nada.
 */
export function localStripeApi(env: Record<string, string | undefined> = process.env): { host: string; port: number; protocol: 'http' } | null {
  const raw = env.STRIPE_E2E_LOCAL_API;
  if (!raw || env.VERCEL_ENV || !env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' || (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') || !url.port) return null;
  return { host: url.hostname, port: Number(url.port), protocol: 'http' };
}

export function getStripe(): Stripe {
  if (stripeSingleton) return stripeSingleton;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Falta STRIPE_SECRET_KEY: la integración de pagos no está configurada.');
  }

  stripeSingleton = new Stripe(secretKey, {
    // La API de Stripe cambia por versión; fijamos telemetría off y dejamos que
    // el SDK use su apiVersion embebida (evita divergencias silenciosas).
    telemetry: false,
    appInfo: { name: 'YaEntre', url: 'https://yaentre.com' },
    ...(localStripeApi() ?? {}),
  });

  return stripeSingleton;
}
