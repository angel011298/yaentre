import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Bloque 3 — EL SERVICE WORKER NO GUARDA NADA DE LO FISCAL, DE SOPORTE NI DEL
 * PROGRAMA DE REFERIDOS. Misma técnica que `sw-admin-never-cached.test.ts` (G99):
 * se ejecuta el `sw.js` REAL y se observa si intercepta la petición. Una ruta
 * privada tiene que salir SIN llamar a `respondWith`.
 *
 * `/r/{código}` entra aquí por una razón distinta de la privacidad: es un
 * redirect que ESCRIBE la cookie de atribución. Una respuesta servida desde
 * caché no la escribiría y el referido se perdería.
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
  'https://yaentre.com/fiscal',
  'https://yaentre.com/fiscal/resico',
  'https://yaentre.com/soporte',
  'https://yaentre.com/soporte/usuarios/cku0000000000000000000abc',
  'https://yaentre.com/api/fiscal/summary',
  'https://yaentre.com/api/fiscal/export?month=2026-10',
  'https://yaentre.com/api/support/arco/export',
  'https://yaentre.com/r/ABCD2345',
  'https://yaentre.com/app/invitar',
  'https://yaentre.com/api/referrals/stats',
  'https://yaentre.com/api/referrals/qr/ABCD2345',
];

describe('el service worker NUNCA intercepta lo fiscal, lo de soporte ni los referidos', () => {
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
 * worker no se cargara. Lo público y el resto de `/app` siguen interceptados: la
 * lista privada no se pasó de ancha.
 */
describe('control positivo: lo que NO es privado sigue interceptado', () => {
  it('/app sigue siendo network-first con respaldo en caché', () => {
    expect(intercepts('https://yaentre.com/app', 'navigate')).toBe(true);
  });
  it('/precios (marketing) sigue interceptado', () => {
    expect(intercepts('https://yaentre.com/precios', 'navigate')).toBe(true);
  });
  it('/_next/static sigue siendo cache-first', () => {
    expect(intercepts('https://yaentre.com/_next/static/chunk.js', 'no-cors')).toBe(true);
  });
  it('un prefijo parecido NO queda cubierto por accidente: /fiscalia y /soportes sí se interceptan', () => {
    // `startsWith('/fiscal')` a secas los cubriría por error; el worker compara por segmento.
    expect(intercepts('https://yaentre.com/fiscalia', 'navigate')).toBe(true);
    expect(intercepts('https://yaentre.com/soportes', 'navigate')).toBe(true);
  });
});
