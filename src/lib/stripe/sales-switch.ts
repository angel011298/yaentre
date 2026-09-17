/**
 * G98 — INTERRUPTOR DE VENTAS. Módulo PURO: decide si la compra está abierta
 * a partir del entorno, sin tocar Stripe, la DB ni Sentry.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 *
 * Desde G70 producción corre con llaves de PRUEBA de Stripe (G72 lo declaró
 * bloqueador absoluto del lanzamiento). Con la tarjeta de prueba PÚBLICA de
 * Stripe —`4242 4242 4242 4242`, que cualquiera conoce— un alumno con correo
 * verificado podía activar un plan de pago sin pagar un peso y, de paso,
 * descontar una de las 500 licencias Early Bird. Esconder el botón en la
 * interfaz no cierra nada: la Server Action sigue ahí y se invoca con un
 * `fetch`. El cierre tiene que vivir en el SERVIDOR.
 *
 * ── Las dos condiciones ──────────────────────────────────────────────────
 *
 *  1. `SALES_OPEN === 'true'`. Ausente o cualquier otro valor = cerrada. El
 *     default seguro es CERRADO: olvidar una variable no puede abrir la caja.
 *  2. En producción (`VERCEL_ENV === 'production'`), además, la llave de
 *     Stripe tiene que ser de MODO REAL (`sk_live_` / `rk_live_`). Abrir la
 *     venta con llave de prueba en producción es una configuración
 *     INCONSISTENTE: el dueño cree que está vendiendo y nadie está pagando.
 *     Esa combinación cierra la venta y se reporta (ver `evaluateSalesGate`).
 *
 * Fuera de producción (preview, local) basta con `SALES_OPEN=true`: es el
 * único modo de ejercitar el flujo completo contra Stripe de prueba.
 *
 * El módulo NO lee `process.env` por su cuenta: recibe un `SalesEnv` para ser
 * testeable sin mutar el entorno del proceso. `readSalesEnv()` es el único
 * punto que lo toca.
 */

export interface SalesEnv {
  /** `SALES_OPEN` tal cual viene del entorno (puede faltar). */
  salesOpen: string | undefined;
  /** `VERCEL_ENV`: 'production' | 'preview' | 'development' | undefined. */
  vercelEnv: string | undefined;
  /** `STRIPE_SECRET_KEY` tal cual (puede faltar). */
  stripeSecretKey: string | undefined;
}

/**
 * Por qué la venta está cerrada. Distinguir los motivos importa: `misconfigured`
 * es el único que significa "alguien creyó que la abrió" y merece una alerta.
 */
export type SalesClosedReason =
  /** `SALES_OPEN` ausente o distinto de 'true' — el caso normal hoy. */
  | 'flag_off'
  /** `SALES_OPEN=true` en producción con llave de PRUEBA. */
  | 'misconfigured_test_key_in_production';

export type SalesGate =
  | { open: true }
  | { open: false; reason: SalesClosedReason };

/** Modo de una llave secreta de Stripe. `unknown` = ausente o irreconocible. */
export type StripeKeyMode = 'live' | 'test' | 'unknown';

/**
 * Modo de la llave por su PREFIJO. Stripe distingue llave secreta (`sk_`) y
 * llave restringida (`rk_`); ambas operan de verdad en modo real, así que las
 * dos cuentan como `live`. Cualquier otra cosa —ausente, vacía, un placeholder
 * — es `unknown`, que NUNCA vale como real.
 */
export function stripeKeyMode(secretKey: string | undefined): StripeKeyMode {
  if (!secretKey) return 'unknown';
  if (secretKey.startsWith('sk_live_') || secretKey.startsWith('rk_live_')) return 'live';
  if (secretKey.startsWith('sk_test_') || secretKey.startsWith('rk_test_')) return 'test';
  return 'unknown';
}

/** ¿El despliegue es el de producción real? Solo `VERCEL_ENV === 'production'`. */
export function isProductionDeployment(vercelEnv: string | undefined): boolean {
  return vercelEnv === 'production';
}

/**
 * El veredicto. Puro y total: para cada combinación de la matriz
 * (ausente|false|true) × (production|preview|ausente) × (test|live|unknown)
 * devuelve una respuesta, y el default de todo lo que no encaje es CERRADO.
 */
export function evaluateSalesGate(env: SalesEnv): SalesGate {
  if (env.salesOpen !== 'true') return { open: false, reason: 'flag_off' };

  if (isProductionDeployment(env.vercelEnv) && stripeKeyMode(env.stripeSecretKey) !== 'live') {
    return { open: false, reason: 'misconfigured_test_key_in_production' };
  }

  return { open: true };
}

/** Único punto que lee el entorno del proceso. */
export function readSalesEnv(): SalesEnv {
  return {
    salesOpen: process.env.SALES_OPEN,
    vercelEnv: process.env.VERCEL_ENV,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  };
}

/**
 * Mensaje de cara al alumno cuando la compra está cerrada. Uno solo, en la voz
 * de la interfaz: el alumno no tiene por qué distinguir "la bandera está
 * apagada" de "el dueño se equivocó de llave" — las dos significan lo mismo
 * para él, y la segunda no se le cuenta a un desconocido.
 */
export const SALES_CLOSED_MESSAGE =
  'La preventa todavía no abre. Déjanos avisarte en cuanto puedas comprar tu plan.';

/** Código que devuelven las Server Actions cuando la venta está cerrada. */
export const SALES_CLOSED_CODE = 'SALES_CLOSED';
