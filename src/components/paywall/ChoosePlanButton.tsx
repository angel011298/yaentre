'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SubscriptionPlan } from '@prisma/client';
import { startCheckoutAction } from '@/app/actions/checkout';
import { Button } from '@/components/ui/Button';
import { trackAdPixelEvent } from '@/lib/marketing/pixels';
import { currentSeason, getPlanPricing } from '@/lib/stripe/pricing';

export function ChoosePlanButton({
  plan,
  variant = 'primary',
  /** Bloque 1: la casilla del art. 56 (compartida en el paywall) debe estar
   *  marcada para poder comprar. Sin ella el botón queda deshabilitado. */
  art56Accepted = false,
}: {
  plan: SubscriptionPlan;
  variant?: 'primary' | 'secondary';
  art56Accepted?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose() {
    setLoading(true);
    setError(null);
    const res = await startCheckoutAction({ plan, art56Consent: art56Accepted });
    if (res.ok) {
      // F24: valor estimado (temporada calculada client-side, sin el ajuste
      // de agotamiento de Early Bird que solo la DB puede resolver) — sirve
      // para el reporte de la plataforma de ads, no es el monto real cobrado
      // (ese viaja en el evento Purchase, tomado del Payment confirmado).
      const pricing = getPlanPricing(plan, currentSeason(new Date()));
      trackAdPixelEvent('InitiateCheckout', { value: pricing.amountMxn / 100, currency: 'MXN', plan });
      window.location.href = res.data.url;
      return;
    }

    setLoading(false);
    // Bloque 1: un menor de edad debe pasar por la confirmación de su tutor
    // ANTES de pagar — se le lleva a esa pantalla en vez de mostrar un error.
    if (res.code === 'TUTOR_CONSENT_REQUIRED') {
      router.push('/app/verificacion-tutor?return=%2Fpaywall');
      return;
    }
    setError(res.message);
  }

  return (
    <div className="space-y-1">
      <Button
        variant={variant}
        className="w-full"
        onClick={choose}
        disabled={loading || !art56Accepted}
      >
        {loading ? 'Abriendo pago…' : 'Elegir este plan'}
      </Button>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
