'use client';

import { useEffect } from 'react';
import { trackAdPixelEvent } from '@/lib/marketing/pixels';

/**
 * Dispara el evento PageView de los píxeles de publicidad (F24, tarea 1).
 * Se monta explícitamente solo en landing y precios — a diferencia del
 * `capture_pageview` de PostHog (F20), que cubre TODA la app, este evento
 * específico de plataformas de ads solo tiene sentido en las páginas de
 * entrada de campaña.
 */
export function PixelPageView() {
  useEffect(() => {
    trackAdPixelEvent('PageView');
  }, []);

  return null;
}
