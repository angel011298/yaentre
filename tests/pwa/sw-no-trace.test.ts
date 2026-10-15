import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * G100 — EL SERVICE WORKER NO DEJA PANTALLAS PRIVADAS EN EL DISCO.
 *
 * Hasta G99 cada navegación (tablero, perfil, panel del tutor) se guardaba en
 * la Cache Storage para servirse sin conexión, y esa caché SOBREVIVE al cierre
 * de sesión. Con la política «sin rastro» (default), una navegación no se
 * guarda nunca y al activarse el worker se borran las cachés viejas — incluida
 * `yaentre-shell-v2`, que los dispositivos ya traen llena.
 *
 * Igual que `sw-admin-never-cached`: se ejecuta el `sw.js` REAL y se observa
 * qué guarda, en vez de reimplementar la API de Cache. Y cada afirmación tiene
 * su control positivo: en modo persistente la MISMA navegación sí se guarda,
 * así que un verde aquí no puede venir de un worker que no guarda nada nunca.
 */
const SW_SOURCE = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf8');

interface Harness {
  puts: string[];
  deleted: string[];
  fetchHandler: (e: unknown) => void;
  activateHandler: (e: unknown) => void;
}

function load(scriptUrl: string, opts: { network: 'ok' | 'down'; existingCaches?: string[] }): Harness {
  const handlers: Record<string, (e: unknown) => void> = {};
  const puts: string[] = [];
  const deleted: string[] = [];
  const self = {
    location: new URL(scriptUrl),
    skipWaiting: () => {},
    clients: { claim: () => Promise.resolve() },
    addEventListener: (type: string, handler: (e: unknown) => void) => {
      handlers[type] = handler;
    },
  };
  const caches = {
    open: async (name: string) => ({
      put: async (req: { url: string }) => {
        puts.push(`${name} ${req.url}`);
      },
    }),
    match: async () => undefined,
    keys: async () => opts.existingCaches ?? [],
    delete: async (name: string) => {
      deleted.push(name);
      return true;
    },
  };
  class FakeResponse {
    status: number;
    constructor(_body?: unknown, init?: { status?: number }) {
      this.status = init?.status ?? 200;
    }
    clone() {
      return this;
    }
  }
  const fetchImpl = async () => {
    if (opts.network === 'down') throw new TypeError('Failed to fetch');
    return new FakeResponse(null, { status: 200 });
  };
  const run = new Function('self', 'caches', 'fetch', 'Response', 'URL', SW_SOURCE);
  run(self, caches, fetchImpl, FakeResponse, URL);
  return {
    puts,
    deleted,
    fetchHandler: handlers.fetch,
    activateHandler: handlers.activate,
  };
}

async function navigate(h: Harness, url: string): Promise<{ status: number } | null> {
  let pending: Promise<{ status: number }> | null = null;
  h.fetchHandler({
    request: { method: 'GET', url, mode: 'navigate' },
    respondWith: (p: Promise<{ status: number }>) => {
      pending = p;
    },
  });
  if (!pending) return null;
  const res = await pending;
  // `cache.put` corre en un `.then` suelto dentro del worker.
  await new Promise((r) => setTimeout(r, 0));
  return res;
}

const PRIVATE_PAGES = [
  'https://yaentre.com/app',
  'https://yaentre.com/app/perfil',
  'https://yaentre.com/app/progreso',
  'https://yaentre.com/tutor',
  'https://yaentre.com/onboarding',
];

describe('modo por defecto (sin rastro): ninguna navegación se guarda', () => {
  for (const url of PRIVATE_PAGES) {
    it(`${new URL(url).pathname} se sirve de la red y NO se escribe en caché`, async () => {
      const h = load('https://yaentre.com/sw.js', { network: 'ok' });
      const res = await navigate(h, url);
      expect(res?.status).toBe(200);
      expect(h.puts).toEqual([]);
    });
  }

  it('sin conexión responde el aviso (503), no una copia vieja', async () => {
    const h = load('https://yaentre.com/sw.js', { network: 'down' });
    const res = await navigate(h, 'https://yaentre.com/app');
    expect(res?.status).toBe(503);
  });

  it('al activarse borra la caché vieja de pantallas y conserva la de assets', async () => {
    const h = load('https://yaentre.com/sw.js', {
      network: 'ok',
      existingCaches: ['yaentre-shell-v2', 'yaentre-pages-v3', 'yaentre-static-v3'],
    });
    let done: Promise<unknown> = Promise.resolve();
    h.activateHandler({ waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;
    expect(h.deleted.sort()).toEqual(['yaentre-pages-v3', 'yaentre-shell-v2']);
  });

  it('los assets estáticos SÍ se guardan (públicos, iguales para todos)', async () => {
    const h = load('https://yaentre.com/sw.js', { network: 'ok' });
    let pending: Promise<unknown> | null = null;
    h.fetchHandler({
      request: { method: 'GET', url: 'https://yaentre.com/_next/static/chunk.js', mode: 'no-cors' },
      respondWith: (p: Promise<unknown>) => (pending = p),
    });
    await pending;
    await new Promise((r) => setTimeout(r, 0));
    expect(h.puts).toEqual(['yaentre-static-v3 https://yaentre.com/_next/static/chunk.js']);
  });
});

describe('control positivo: en modo persistente la MISMA navegación sí se guarda', () => {
  it('/app queda en la caché de pantallas', async () => {
    const h = load('https://yaentre.com/sw.js?modo=persistente', { network: 'ok' });
    await navigate(h, 'https://yaentre.com/app');
    expect(h.puts).toEqual(['yaentre-pages-v3 https://yaentre.com/app']);
  });

  it('y al activarse conserva esa caché', async () => {
    const h = load('https://yaentre.com/sw.js?modo=persistente', {
      network: 'ok',
      existingCaches: ['yaentre-shell-v2', 'yaentre-pages-v3', 'yaentre-static-v3'],
    });
    let done: Promise<unknown> = Promise.resolve();
    h.activateHandler({ waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;
    expect(h.deleted).toEqual(['yaentre-shell-v2']);
  });

  it('pero /admin sigue sin guardarse NUNCA, en ningún modo', async () => {
    const h = load('https://yaentre.com/sw.js?modo=persistente', { network: 'ok' });
    const res = await navigate(h, 'https://yaentre.com/admin/usuarios');
    expect(res).toBeNull();
    expect(h.puts).toEqual([]);
  });
});
