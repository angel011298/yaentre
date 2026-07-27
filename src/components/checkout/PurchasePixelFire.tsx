'use client';

import { useEffect } from 'react';
import { trackAdPixelEvent } from '@/lib/marketing/pixels';

/**
 * Dispara el evento Purchase de los píxeles de publicidad (F24, tarea 1) con
 * el valor y plan REALES — tomados del `Payment` que el webhook de Stripe ya
 * confirmó (nunca un estimado), en la pantalla de éxito del checkout.
 */
export function PurchasePixelFire({
  value,
  currency,
  plan,
}: {
  value: number | null;
  currency: string;
  plan: string;
}) {
  useEffect(() => {
    trackAdPixelEvent('Purchase', { value: value ?? undefined, currency, plan });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- disparar solo una vez al montar esta pantalla de éxito
  }, []);

  return null;
}
