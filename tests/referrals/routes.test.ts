import { beforeEach, describe, expect, it, vi } from 'vitest';
import jsQR from 'jsqr';
import { inflateSync } from 'node:zlib';

/**
 * Las rutas de «Invita y gana» con el guard REAL (`requireRole`) y la sesión y la
 * base simuladas. La pregunta fuerte no es «¿devuelve error?» sino **¿llega a
 * tocar la base?**: los caminos denegados exigen que el registro de llamadas
 * quede VACÍO.
 */

const calls: string[] = [];
let rateAllowed = true;
const identity: { role: string | null; id: string } = { role: null, id: 'ckprofile00000000000000001' };

const state = {
  own: { id: 'ckcode', code: 'AB2CD3EF', active: true } as null | { id: string; code: string; active: boolean },
};

vi.mock('next/navigation', () => ({ redirect: () => undefined }));
vi.mock('@/lib/auth/supabase-server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: identity.role ? { id: 'auth-uid', email: 'a@yaentre.test' } : null } }) },
  }),
}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    userProfile: {
      findUnique: async () => (identity.role ? { id: identity.id, userId: 'auth-uid', role: identity.role, onboardingStep: 0 } : null),
    },
  },
}));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), withScope: vi.fn() }));
vi.mock('@/lib/observability/report', () => ({ reportSilentDegradation: vi.fn(), reportControlFailure: vi.fn() }));
vi.mock('@/lib/rate-limit/store', () => ({
  consumeRateLimit: async (scope: string, subject: string) => {
    calls.push(`rate:${scope}:${subject}`);
    return { allowed: rateAllowed, hits: 1, retryAfterSecs: 30 };
  },
}));
vi.mock('@/lib/auth/site-url', () => ({ getSiteUrl: () => 'https://yaentre.com' }));
vi.mock('@/lib/db/referrals', () => ({
  ensureReferralCode: async (id: string) => {
    calls.push(`ensure:${id}`);
    return state.own;
  },
  getOwnReferralCode: async (id: string) => {
    calls.push(`own:${id}`);
    return state.own;
  },
  getReferralOverview: async (id: string) => {
    calls.push(`overview:${id}`);
    return { code: state.own, balanceCents: 15_000, nextExpiryAt: new Date('2027-10-01T00:00:00Z'), pendingCents: 15_000, pendingCount: 1, successfulCount: 2 };
  },
  getReferralHistory: async (id: string, limit: number) => {
    calls.push(`history:${id}:${limit}`);
    return [
      { id: 's1', createdAt: new Date('2026-10-20T00:00:00Z'), commissionCents: 15_000, status: 'PENDING', accrueAfter: new Date('2026-10-27T00:00:00Z'), underReview: false, reversedForRefund: false },
      { id: 's2', createdAt: new Date('2026-10-10T00:00:00Z'), commissionCents: 15_000, status: 'PENDING', accrueAfter: new Date('2026-10-17T00:00:00Z'), underReview: true, reversedForRefund: false },
    ];
  },
}));

const generate = await import('@/app/api/referrals/generate/route');
const qr = await import('@/app/api/referrals/qr/[code]/route');
const stats = await import('@/app/api/referrals/stats/route');
const history = await import('@/app/api/referrals/history/route');

const get = (url: string) => new Request(url);
const qrCall = (code: string, query = '') => qr.GET(get(`http://x/api/referrals/qr/${code}${query}`), { params: Promise.resolve({ code }) });

const ROUTES: Array<[string, () => Promise<Response>]> = [
  ['POST /api/referrals/generate', () => generate.POST()],
  ['GET /api/referrals/qr/{code}', () => qrCall('AB2CD3EF')],
  ['GET /api/referrals/stats', () => stats.GET()],
  ['GET /api/referrals/history', () => history.GET(get('http://x/api/referrals/history'))],
];

beforeEach(() => {
  calls.length = 0;
  rateAllowed = true;
  identity.role = null;
  state.own = { id: 'ckcode', code: 'AB2CD3EF', active: true };
});

