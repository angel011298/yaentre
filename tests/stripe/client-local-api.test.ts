import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { localStripeApi } = await import('@/lib/stripe/client');

/**
 * G103 — el desvío del SDK al simulador local de e2e NO puede encenderse fuera
 * de esa pila: en Vercel/servidor propio, con un host que no sea este equipo,
 * o con una llave real, se ignora. Control positivo al final.
 */
const base = { STRIPE_E2E_LOCAL_API: 'http://127.0.0.1:12111', STRIPE_SECRET_KEY: 'sk_test_e2e_local' };

describe('localStripeApi', () => {
  it('con VERCEL_ENV (cualquier valor) se ignora', () => {
    for (const VERCEL_ENV of ['production', 'preview', 'development']) {
      expect(localStripeApi({ ...base, VERCEL_ENV })).toBeNull();
    }
  });

  it('un host que no es este equipo, https o sin puerto, se ignora', () => {
    for (const STRIPE_E2E_LOCAL_API of ['http://evil.example:12111', 'http://10.0.0.5:12111', 'https://127.0.0.1:12111', 'http://127.0.0.1', 'no-es-url']) {
      expect(localStripeApi({ ...base, STRIPE_E2E_LOCAL_API }), STRIPE_E2E_LOCAL_API).toBeNull();
    }
  });

  it('con una llave real (o sin llave) se ignora: nunca se manda una llave live al simulador', () => {
    expect(localStripeApi({ ...base, STRIPE_SECRET_KEY: 'sk_live_x' })).toBeNull();
    expect(localStripeApi({ ...base, STRIPE_SECRET_KEY: 'rk_live_x' })).toBeNull();
    expect(localStripeApi({ ...base, STRIPE_SECRET_KEY: undefined })).toBeNull();
  });

  it('sin la variable, nada cambia', () => {
    expect(localStripeApi({ STRIPE_SECRET_KEY: 'sk_test_x' })).toBeNull();
  });

  it('control positivo: pila local con llave de prueba', () => {
    expect(localStripeApi(base)).toEqual({ host: '127.0.0.1', port: 12111, protocol: 'http' });
  });
});
