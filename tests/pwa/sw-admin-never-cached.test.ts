import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * G99 — EL SERVICE WORKER NO PUEDE GUARDAR NADA DE /admin NI DE LA BÓVEDA.
 *
 * El defecto que esto cierra era real y estaba en producción: el manejador de
 * navegación metía en `SHELL_CACHE` la respuesta de CUALQUIER navegación. Eso
 * incluía `/admin/usuarios` (listado de cuentas), `/admin/bitacora` y —porque
 * el botón «Descargar» es un `<a href>`, o sea `mode === 'navigate'`— la
 * respuesta completa de `/api/admin/vault/<id>`, el archivo entero.
 *
 * La Cache Storage vive en el disco y SOBREVIVE al cierre de sesión: en una
 * computadora compartida, el siguiente en usarla podía recuperar todo eso sin
 * credenciales. Las cabeceras `no-store` del Route Handler no lo impedían,
 * porque un service worker decide por su cuenta qué guarda.
 *
 * En vez de simular la API de Cache (que obligaría a reimplementar medio
 * navegador), se ejecuta el service worker REAL en un contexto controlado y se
 * observa qué peticiones intercepta. Una ruta de admin tiene que salir SIN que
 * se llame a `respondWith` — es decir, sigue a la red sin pasar por la caché.
 */

const SW_SOURCE = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf8');

interface FetchOutcome {
  respondWithCalled: boolean;
}

/**
 * Ejecuta el sw.js real y le lanza un evento `fetch`. Devuelve si el worker
 * decidió interceptar la petición.
 */
function runFetch(url: string, mode: 'navigate' | 'no-cors'): FetchOutcome {
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
  const event = {
    request: { method: 'GET', url, mode },
    respondWith: () => {
      respondWithCalled = true;
    },
  };
  (fetchHandler as (e: unknown) => void)(event);

  return { respondWithCalled };
}

const ADMIN_PATHS = [
  'https://yaentre.com/admin',
  'https://yaentre.com/admin/usuarios',
  'https://yaentre.com/admin/usuarios/cku0000000000000000000001',
  'https://yaentre.com/admin/bitacora',
  'https://yaentre.com/admin/boveda',
  'https://yaentre.com/admin/boveda/cku0000000000000000000abc',
  'https://yaentre.com/api/admin/vault/cku0000000000000000000abc',
  'https://yaentre.com/api/admin/vault/cku0000000000000000000abc?download=1',
];

describe('el service worker NUNCA intercepta /admin ni /api/admin', () => {
  for (const url of ADMIN_PATHS) {
    it(`navegación a ${new URL(url).pathname} pasa de largo`, () => {
      expect(runFetch(url, 'navigate').respondWithCalled).toBe(false);
    });

    it(`subrecurso de ${new URL(url).pathname} pasa de largo`, () => {
      expect(runFetch(url, 'no-cors').respondWithCalled).toBe(false);
    });
  }
});

/**
 * CONTROL POSITIVO — sin esto, el bloque de arriba pasaría igual de bien si el
 * manejador de `fetch` no existiera, si el worker no se cargara o si
 * `respondWith` nunca se llamara para NADA. Una ruta normal de la app SÍ tiene
 * que ser interceptada (G71 §6 D6).
 */
describe('control positivo: una ruta normal SÍ se intercepta', () => {
  it('/app es network-first con respaldo en caché', () => {
    expect(runFetch('https://yaentre.com/app', 'navigate').respondWithCalled).toBe(true);
  });

  it('/_next/static sigue siendo cache-first', () => {
    expect(runFetch('https://yaentre.com/_next/static/chunk.js', 'no-cors').respondWithCalled).toBe(
      true
    );
  });
});
