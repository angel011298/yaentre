import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Bloque 2 — EL SERVICE WORKER NO GUARDA NADA DEL MARKETPLACE NI DE LA LIGA DEL
 * TUTOR. Misma técnica que `sw-admin-never-cached.test.ts` (G99): se ejecuta el
 * `sw.js` REAL y se observa si intercepta la petición. Una ruta privada tiene
 * que salir SIN llamar a `respondWith`, es decir, sigue a la red sin tocar la
 * Cache Storage — que vive en el disco y sobrevive al cierre de sesión.
 */

const SW_SOURCE = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf8');

function intercepts(url: string, mode: 'navigate' | 'no-cors'): boolean {
  let fetchHandler: ((e: unknown) => void) | null = null;
  const self = {
    location: { origin: 'https://yaentre.com' },
    skipWaiting: () => {},
    clients: { claim: () => {} },
    addEventListener: (type: string, handler: (e: unknown) => void) => {
      if (type === 'fetch') fetchHandler = handler;
    },
  };
  const caches = {
    open: async () => ({ put: async () => {} }),
    match: async () => undefined,
    keys: async () => [],
    delete: async () => true,
  };
  const run = new Function('self', 'caches', 'fetch', 'Response', 'URL', SW_SOURCE);
  run(self, caches, async () => ({ clone: () => ({}) }), class {}, URL);
  if (!fetchHandler) throw new Error('El service worker no registró un manejador de fetch.');

  let respondWithCalled = false;
  (fetchHandler as (e: unknown) => void)({
    request: { method: 'GET', url, mode },
    respondWith: () => {
      respondWithCalled = true;
    },
  });
  return respondWithCalled;
}

const PRIVATE = [
  'https://yaentre.com/profesor',
  'https://yaentre.com/profesor/solicitud',
  'https://yaentre.com/profesor/clases',
  'https://yaentre.com/app/clases',
  'https://yaentre.com/app/clases/directorio',
  'https://yaentre.com/app/verificacion-tutor',
  'https://yaentre.com/confirmar-tutor?token=abc123',
  'https://yaentre.com/api/teachers/me',
  'https://yaentre.com/api/teachers/me/classes',
  'https://yaentre.com/api/classes/teachers',
  'https://yaentre.com/api/classes/cku0000000000000000000abc/recording',
];

describe('el service worker NUNCA intercepta el marketplace ni la liga del tutor', () => {
  for (const url of PRIVATE) {
    const path = new URL(url).pathname;
    it(`navegación a ${path} pasa de largo`, () => {
      expect(intercepts(url, 'navigate')).toBe(false);
    });
    it(`subrecurso de ${path} pasa de largo`, () => {
      expect(intercepts(url, 'no-cors')).toBe(false);
    });
  }
});

/**
 * CONTROL POSITIVO (G71 §6 D6): sin esto el bloque de arriba pasaría igual si el
 * worker no se cargara. `/profesores` (landing pública, con «es») y `/app`
 * siguen siendo interceptados — la lista privada no se pasó de ancha.
 */
describe('control positivo: lo que NO es privado sigue interceptado', () => {
  it('/profesores (landing pública) sí se intercepta: el prefijo /profesor NO la cubre', () => {
    expect(intercepts('https://yaentre.com/profesores', 'navigate')).toBe(true);
  });
  it('/app sigue siendo network-first con respaldo en caché', () => {
    expect(intercepts('https://yaentre.com/app', 'navigate')).toBe(true);
  });
  it('/_next/static sigue siendo cache-first', () => {
    expect(intercepts('https://yaentre.com/_next/static/chunk.js', 'no-cors')).toBe(true);
  });
});
