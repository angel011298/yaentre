'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SubscriptionPlan } from '@prisma/client';
import { startCheckoutAction } from '@/app/actions/checkout';
import { Button } from '@/components/ui/Button';
import { trackAdPixelEvent } from '@/lib/marketing/pixels';
import { currentSeason, getPlanPricing } from '@/lib/stripe/pricing';
import { ART56_CHECKOUT_CONSENT_TEXT } from '@/lib/legal/consent-texts';

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
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bloque 1: reintentar crea una NUEVA compra, así que el consentimiento del
  // art. 56 se vuelve a pedir (no se asume del intento anterior).
  const [accepted, setAccepted] = useState(false);

  async function retry() {
    setLoading(true);
    setError(null);
    const res = await startCheckoutAction({ plan, art56Consent: accepted });
    if (res.ok) {
      const pricing = getPlanPricing(plan, currentSeason(new Date()));
      trackAdPixelEvent('InitiateCheckout', { value: pricing.amountMxn / 100, currency: 'MXN', plan });
      window.location.href = res.data.url;
      return;
    }
    setLoading(false);
    if (res.code === 'TUTOR_CONSENT_REQUIRED') {
      router.push('/app/verificacion-tutor?return=%2Fcheckout%2Fresultado');
      return;
    }
    setError(res.message);
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
    <div className="flex flex-col items-center gap-3">
      <label className="flex max-w-sm gap-3 text-left text-sm text-text-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 h-4 w-4 flex-shrink-0 cursor-pointer"
        />
        <span className="leading-snug">{ART56_CHECKOUT_CONSENT_TEXT}</span>
      </label>
      <Button variant="primary" onClick={retry} disabled={loading || !accepted}>
        {loading ? 'Abriendo el pago…' : 'Reintentar pago'}
      </Button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
