/**
 * Los DOS hosts de PostHog (G71). Módulo PURO y sin dependencias a propósito:
 * lo importan `next.config.ts` (para construir la CSP) y el cliente del
 * navegador, y tienen que coincidir o la CSP bloquea a PostHog en silencio.
 *
 * ── El defecto que lo motivó ──
 * La CSP de F22 permitía UN solo host de PostHog, el de ingesta
 * (`NEXT_PUBLIC_POSTHOG_HOST`, `https://us.i.posthog.com`). Pero `posthog-js`
 * pide su configuración remota y sus extensiones a un host DISTINTO, el de
 * assets (`https://us-assets.i.posthog.com/array/<key>/config.js`). En
 * producción eso daba, en CADA carga de página y reintento tras reintento:
 *
 *   Loading the script 'https://us-assets.i.posthog.com/array/…/config.js'
 *   violates the following Content Security Policy directive: "script-src …"
 *
 * Los eventos SÍ llegaban (van al host de ingesta, que sí estaba permitido),
 * así que la verificación de G70 —que midió el viaje de ida y vuelta contra
 * `us.i.posthog.com`— pasó sin notarlo. Lo que quedaba roto es la
 * configuración remota: banderas de funcionalidad servidas por `config.js`,
 * encuestas y cualquier extensión que PostHog cargue bajo demanda.
 *
 * ── La regla ──
 * En el PostHog gestionado, el host de assets es el de ingesta con `-assets`
 * pegado al subdominio de región: `us.i.posthog.com` → `us-assets.i.posthog.com`,
 * `eu.i.posthog.com` → `eu-assets.i.posthog.com`. Un host propio (proxy
 * inverso o self-hosted) sirve ambas cosas desde sí mismo, así que ahí el host
 * de assets es el mismo y no hay nada extra que permitir.
 */

export const POSTHOG_DEFAULT_HOST = 'https://us.i.posthog.com';

/** Host de ingesta efectivo (el de la env, o el de EE. UU. por defecto). */
export function posthogApiHost(envHost?: string): string {
  return envHost && envHost.trim() !== '' ? envHost.trim() : POSTHOG_DEFAULT_HOST;
}

/**
 * Host desde el que `posthog-js` carga `config.js` y sus extensiones.
 * Devuelve el MISMO host cuando no es el PostHog gestionado (proxy propio o
 * self-hosted): ahí no hay un segundo origen que permitir.
 */
export function posthogAssetsHost(envHost?: string): string {
  const api = posthogApiHost(envHost);
  let url: URL;
  try {
    url = new URL(api);
  } catch {
    return api;
  }
  // `<region>.i.posthog.com` → `<region>-assets.i.posthog.com`.
  const match = /^([a-z0-9-]+)\.i\.posthog\.com$/.exec(url.hostname);
  if (!match) return api;
  return `${url.protocol}//${match[1]}-assets.i.posthog.com`;
}

/** Orígenes de PostHog que la CSP debe permitir, sin repetidos. */
export function posthogCspHosts(envHost?: string): string[] {
  const api = posthogApiHost(envHost);
  const assets = posthogAssetsHost(envHost);
  return assets === api ? [api] : [api, assets];
}
