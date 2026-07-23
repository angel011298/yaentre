import 'server-only';
import { getStripe } from './client';

/**
 * URL del comprobante hospedado por Stripe para un pago asíncrono pendiente:
 * el voucher de OXXO (para pagar en tienda) o las instrucciones de
 * transferencia SPEI (CLABE). Se lee del `next_action` del PaymentIntent.
 *
 * Es una lectura tolerante a fallos: si Stripe no responde o el pago no está en
 * un estado con comprobante, devuelve null y la pantalla de pendiente se
 * muestra igual (sin el enlace directo). Nunca lanza.
 */
export async function getHostedVoucherUrl(checkoutSessionId: string): Promise<string | null> {
  try {
    const session = await getStripe().checkout.sessions.retrieve(checkoutSessionId, {
      expand: ['payment_intent'],
    });

    const pi = session.payment_intent;
    if (!pi || typeof pi === 'string') return null;

    const next = pi.next_action;
    if (!next) return null;

    if (next.oxxo_display_details?.hosted_voucher_url) {
      return next.oxxo_display_details.hosted_voucher_url;
    }
    if (next.display_bank_transfer_instructions?.hosted_instructions_url) {
      return next.display_bank_transfer_instructions.hosted_instructions_url;
    }
    return null;
  } catch (err) {
    console.warn('[stripe/voucher] No se pudo obtener el comprobante', checkoutSessionId, err);
    return null;
  }
}
