'use client';

import { useState } from 'react';
import type { SubscriptionPlan } from '@prisma/client';
import { startCheckoutAction } from '@/app/actions/checkout';
import { Button } from '@/components/ui/Button';
import { trackAdPixelEvent } from '@/lib/marketing/pixels';
import { currentSeason, getPlanPricing } from '@/lib/stripe/pricing';

/**
 * Botón de reintento de pago. Reusa `startCheckoutAction` con el mismo plan de
 * la suscripción fallida: crea una NUEVA sesión de Checkout y redirige. El
 * acceso sigue activándose solo desde el webhook — esto solo abre otro intento.
 *
 * G98: es el OTRO camino que llega a `startCheckoutAction`. Con la venta
 * cerrada la acción lo rechaza igual que al del paywall —el cierre es del
 * servidor—, pero un botón que siempre falla no informa de nada: aquí se dice
 * qué pasa. El píxel `InitiateCheckout` ya solo se dispara con `res.ok`, así
 * que tampoco puede salir por este lado.
 */
export function RetryButton({ plan, salesOpen }: { plan: SubscriptionPlan; salesOpen: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setLoading(true);
    setError(null);
    const res = await startCheckoutAction({ plan });
    if (res.ok) {
      const pricing = getPlanPricing(plan, currentSeason(new Date()));
      trackAdPixelEvent('InitiateCheckout', { value: pricing.amountMxn / 100, currency: 'MXN', plan });
      window.location.href = res.data.url;
    } else {
      setError(res.message);
      setLoading(false);
    }
  }

  if (!salesOpen) {
    return (
      <p className="max-w-sm rounded-md border border-border-subtle bg-elevated px-3 py-2 text-center text-sm text-text-secondary">
        🔒 La preventa todavía no abre, así que no se puede reintentar el pago. Te avisamos en
        cuanto puedas completar tu compra.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button variant="primary" onClick={retry} disabled={loading}>
        {loading ? 'Abriendo el pago…' : 'Reintentar pago'}
      </Button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
