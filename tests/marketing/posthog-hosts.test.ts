import { describe, it, expect } from 'vitest';
import {
  POSTHOG_DEFAULT_HOST,
  posthogApiHost,
  posthogAssetsHost,
  posthogCspHosts,
} from '@/lib/analytics/posthog-hosts';

/**
 * G71 — regresión de la CSP de PostHog.
 *
 * En producción, `posthog-js` pedía
 * `https://us-assets.i.posthog.com/array/<key>/config.js` y la CSP solo
 * permitía `https://us.i.posthog.com`: el navegador bloqueaba la carga en cada
 * página. Los eventos seguían llegando (van al host de ingesta), así que el
 * fallo no se veía en ninguna métrica — solo en la consola.
 */
describe('hosts de PostHog', () => {
  it('deriva el host de assets del host de ingesta de EE. UU.', () => {
    expect(posthogAssetsHost('https://us.i.posthog.com')).toBe('https://us-assets.i.posthog.com');
  });

  it('hace lo mismo con la región europea', () => {
    expect(posthogAssetsHost('https://eu.i.posthog.com')).toBe('https://eu-assets.i.posthog.com');
  });

  it('sin env cae al host de EE. UU. y su par de assets', () => {
    expect(posthogApiHost(undefined)).toBe(POSTHOG_DEFAULT_HOST);
    expect(posthogCspHosts(undefined)).toEqual([
      'https://us.i.posthog.com',
      'https://us-assets.i.posthog.com',
    ]);
    expect(posthogCspHosts('')).toEqual(posthogCspHosts(undefined));
  });

  it('un host propio (proxy o self-hosted) sirve ambas cosas: un solo origen', () => {
    expect(posthogAssetsHost('https://analytics.yaentre.com')).toBe('https://analytics.yaentre.com');
    expect(posthogCspHosts('https://analytics.yaentre.com')).toEqual([
      'https://analytics.yaentre.com',
    ]);
  });

  it('un valor inservible no revienta la construcción de la CSP', () => {
    expect(posthogAssetsHost('no-es-una-url')).toBe('no-es-una-url');
    expect(posthogCspHosts('no-es-una-url')).toEqual(['no-es-una-url']);
  });

  it('la lista para la CSP no trae repetidos', () => {
    for (const host of [undefined, 'https://us.i.posthog.com', 'https://analytics.yaentre.com']) {
      const hosts = posthogCspHosts(host);
      expect(new Set(hosts).size).toBe(hosts.length);
    }
  });
});