describe('quién entra — la matriz de roles, con el guard real', () => {
  for (const [name, call] of ROUTES) {
    it(`${name} — anónimo → 401 y NINGUNA llamada`, async () => {
      const res = await call();
      expect(res.status).toBe(401);
      expect(calls).toEqual([]);
    });

    for (const role of ['ACCOUNTANT', 'SUPPORT']) {
      it(`${name} — ${role} → 403 y NINGUNA llamada`, async () => {
        identity.role = role;
        const res = await call();
        expect(res.status).toBe(403);
        expect(calls).toEqual([]);
      });
    }

    for (const role of ['STUDENT', 'PARENT', 'ADMIN']) {
      it(`${name} — ${role} → 200`, async () => {
        identity.role = role;
        const res = await call();
        expect(res.status).toBe(200);
        expect(calls.length).toBeGreaterThan(0);
      });
    }

    it(`${name} — sobre el límite de tasa: 429 y no toca los datos`, async () => {
      identity.role = 'STUDENT';
      rateAllowed = false;
      const res = await call();
      expect(res.status).toBe(429);
      expect(calls.every((c) => c.startsWith('rate:'))).toBe(true);
    });

    it(`${name} — el límite es POR PERFIL (el sujeto sale del guard)`, async () => {
      identity.role = 'STUDENT';
      await call();
      expect(calls.find((c) => c.startsWith('rate:'))).toMatch(/:ckprofile00000000000000001$/);
    });
  }
});

describe('el dueño sale del guard, nunca del input', () => {
  it('generate ignora un userProfileId que llegue en el cuerpo o en la URL', async () => {
    identity.role = 'STUDENT';
    const res = await generate.POST();
    expect(res.status).toBe(200);
    expect(calls).toContain('ensure:ckprofile00000000000000001');
    expect(generate.POST.length).toBe(0); // la firma ni siquiera acepta la petición
  });

  it('stats e history leen SOLO al perfil del guard', async () => {
    identity.role = 'STUDENT';
    await stats.GET();
    await history.GET(get('http://x/api/referrals/history?userProfileId=otro&profileId=otro'));
    expect(calls).toContain('overview:ckprofile00000000000000001');
    expect(calls).toContain('history:ckprofile00000000000000001:50');
    expect(calls.some((c) => c.includes('otro'))).toBe(false);
  });
});

describe('POST /api/referrals/generate', () => {
  it('devuelve el código, el enlace y la ruta del QR', async () => {
    identity.role = 'STUDENT';
    const body = await (await generate.POST()).json();
    expect(body).toEqual({
      ok: true,
      data: { code: 'AB2CD3EF', active: true, url: 'https://yaentre.com/r/AB2CD3EF', qrUrl: '/api/referrals/qr/AB2CD3EF' },
    });
  });

  it('no se cachea', async () => {
    identity.role = 'STUDENT';
    expect((await generate.POST()).headers.get('cache-control')).toBe('no-store');
  });
});

