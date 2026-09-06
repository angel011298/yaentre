'use server';

import type Stripe from 'stripe';
import { z } from 'zod';
import { AuthError } from '@/lib/auth/errors';
import { requireVerifiedForPurchase } from '@/lib/auth/guards';
import { getSiteUrl } from '@/lib/auth/site-url';
import { getStripe } from '@/lib/stripe/client';
import { getPlanPricing, stripePriceEnvVar } from '@/lib/stripe/pricing';
import { createPendingSubscription, resolveEffectiveSeason } from '@/lib/db/billing';
import type { ActionResult } from '@/lib/sessions/schemas';
import { trackServerEvent } from '@/lib/analytics/server';

/**
 * Inicio de checkout (F8). Reglas críticas:
 * - Solo se puede iniciar con el correo VERIFICADO (requireVerifiedForPurchase).
 * - Crea la Stripe Checkout Session y una Subscription en estado PENDING con el
 *   id de esa sesión ANTES de mandar al usuario a pagar. El acceso NO se activa
 *   aquí: eso ocurre únicamente en el webhook al confirmarse el pago.
 * - OXXO/SPEI solo se ofrecen en pagos únicos (pase/premium); una suscripción
 *   recurrente de Stripe (plan mensual) solo admite tarjeta.
 */

const checkoutSchema = z.object({
  plan: z.enum(['MONTHLY', 'SEASON_PASS', 'PREMIUM']),
});

export async function startCheckoutAction(
  input: z.input<typeof checkoutSchema>
): Promise<ActionResult<{ url: string }>> {
  let profileId: string;
  let email: string | undefined;
  try {
    const { authUser, profile } = await requireVerifiedForPurchase();
    profileId = profile.id;
    email = authUser.email ?? undefined;
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, code: err.code, message: err.message };
    }
    throw err;
  }

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: 'VALIDATION', message: 'Plan inválido.' };
  }

  const { plan } = parsed.data;
  // Temporada EFECTIVA (F9): si Early Bird ya agotó sus 500 licencias, esto
  // degrada a Temporada Alta — es el MISMO cálculo que usa el paywall para
  // decidir qué precio mostrar, así nunca se muestra un precio y se cobra otro.
  // G60: es una consulta a la DB — un fallo aquí devuelve un error limpio, no
  // una excepción sin manejar al borde cliente.
  let season;
  try {
    season = await resolveEffectiveSeason(new Date());
  } catch (err) {
    console.error('[checkout] No se pudo resolver la temporada de precios', err);
    return { ok: false, code: 'DB', message: 'No pudimos iniciar el pago. Intenta de nuevo.' };
  }
  const pricing = getPlanPricing(plan, season);
  const site = getSiteUrl();

  // Tarjeta siempre; OXXO/SPEI solo en pagos únicos (no recurring).
  const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
    pricing.isRecurring ? ['card'] : ['card', 'oxxo', 'customer_balance'];

  // Si existe un Price ID real de Stripe para (plan, temporada) — creado por
  // scripts/setup-stripe-prices.ts — se usa ese; si no, se calcula el precio
  // al vuelo con price_data (idéntico monto, sin depender de tener el
  // dashboard de Stripe configurado). Nunca coexisten ambos en el mismo line item.
  const configuredPriceId = process.env[stripePriceEnvVar(plan, season)];

  // customer_balance (SPEI) EXIGE un Customer real ya presente al crear la
  // sesión — `customer_creation: 'always'` no basta: en `mode: 'payment'` ese
  // Customer se materializa al COMPLETARSE el pago, y Stripe valida la
  // presencia del Customer antes. Para los pagos únicos (pase/premium, los
  // únicos que ofrecen SPEI) creamos el Customer explícitamente aquí.
  let stripeCustomerId: string | undefined;
  if (!pricing.isRecurring) {
    try {
      const customer = await getStripe().customers.create({
        ...(email ? { email } : {}),
        metadata: { userProfileId: profileId },
      });
      stripeCustomerId = customer.id;
    } catch (err) {
      console.error('[checkout] No se pudo crear el Customer de Stripe', err);
      return { ok: false, code: 'STRIPE', message: 'No pudimos iniciar el pago. Intenta de nuevo.' };
    }
  }

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: pricing.mode,
    payment_method_types: paymentMethodTypes,
    line_items: [
      configuredPriceId
        ? { price: configuredPriceId, quantity: 1 }
        : {
            quantity: 1,
            price_data: {
              currency: 'mxn',
              unit_amount: pricing.amountMxn,
              product_data: { name: pricing.productName },
              ...(pricing.isRecurring ? { recurring: { interval: 'month' } } : {}),
            },
          },
    ],
    // El acceso se resuelve leyendo el estado REAL de la Subscription (que el
    // webhook actualiza), nunca por el hecho de aterrizar en esta URL.
    success_url: `${site}/checkout/resultado?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/checkout/resultado?session_id={CHECKOUT_SESSION_ID}&canceled=1`,
    // `customer` y `customer_email` son mutuamente excluyentes para Stripe:
    // pago único → Customer explícito (arriba); suscripción → Stripe crea el
    // Customer solo y basta con el correo.
    ...(stripeCustomerId ? { customer: stripeCustomerId } : { customer_email: email }),
    // Trazabilidad para el webhook y para un futuro job de reconciliación.
    metadata: { userProfileId: profileId, plan, season },
    ...(pricing.isRecurring
      ? {}
      : {
          payment_method_options: {
            oxxo: { expires_after_days: 3 },
            customer_balance: {
              funding_type: 'bank_transfer',
              bank_transfer: { type: 'mx_bank_transfer' },
            },
          },
        }),
  };

  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.create(params);
  } catch (err) {
    console.error('[checkout] No se pudo crear la sesión de Stripe', err);
    return { ok: false, code: 'STRIPE', message: 'No pudimos iniciar el pago. Intenta de nuevo.' };
  }

  if (!session.url) {
    return { ok: false, code: 'STRIPE', message: 'No pudimos iniciar el pago. Intenta de nuevo.' };
  }

  // Registro PENDING con el id de la sesión: es la fila que el webhook activará.
  // G60: si esta escritura falla, la sesión de Stripe ya existe pero sin fila
  // local — el webhook la rechazaría (SubscriptionNotFoundError) y el job de
  // reconciliación (que solo mira filas PENDING) tampoco la vería. Se registra
  // el `session.id` para poder rastrearla a mano y se devuelve un error limpio
  // en vez de propagar la excepción al borde cliente.
  try {
    await createPendingSubscription({
      userProfileId: profileId,
      plan,
      season,
      checkoutSessionId: session.id,
      hasGuarantee: pricing.hasGuarantee,
      stripeCustomerId:
        typeof session.customer === 'string' ? session.customer : session.customer?.id,
    });
  } catch (err) {
    console.error('[checkout] Sesión de Stripe creada sin Subscription local', {
      checkoutSessionId: session.id,
      userProfileId: profileId,
      err,
    });
    return {
      ok: false,
      code: 'DB',
      message: 'No pudimos iniciar el pago. Intenta de nuevo.',
    };
  }

  await trackServerEvent(profileId, 'checkout_started', { plan, season });

  return { ok: true, data: { url: session.url } };
}
