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
 */
export function RetryButton({ plan }: { plan: SubscriptionPlan }) {
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

  return (
    <div className="flex flex-col items-center gap-2">
      <Button variant="primary" onClick={retry} disabled={loading}>
        {loading ? 'Abriendo el pago…' : 'Reintentar pago'}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
