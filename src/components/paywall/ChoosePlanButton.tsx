'use client';

import { useState } from 'react';
import type { SubscriptionPlan } from '@prisma/client';
import { startCheckoutAction } from '@/app/actions/checkout';
import { Button } from '@/components/ui/Button';
import { trackAdPixelEvent } from '@/lib/marketing/pixels';
import { currentSeason, getPlanPricing } from '@/lib/stripe/pricing';

export function ChoosePlanButton({
  plan,
  variant = 'primary',
}: {
  plan: SubscriptionPlan;
  variant?: 'primary' | 'secondary';
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose() {
    setLoading(true);
    setError(null);
    const res = await startCheckoutAction({ plan });
    if (res.ok) {
      // F24: valor estimado (temporada calculada client-side, sin el ajuste
      // de agotamiento de Early Bird que solo la DB puede resolver) — sirve
      // para el reporte de la plataforma de ads, no es el monto real cobrado
      // (ese viaja en el evento Purchase, tomado del Payment confirmado).
      const pricing = getPlanPricing(plan, currentSeason(new Date()));
      trackAdPixelEvent('InitiateCheckout', { value: pricing.amountMxn / 100, currency: 'MXN', plan });
      window.location.href = res.data.url;
    } else {
      setError(res.message);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button variant={variant} className="w-full" onClick={choose} disabled={loading}>
        {loading ? 'Abriendo pago…' : 'Elegir este plan'}
      </Button>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