describe('GET /api/referrals/qr/{code}', () => {
  beforeEach(() => {
    identity.role = 'STUDENT';
  });

  function scan(png: Buffer): string | null {
    let pos = 8;
    let w = 0;
    let h = 0;
    const idat: Buffer[] = [];
    while (pos < png.length) {
      const len = png.readUInt32BE(pos);
      const type = png.toString('ascii', pos + 4, pos + 8);
      if (type === 'IHDR') {
        w = png.readUInt32BE(pos + 8);
        h = png.readUInt32BE(pos + 12);
      }
      if (type === 'IDAT') idat.push(png.subarray(pos + 8, pos + 8 + len));
      pos += 12 + len;
    }
    const raw = inflateSync(Buffer.concat(idat));
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const s = y * (w * 3 + 1) + 1 + x * 3;
        rgba.set([raw[s], raw[s + 1], raw[s + 2], 255], (y * w + x) * 4);
      }
    return jsQR(rgba, w, h)?.data ?? null;
  }

  it('devuelve un PNG que se ESCANEA y apunta al enlace del código propio', async () => {
    const res = await qrCall('AB2CD3EF');
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(scan(Buffer.from(await res.arrayBuffer()))).toBe('https://yaentre.com/r/AB2CD3EF');
  });

  it('acepta el código en minúsculas (se normaliza)', async () => {
    expect((await qrCall('ab2cd3ef')).status).toBe(200);
  });

  it('no se cachea y no se puede reinterpretar como otra cosa (nosniff)', async () => {
    const res = await qrCall('AB2CD3EF');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('?download=1 lo entrega como archivo; sin él, en línea', async () => {
    expect((await qrCall('AB2CD3EF', '?download=1')).headers.get('content-disposition')).toBe('attachment; filename="yaentre-qr-AB2CD3EF.png"');
    expect((await qrCall('AB2CD3EF')).headers.get('content-disposition')).toBeNull();
  });

  it('el código de OTRA persona → 404 (indistinguible de uno inexistente)', async () => {
    const other = await qrCall('ZZ9YY8XX');
    expect(other.status).toBe(404);
    state.own = null;
    expect((await qrCall('AB2CD3EF')).status).toBe(404);
    expect((await other.json()).code).toBe('NOT_FOUND');
  });

  it.each(['ab', '..%2Fetc', 'A'.repeat(40)])('un código mal formado (%s) → 404 sin generar nada', async (bad) => {
    const res = await qrCall(bad);
    expect(res.status).toBe(404);
  });

  it('un código SUSPENDIDO no genera QR (403)', async () => {
    state.own = { id: 'ckcode', code: 'AB2CD3EF', active: false };
    const res = await qrCall('AB2CD3EF');
    expect(res.status).toBe(403);
    expect(res.headers.get('content-type')).not.toBe('image/png');
  });
});

describe('GET /api/referrals/stats', () => {
  it('trae el resumen propio', async () => {
    identity.role = 'STUDENT';
    const { data } = await (await stats.GET()).json();
    expect(data).toEqual({
      code: { code: 'AB2CD3EF', active: true, url: 'https://yaentre.com/r/AB2CD3EF' },
      balanceCents: 15_000,
      nextExpiryAt: '2027-10-01T00:00:00.000Z',
      pendingCents: 15_000,
      pendingCount: 1,
      successfulCount: 2,
    });
  });
});

describe('GET /api/referrals/history — minimización de datos', () => {
  beforeEach(() => {
    identity.role = 'STUDENT';
  });

  it('NO trae nada del comprador ni de las marcas de antifraude: solo fecha, monto y estado', async () => {
    const res = await history.GET(get('http://x/api/referrals/history'));
    const text = await res.text();
    const { data } = JSON.parse(text);
    expect(Object.keys(data.items[0]).sort()).toEqual(['commissionCents', 'date', 'daysUntilAccrual', 'status', 'underReview']);
    for (const forbidden of ['buyer', 'email', 'fraud', 'flag', 'velocity', 'userProfileId', 'purchaseId', 's1', 's2']) {
      expect(text.toLowerCase().includes(forbidden.toLowerCase()), forbidden).toBe(false);
    }
    expect(data.items[1].underReview).toBe(true);
  });

  it('el límite: por omisión 50; acepta 1-100; rechaza lo demás con 400 SIN tocar los datos', async () => {
    await history.GET(get('http://x/api/referrals/history?limit=7'));
    expect(calls).toContain('history:ckprofile00000000000000001:7');
    for (const bad of ['0', '101', 'abc', '-3', '1.5']) {
      calls.length = 0;
      const res = await history.GET(get(`http://x/api/referrals/history?limit=${bad}`));
      expect(res.status, bad).toBe(400);
      expect(calls.some((c) => c.startsWith('history:'))).toBe(false);
    }
  });
});
