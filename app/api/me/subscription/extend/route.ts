import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { z } from 'zod';
import { AuthError } from '@/lib/auth/errors';
import { requireVerifiedForPurchase } from '@/lib/auth/guards';
import { isSameOriginRequest } from '@/lib/auth/same-origin';
import { getSiteUrl } from '@/lib/auth/site-url';
import { findExtendableSubscription, findKnownStripeCustomerId } from '@/lib/db/access-extension';
import { reportControlFailure } from '@/lib/observability/report';
import { consumeRateLimit } from '@/lib/rate-limit/store';
import { getStripe } from '@/lib/stripe/client';
import { salesGate } from '@/lib/stripe/sales-gate';
import { SALES_CLOSED_CODE, SALES_CLOSED_MESSAGE } from '@/lib/stripe/sales-switch';
import { planLabel } from '@/lib/stripe/pricing';
import {
  EXTENSION_DENIAL_MESSAGES,
  EXTENSION_IMMEDIATE_ACCESS_CONSENT,
  evaluateExtensionEligibility,
} from '@/lib/subscriptions/extension';

/**
 * G103 — POST /api/me/subscription/extend: inicia la compra de la extensión
 * de 6 meses (spec de temporalidad §3.6).
 *
 * Mismas reglas que el checkout de planes (`app/actions/checkout.ts`):
 *  - el interruptor de ventas es la PRIMERA comprobación: con la venta
 *    cerrada no se crea nada en Stripe (G98);
 *  - correo verificado (`requireVerifiedForPurchase`);
 *  - la vigencia NO cambia aquí: solo el webhook la extiende al confirmarse el
 *    pago (`applyAccessExtension`);
 *  - el precio sale del servidor (`ACCESS_DURATION.EXTENSION_PRICE_CENTS`),
 *    fijo, sin temporada, sin códigos de descuento ni de referido (el cuerpo
 *    es `.strict()`: cualquier campo de más se rechaza).
 *
 * Es un Route Handler (lo nombra el encargo), así que no trae la validación
 * de `Origin` de las Server Actions: `isSameOriginRequest` la reemplaza.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z
  .object({
    /** Casilla del art. 56 LFPC: obligatoria y nunca premarcada. */
    acceptImmediateAccess: z.literal(true),
  })
  .strict();

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request.headers)) {
    return json({ ok: false, code: 'FORBIDDEN', message: 'Solicitud no permitida.' }, 403);
  }

  // G98: primera comprobación de negocio, antes incluso de la identidad.
  const gate = salesGate();
  if (!gate.open) {
    return json({ ok: false, code: SALES_CLOSED_CODE, message: SALES_CLOSED_MESSAGE }, 409);
  }

  let profileId: string;
  let email: string | undefined;
  try {
    const { authUser, profile } = await requireVerifiedForPurchase();
    profileId = profile.id;
    email = authUser.email ?? undefined;
  } catch (err) {
    if (err instanceof AuthError) return json({ ok: false, code: err.code, message: err.message }, 401);
    throw err;
  }

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      {
        ok: false,
        code: 'VALIDATION',
        message: 'Para continuar acepta que tu acceso se active de inmediato.',
      },
      400
    );
  }

  const limit = await consumeRateLimit('ACCESS_EXTENSION_CHECKOUT', profileId);
  if (!limit.allowed) {
    return json(
      { ok: false, code: 'RATE_LIMIT', message: 'Espera unos minutos antes de volver a intentarlo.' },
      429
    );
  }

  const now = new Date();
  let sub;
  try {
    sub = await findExtendableSubscription(profileId, now);
  } catch (err) {
    console.error('[extend] No se pudo leer la suscripción', err);
    return json({ ok: false, code: 'DB', message: 'No pudimos iniciar el pago. Intenta de nuevo.' }, 500);
  }

  const eligibility = evaluateExtensionEligibility(sub, now);
  if (!eligibility.ok || !sub) {
    const reason = eligibility.ok ? 'NO_PLAN' : eligibility.reason;
    return json({ ok: false, code: reason, message: EXTENSION_DENIAL_MESSAGES[reason] }, 409);
  }

  const consentAt = now.toISOString();
  const metadata: Stripe.MetadataParam = {
    kind: 'access_extension',
    userProfileId: profileId,
    subscriptionId: sub.id,
    plan: sub.plan,
    expectedAmountCents: String(eligibility.priceCents),
    consentAt,
    consentVersion: EXTENSION_IMMEDIATE_ACCESS_CONSENT.version,
  };

  const stripe = getStripe();
  let customerId: string;
  try {
    customerId =
      sub.stripeCustomerId ??
      (await findKnownStripeCustomerId(profileId)) ??
      (
        await stripe.customers.create({
          ...(email ? { email } : {}),
          metadata: { userProfileId: profileId },
        })
      ).id;
  } catch (err) {
    console.error('[extend] No se pudo preparar el Customer de Stripe', err);
    return json({ ok: false, code: 'STRIPE', message: 'No pudimos iniciar el pago. Intenta de nuevo.' }, 502);
  }

  const site = getSiteUrl();
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      payment_method_types: ['card', 'oxxo', 'customer_balance'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'mxn',
            unit_amount: eligibility.priceCents,
            product_data: { name: `YaEntre — Extensión de 6 meses (${planLabel(sub.plan)})` },
          },
        },
      ],
      allow_promotion_codes: false,
      metadata,
      payment_intent_data: { metadata },
      payment_method_options: {
        oxxo: { expires_after_days: 3 },
        customer_balance: {
          funding_type: 'bank_transfer',
          bank_transfer: { type: 'mx_bank_transfer' },
        },
      },
      success_url: `${site}/app/extender/resultado?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/app/extender?cancelado=1`,
    });
  } catch (err) {
    console.error('[extend] No se pudo crear la sesión de Stripe', err);
    return json({ ok: false, code: 'STRIPE', message: 'No pudimos iniciar el pago. Intenta de nuevo.' }, 502);
  }

  if (!session.url) {
    reportControlFailure('payment_consistency', 'degraded', new Error('Sesión de extensión sin URL'), {
      checkoutSessionId: session.id,
    });
    return json({ ok: false, code: 'STRIPE', message: 'No pudimos iniciar el pago. Intenta de nuevo.' }, 502);
  }

  return json({ ok: true, url: session.url }, 200);
}
