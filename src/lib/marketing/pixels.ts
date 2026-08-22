'use client';

/**
 * Rastreo de conversión de plataformas de publicidad (F24): Meta Pixel y
 * TikTok Pixel, configurables por variable de entorno
 * (`NEXT_PUBLIC_META_PIXEL_ID` / `NEXT_PUBLIC_TIKTOK_PIXEL_ID`) y activos
 * SOLO si el usuario dio su consentimiento de cookies (mismo flag de F21,
 * `yaentre-cookies-consent`, que ya condiciona PostHog en
 * `src/lib/analytics/client.ts`) — nunca se cargan sin esa condición doble.
 *
 * 4 eventos de conversión (uno por cada plataforma configurada):
 * - PageView: landing y precios (`PixelPageView`)
 * - CompleteRegistration: tras terminar el registro (`SignupConversionTracker`)
 * - InitiateCheckout: al iniciar el pago (`ChoosePlanButton`/`RetryButton`)
 * - Purchase: al confirmarse la compra, con valor y plan (`SuccessView`)
 *
 * Snippets oficiales inyectados de forma perezosa (nunca en el bundle inicial,
 * mismo criterio de F20 con `posthog-js`) — sin negociar con proveedores
 * externos: `fbq`/`ttq` son las funciones globales estándar de cada plataforma.
 */

type FbqFn = ((...args: unknown[]) => void) & { queue?: unknown[] };

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: unknown;
    ttq?: {
      track: (event: string, params?: Record<string, unknown>) => void;
      page: () => void;
      load: (id: string) => void;
    };
  }
}

const COOKIE_CONSENT_KEY = 'yaentre-cookies-consent';

function hasCookieConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(COOKIE_CONSENT_KEY) === 'true';
}

function isPlaceholder(id: string): boolean {
  return id.startsWith('your-') || id.includes('placeholder');
}

let loaded = false;

/** Inyecta el snippet de Meta Pixel (fbevents.js) e inicializa con el ID configurado. */
function loadMetaPixel(pixelId: string): void {
  if (window.fbq) return;

  const fbq = function (...args: unknown[]) {
    (fbq.queue = fbq.queue || []).push(args);
  } as FbqFn;
  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);

  window.fbq?.('init', pixelId);
}

/** Inyecta el snippet de TikTok Pixel e inicializa con el ID configurado. */
function loadTikTokPixel(pixelId: string): void {
  if (window.ttq) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${pixelId}&lib=ttq`;
  document.head.appendChild(script);
}

/**
 * Carga ambos píxeles (los que tengan ID configurado) una sola vez por
 * sesión de página. No hace nada si el usuario rechazó cookies o si ningún
 * ID está configurado — nunca lanza, nunca bloquea el render.
 */
export function loadAdPixels(): void {
  if (loaded || !hasCookieConsent()) return;

  const metaId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const tiktokId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

  if (metaId && !isPlaceholder(metaId)) loadMetaPixel(metaId);
  if (tiktokId && !isPlaceholder(tiktokId)) loadTikTokPixel(tiktokId);

  loaded = true;
}

export type AdPixelEvent = 'PageView' | 'CompleteRegistration' | 'InitiateCheckout' | 'Purchase';

/**
 * Dispara un evento en los píxeles ya cargados. Si el usuario rechazó
 * cookies (o los píxeles nunca cargaron por falta de config), es un no-op
 * silencioso — nunca lanza ni bloquea el flujo que lo llama.
 */
export function trackAdPixelEvent(
  event: AdPixelEvent,
  params?: { value?: number; currency?: string; plan?: string }
): void {
  loadAdPixels();
  if (!hasCookieConsent()) return;

  window.fbq?.('track', event, params);
  window.ttq?.track(event, params);
}
