'use client';

import type { PostHog } from 'posthog-js';

/**
 * Carga perezosa de `posthog-js` (F20 tarea 3): la librería (~70KB) se pidió
 * originalmente con un import estático, lo que la metía en el bundle inicial
 * de CADA página aunque `.init()` corriera dentro de un `useEffect` — el
 * import en sí ya bloqueaba el parseo. Medido con Lighthouse: quitar esto del
 * bundle inicial fue la optimización de mayor impacto para bajar TBT/LCP.
 *
 * Un solo módulo compartido entre `PostHogProvider` (inicializa) e
 * `IdentifyUser` (identifica) para que ambos usen la MISMA instancia, nunca
 * dos `.init()` en paralelo.
 */
let posthogPromise: Promise<PostHog> | null = null;
let initialized = false;

function isPlaceholder(key: string): boolean {
  return key.startsWith('your-') || key.includes('placeholder');
}

export function loadPostHog(): Promise<PostHog> | null {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey || isPlaceholder(apiKey)) return null;

  if (!posthogPromise) {
    posthogPromise = import('posthog-js').then(({ default: posthog }) => {
      if (!initialized) {
        initialized = true;
        posthog.init(apiKey, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
          capture_pageview: true,
          autocapture: false,
          disable_session_recording: true,
        });
      }
      return posthog;
    });
  }
  return posthogPromise;
}
