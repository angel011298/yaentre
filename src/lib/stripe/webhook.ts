import type Stripe from 'stripe';
import type { PaymentMethod } from '@prisma/client';
import { stripeKeyMode, type StripeKeyMode } from './sales-switch';

/**
 * Lógica de manejo de webhooks de Stripe (F8). Es el corazón del dinero real,
 * así que está aislada de Stripe-el-SDK y de Prisma: recibe un `Stripe.Event`
 * ya verificado y un `BillingStore` inyectado. Esto la hace 100% testeable con
 * un store en memoria (ver tests/stripe/webhook.test.ts).
 *
 * Garantías (criterios de aceptación F8):
 * - El acceso de pago se activa SOLO desde aquí (webhook), nunca desde el
 *   redirect del cliente. Las pantallas de resultado solo LEEN el estado real.
 * - Idempotencia: cada mutación del store registra el `event.id` en
 *   `processed_stripe_events` DENTRO de la misma transacción que aplica el
 *   cambio (ver billing.ts). Si el evento ya estaba registrado, la mutación
 *   devuelve 'duplicate' y NO vuelve a activar/fallar/cancelar nada. Registrar
 *   dentro de la transacción (en vez de antes, por separado) preserva la
 *   detección de duplicados y además permite reintentos seguros: si la
 *   aplicación falla, el marcador del evento se revierte con ella.
 * - OXXO/SPEI quedan PENDIENTES hasta la confirmación asíncrona real
 *   (async_payment_succeeded); `checkout.session.completed` con
 *   `payment_status: 'unpaid'` NO activa.
 */

export interface CheckoutActivation {
  checkoutSessionId: string;
  paymentIntentId: string | null;
  stripeCustomerId: string | null;
  /** Solo presente en MONTHLY (mode subscription). */
  stripeSubscriptionId: string | null;
  method: PaymentMethod;
  amountMxn: number | null;
}

/** Resultado de una mutación idempotente del store. */
export type ApplyResult = 'applied' | 'duplicate';

export interface BillingStore {
  /** Activa el plan (ACTIVE + expiresAt + Payment SUCCEEDED). Idempotente. */
  activateFromCheckout(
    eventId: string,
    eventType: string,
    activation: CheckoutActivation
  ): Promise<ApplyResult>;
  /** OXXO/SPEI: voucher generado, registra Payment PENDING sin activar acceso. */
  recordPendingAsyncPayment(
    eventId: string,
    eventType: string,
    activation: CheckoutActivation
  ): Promise<ApplyResult>;
  /** Pago asíncrono fallido/expirado → Subscription FAILED, Payment FAILED. */
  failCheckout(
    eventId: string,
    eventType: string,
    checkoutSessionId: string
  ): Promise<ApplyResult>;
  /** Suscripción eliminada del lado de Stripe → CANCELED. */
  cancelBySubscriptionId(
    eventId: string,
    eventType: string,
    stripeSubscriptionId: string
  ): Promise<ApplyResult>;
}

export type HandleResult =
  | { status: 'duplicate'; type: string }
  | { status: 'ignored'; type: string }
  /** G98: modo del evento ≠ modo de la llave en producción. No se aplicó nada. */
  | { status: 'rejected'; type: string; reason: 'livemode_mismatch' }
  | { status: 'handled'; type: string; action: 'activated' | 'pending' | 'failed' | 'canceled' };

/**
 * ── G98: SEGUNDA DEFENSA — coherencia de modo entre el evento y la llave ────
 *
 * El interruptor de ventas cierra la puerta de entrada (`startCheckoutAction`),
 * pero el webhook es una puerta INDEPENDIENTE: Stripe lo llama directamente y
 * activa el acceso sin que ningún guard de la app intervenga. Un evento cuyo
 * `livemode` no corresponde al modo de la llave con la que se verificó su
 * firma significa que algo está mal apuntado —un endpoint de PRUEBA enviando
 * al webhook de producción, o un endpoint del modo anterior que sobrevivió al
 * cambio de llaves— y no se debe activar nada con él.
 *
 * Solo aplica en PRODUCCIÓN. En local y en preview se trabaja con llave de
 * prueba y con eventos reenviados por el CLI de Stripe, y exigir coherencia
 * ahí solo rompería el desarrollo sin proteger nada.
 *
 * Con la llave en `unknown` (ausente o irreconocible) no se puede afirmar el
 * modo, y afirmar de menos es peor que rechazar: se rechaza. Sin llave el
 * webhook no habría podido verificar la firma de todos modos.
 */
export interface LivemodeCheckEnv {
  /** `event.livemode` del evento ya verificado. */
  eventLivemode: boolean | undefined;
  /** Modo de `STRIPE_SECRET_KEY`. */
  keyMode: StripeKeyMode;
  /** `VERCEL_ENV === 'production'`. */
  isProduction: boolean;
}

