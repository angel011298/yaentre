'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

/**
 * G103 — `error.tsx` de las secciones del marketplace. Reporta a Sentry (un
 * error que solo se pinta no es una señal, G73b) y ofrece reintentar. No
 * muestra el mensaje técnico: puede contener datos de la solicitud.
 */
export function SegmentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Diferido: un import estático metería el SDK en el bundle de cada página
    // del segmento (incluido el catálogo público), contra lo medido en G62.
    void import('@sentry/nextjs').then((Sentry) => Sentry.captureException(error)).catch(() => undefined);
  }, [error]);
  return (
    <div className="mx-auto max-w-md space-y-3 py-12 text-center" role="alert">
      <h1 className="font-display text-2xl font-bold text-text-primary">Algo salió mal</h1>
      <p className="text-sm text-text-secondary">No pudimos cargar esta pantalla. Intenta de nuevo en un momento.</p>
      <Button type="button" variant="primary" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
