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
  });

  return stripeSingleton;
}
