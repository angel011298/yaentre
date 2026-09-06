/**
 * scripts/g70b-stripe-refund.ts — G70b. Reembolsa el pago de prueba que G70
 * dejó en Stripe (modo test) y deja el registro contable consistente.
 *
 * Uso:
 *   pnpm tsx scripts/g70b-stripe-refund.ts            (solo inspecciona)
 *   pnpm tsx scripts/g70b-stripe-refund.ts --apply    (reembolsa de verdad)
 */
import './lib/env';
import Stripe from 'stripe';

const PAYMENT_INTENT = process.env.G70B_PI ?? 'pi_3UCa5HEtRO7AKqHV1HAD0r4w';
const APPLY = process.argv.includes('--apply');

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Falta STRIPE_SECRET_KEY');
  console.log(`[stripe] modo: ${key.startsWith('sk_test_') ? 'TEST' : 'LIVE'}`);
  if (!key.startsWith('sk_test_')) throw new Error('Esta limpieza solo debe correr en modo test.');

  const stripe = new Stripe(key);
  const pi = await stripe.paymentIntents.retrieve(PAYMENT_INTENT, { expand: ['latest_charge'] });
  const charge = pi.latest_charge as Stripe.Charge | null;

  console.log(`[stripe] PaymentIntent ${pi.id}`);
  console.log(`         estado:     ${pi.status}`);
  console.log(`         monto:      ${pi.amount} ${pi.currency.toUpperCase()}`);
  console.log(`         customer:   ${typeof pi.customer === 'string' ? pi.customer : (pi.customer?.id ?? '—')}`);
  console.log(`         charge:     ${charge?.id ?? '—'} refunded=${charge?.refunded ?? '—'} amount_refunded=${charge?.amount_refunded ?? '—'}`);

  if (charge?.refunded) {
    console.log('[stripe] Ya estaba reembolsado — nada que hacer.');
    return;
  }
  if (!APPLY) {
    console.log('[stripe] DRY-RUN. Corre con --apply para reembolsar.');
    return;
  }

  const refund = await stripe.refunds.create({
    payment_intent: pi.id,
    reason: 'duplicate',
    metadata: { motivo: 'limpieza de datos de prueba G70b' },
  });
  console.log(`[stripe] Reembolso creado: ${refund.id} · ${refund.status} · ${refund.amount} ${refund.currency.toUpperCase()}`);

  const after = await stripe.paymentIntents.retrieve(pi.id, { expand: ['latest_charge'] });
  const afterCharge = after.latest_charge as Stripe.Charge | null;
  console.log(`[stripe] Verificación: charge.refunded=${afterCharge?.refunded} amount_refunded=${afterCharge?.amount_refunded}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
