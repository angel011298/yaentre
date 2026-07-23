'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Poller de estado para la pantalla de pago pendiente (OXXO/SPEI). Refresca el
 * RSC cada `intervalMs` para que, cuando el webhook confirme el pago y cambie
 * la Subscription a ACTIVE, la pantalla pase sola a la vista de éxito — sin que
 * el usuario recargue. Es solo lectura: nunca activa nada por sí mismo.
 */
export function StatusPoller({ intervalMs = 8000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
