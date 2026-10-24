import 'server-only';
import type Stripe from 'stripe';
import { getStripe } from './client';
import { reportSilentDegradation } from '@/lib/observability/report';
import type { MarketplaceKind } from './marketplace-webhook';

/**
 * G103 — lectura de una sesión de Checkout PROPIA para las pantallas de
 * resultado (extensión, curso, clase). Es solo lectura: aterrizar en el
 * resultado nunca activa nada (eso lo hace el webhook).
 *
 * Defensa: la sesión solo se muestra si su `metadata` dice que es del tipo
 * esperado Y del alumno de la sesión — nadie ve el pago de otro adivinando un
 * `session_id`. Cualquier fallo de Stripe devuelve `null` (la pantalla dice
 * «no encontramos tu pago») y queda reportado.
 */
export interface OwnCheckoutSession {
  id: string;
  status: Stripe.Checkout.Session.Status | null;
  paymentStatus: Stripe.Checkout.Session.PaymentStatus;
  amountTotal: number | null;
  metadata: Record<string, string>;
  /** Voucher de OXXO o instrucciones SPEI, si el pago sigue pendiente. */
  voucherUrl: string | null;
}

export async function readOwnCheckoutSession(
  sessionId: string,
  userProfileId: string,
  kind: MarketplaceKind
): Promise<OwnCheckoutSession | null> {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return null;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });
    const md = session.metadata ?? {};
    if (md.kind !== kind || md.userProfileId !== userProfileId) return null;

    let voucherUrl: string | null = null;
    const pi = session.payment_intent;
    if (pi && typeof pi !== 'string' && pi.next_action) {
      voucherUrl =
        pi.next_action.oxxo_display_details?.hosted_voucher_url ??
        pi.next_action.display_bank_transfer_instructions?.hosted_instructions_url ??
        null;
    }
    return {
      id: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      metadata: { ...md },
      voucherUrl,
    };
  } catch (err) {
    reportSilentDegradation('billing_status', err, { checkoutSessionId: sessionId, kind });
    return null;
  }
}
