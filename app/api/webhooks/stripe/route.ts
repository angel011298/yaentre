import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/client';
import { handleStripeEvent } from '@/lib/stripe/webhook';
import { billingStore } from '@/lib/db/billing';

/**
 * Webhook de Stripe (F8) — el ÚNICO punto donde se activa el acceso de pago.
 * No requiere sesión de usuario (lo llama Stripe, no el navegador); la
 * autenticidad se garantiza verificando la firma del payload, no con auth.
 *
 * Contrato de respuesta:
 * - Firma inválida / faltante → 400 (Stripe no reintenta un 4xx).
 * - Evento manejado, duplicado o ignorado → 200 (Stripe deja de reintentar).
 * - Error inesperado al procesar → 500 (Stripe reintenta; nuestra idempotencia
 *   revierte el marcador del evento en el rollback, así el reintento es seguro).
 */

// El cuerpo debe leerse CRUDO (sin parsear) para verificar la firma HMAC.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Falta la firma de Stripe.' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // Config faltante: no es culpa de Stripe. 500 para que reintente cuando exista.
    console.error('[stripe/webhook] Falta STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Webhook no configurado.' }, { status: 500 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    // Firma inválida o payload manipulado → 400, nunca se procesa.
    const message = err instanceof Error ? err.message : 'firma inválida';
    console.warn('[stripe/webhook] Firma inválida:', message);
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 400 });
  }

  try {
    const result = await handleStripeEvent(event, billingStore);
    return NextResponse.json({ received: true, ...result }, { status: 200 });
  } catch (err) {
    // Fallo transitorio al procesar: 500 para que Stripe reintente. El marcador
    // del evento se revirtió con la transacción, así que el reintento reprocesa.
    console.error('[stripe/webhook] Error procesando evento', event.id, event.type, err);
    return NextResponse.json({ error: 'Error procesando el evento.' }, { status: 500 });
  }
}
