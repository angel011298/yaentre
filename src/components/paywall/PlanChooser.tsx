'use client';

import { useState } from 'react';
import type { PlanPricing } from '@/lib/stripe/pricing';
import { ART56_CHECKOUT_CONSENT_TEXT } from '@/lib/legal/consent-texts';
import { PlanCard } from './PlanCard';

/**
 * Rejilla de planes del paywall + casilla del art. 56 LFPC (Bloque 1, handoff
 * §3.4). La casilla es OBLIGATORIA y NO premarcada: mientras no se marque, los
 * botones «Elegir este plan» quedan deshabilitados. El estado vive aquí (una
 * sola casilla para los tres planes) y baja a cada `PlanCard` → `ChoosePlanButton`.
 *
 * Con la venta cerrada (`salesOpen === false`) no hay botones de compra, así que
 * la casilla no se muestra — no hay nada que consentir todavía.
 */
export function PlanChooser({
  pricing,
  salesOpen,
}: {
  pricing: PlanPricing[];
  salesOpen: boolean;
}) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="space-y-4">
      {salesOpen && (
        <div className="flex gap-3 rounded-lg border border-border-subtle bg-surface p-4">
          <input
            type="checkbox"
            id="art56-consent"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 flex-shrink-0 cursor-pointer"
          />
          <label htmlFor="art56-consent" className="text-sm leading-snug text-text-secondary cursor-pointer">
            {ART56_CHECKOUT_CONSENT_TEXT}
          </label>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {pricing.map((p) => (
          <PlanCard
            key={p.plan}
            pricing={p}
            highlighted={p.plan === 'SEASON_PASS'}
            salesOpen={salesOpen}
            art56Accepted={accepted}
          />
        ))}
      </div>
    </div>
  );
}