export function livemodeMismatch(env: LivemodeCheckEnv): boolean {
  if (!env.isProduction) return false;
  if (env.keyMode === 'unknown') return true;
  return env.eventLivemode !== (env.keyMode === 'live');
}

/** Lee el entorno del proceso y decide. Único punto que toca `process.env`. */
export function eventLivemodeMismatch(event: Stripe.Event): boolean {
  return livemodeMismatch({
    eventLivemode: event.livemode,
    keyMode: stripeKeyMode(process.env.STRIPE_SECRET_KEY),
    isProduction: process.env.VERCEL_ENV === 'production',
  });
}

/** Extrae el id de un campo Stripe que puede ser string | objeto | null. */
function idOf(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === 'string' ? ref : ref.id;
}

/**
 * Resuelve el método de pago de una sesión de Checkout.
 *
 * Detalle CRÍTICO de Stripe: en `checkout.session.completed` un pago asíncrono
 * (OXXO/SPEI) llega `payment_status: 'unpaid'` (voucher generado), pero en
 * `checkout.session.async_payment_succeeded` la MISMA sesión ya viene
 * `payment_status: 'paid'`. Por eso el tipo de evento manda: cuando el evento es
 * de confirmación asíncrona (`forceAsync`), sabemos que NO fue tarjeta aunque el
 * status diga 'paid'. Fuera de eso:
 *   - payment_status 'paid'   → CARD (solo la tarjeta confirma en el acto).
 *   - payment_status 'unpaid' → asíncrono (OXXO/SPEI).
 * Entre OXXO y SPEI se distingue por los métodos configurados; si se ofrecieron
 * ambos no hay señal en el evento sin expandir el PaymentIntent, y se etiqueta
 * OXXO (efectivo dominante en MX). La etiqueta no afecta el acceso, solo
 * `Payment.method`.
 */
export function resolvePaymentMethod(
  session: Stripe.Checkout.Session,
  forceAsync = false
): PaymentMethod {
  const isAsync = forceAsync || session.payment_status !== 'paid';
  if (!isAsync) return 'CARD';

  const types = session.payment_method_types ?? [];
  if (types.includes('customer_balance') && !types.includes('oxxo')) return 'SPEI';
  return 'OXXO';
}

export function extractCheckoutActivation(
  session: Stripe.Checkout.Session,
  forceAsync = false
): CheckoutActivation {
  return {
    checkoutSessionId: session.id,
    paymentIntentId: idOf(session.payment_intent),
    stripeCustomerId: idOf(session.customer),
    stripeSubscriptionId: idOf(session.subscription),
    method: resolvePaymentMethod(session, forceAsync),
    amountMxn: session.amount_total ?? null,
  };
}

/**
 * Punto de entrada del webhook, ya con el evento verificado. Enruta por tipo y
 * delega en el store (que garantiza atomicidad e idempotencia). Devuelve un
 * `HandleResult` para que el Route Handler responda 200 en todos los casos
 * manejables (incluidos duplicados e ignorados) — Stripe deja de reintentar
 * solo ante un 2xx.
 */
export async function handleStripeEvent(
  event: Stripe.Event,
  store: BillingStore
): Promise<HandleResult> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const activation = extractCheckoutActivation(session);

      // Tarjeta: pago inmediato ('paid') → activar. OXXO/SPEI: al completar el
      // checkout el pago aún está 'unpaid' (voucher/CLABE generados) → registrar
      // pendiente, NUNCA activar hasta la confirmación asíncrona.
      if (session.payment_status === 'paid') {
        const r = await store.activateFromCheckout(event.id, event.type, activation);
        return r === 'duplicate'
          ? { status: 'duplicate', type: event.type }
          : { status: 'handled', type: event.type, action: 'activated' };
      }

      const r = await store.recordPendingAsyncPayment(event.id, event.type, activation);
      return r === 'duplicate'
        ? { status: 'duplicate', type: event.type }
        : { status: 'handled', type: event.type, action: 'pending' };
    }

    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session;
      // forceAsync: aquí payment_status ya es 'paid' pero NO fue tarjeta.
      const activation = extractCheckoutActivation(session, true);
      const r = await store.activateFromCheckout(event.id, event.type, activation);
      return r === 'duplicate'
        ? { status: 'duplicate', type: event.type }
        : { status: 'handled', type: event.type, action: 'activated' };
    }

    case 'checkout.session.async_payment_failed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const r = await store.failCheckout(event.id, event.type, session.id);
      return r === 'duplicate'
        ? { status: 'duplicate', type: event.type }
        : { status: 'handled', type: event.type, action: 'failed' };
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const r = await store.cancelBySubscriptionId(event.id, event.type, subscription.id);
      return r === 'duplicate'
        ? { status: 'duplicate', type: event.type }
        : { status: 'handled', type: event.type, action: 'canceled' };
    }

    default:
      // Eventos que no cambian estado de acceso no se registran ni procesan.
      return { status: 'ignored', type: event.type };
  }
}
