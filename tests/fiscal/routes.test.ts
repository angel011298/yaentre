import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseFiscalMonth, parseFiscalYear } from '@/lib/api/fiscal-params';

/**
 * Las rutas fiscales, con el guard REAL (`requireCapability` + la matriz de
 * capacidades) y la sesión y la base simuladas. La pregunta no es «¿devuelve
 * error?» sino la fuerte: **¿llega a tocar la base?** — los dobles registran cada
 * lectura y los caminos denegados exigen ese registro VACÍO.
 */

const calls: string[] = [];
const audit: Array<{ action: string; details: unknown }> = [];
let rateAllowed = true;

const identity: { role: string | null } = { role: null };

vi.mock('next/navigation', () => ({ redirect: () => undefined }));
vi.mock('@/lib/auth/supabase-server', () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: identity.role ? { id: 'auth-uid', email: 'conta@yaentre.com' } : null } }),
    },
  }),
}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    userProfile: {
      findUnique: async () => (identity.role ? { id: 'ckprofile0001', userId: 'auth-uid', role: identity.role, onboardingStep: 0 } : null),
    },
  },
}));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), withScope: vi.fn() }));
vi.mock('@/lib/observability/report', () => ({ reportSilentDegradation: () => undefined, reportControlFailure: () => undefined }));
vi.mock('@/lib/rate-limit/store', () => ({ consumeRateLimit: async () => ({ allowed: rateAllowed }) }));
vi.mock('@/lib/admin/audit-log', () => ({
  logAdminAction: async (action: string, _actor: unknown, details: unknown) => {
    calls.push('audit');
    audit.push({ action, details });
  },
}));
vi.mock('@/lib/db/fiscal', () => ({
  getFiscalSnapshot: async (year: number) => {
    calls.push('snapshot');
    return { year, months: [], totals: {}, retentionBases: [], reserves: {}, payoutCount: 0, coverage: {} };
  },
  readExportInput: async () => {
    calls.push('exportInput');
    return {
      payments: [{ amountCents: 99_900, paidAt: new Date('2026-10-05T18:00:00Z'), planLabel: 'Básico', method: 'CARD' }],
      refunds: [],
      classes: [],
    };
  },
}));

const summary = await import('@/app/api/fiscal/summary/route');
const exporter = await import('@/app/api/fiscal/export/route');
const resico = await import('@/app/api/admin/resico/route');

const get = (url: string) => new Request(url);

beforeEach(() => {
  // Las rutas leen el reloj (`new Date()`) para rechazar un mes futuro: se fija, o el
  // resultado dependería del día en que corra la prueba. Solo `Date`, para no frenar los `await`.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-20T12:00:00Z'));
  calls.length = 0;
  audit.length = 0;
  rateAllowed = true;
  identity.role = null;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('quién entra a las rutas fiscales — sin la capacidad, NADA toca la base', () => {
  const ROUTES = [
    ['GET /api/fiscal/summary', () => summary.GET(get('http://x/api/fiscal/summary?year=2026'))],
    ['GET /api/fiscal/export', () => exporter.GET(get('http://x/api/fiscal/export?month=2026-10'))],
  ] as const;

  for (const [name, call] of ROUTES) {
    for (const role of ['STUDENT', 'PARENT', 'SUPPORT']) {
      it(`${name} — ${role} → 403 y ninguna lectura`, async () => {
        identity.role = role;
        const res = await call();
        expect(res.status).toBe(403);
        expect(calls).toEqual([]);
      });
    }

    it(`${name} — sin sesión → 401 y ninguna lectura`, async () => {
      const res = await call();
      expect(res.status).toBe(401);
      expect(calls).toEqual([]);
    });

    for (const role of ['ACCOUNTANT', 'ADMIN']) {
      it(`${name} — ${role} entra`, async () => {
        identity.role = role;
        const res = await call();
        expect(res.status).toBe(200);
        expect(calls.length).toBeGreaterThan(0);
      });
    }
  }

  it('el monitor RESICO (bajo /api/admin) también lo ve el contador y NO soporte ni un alumno', async () => {
    const attempts: Array<[string, number]> = [['STUDENT', 403], ['SUPPORT', 403], ['PARENT', 403]];
    for (const [role, status] of attempts) {
      identity.role = role;
      expect((await resico.GET()).status).toBe(status);
    }
  });
});

describe('límite de tasa y validación', () => {
  it('con el límite agotado responde 429 SIN leer la base', async () => {
    identity.role = 'ACCOUNTANT';
    rateAllowed = false;
    expect((await summary.GET(get('http://x/api/fiscal/summary'))).status).toBe(429);
    expect((await exporter.GET(get('http://x/api/fiscal/export?month=2026-10'))).status).toBe(429);
    expect(calls).toEqual([]);
  });

  it('un año inválido es 400 y no lee la base', async () => {
    identity.role = 'ACCOUNTANT';
    for (const year of ['1999', '2999', 'abc', '20260', '-2026']) {
      const res = await summary.GET(get(`http://x/api/fiscal/summary?year=${year}`));
      expect(res.status).toBe(400);
    }
    expect(calls).toEqual([]);
  });

  it('un mes inválido o futuro es 400 y no lee la base', async () => {
    identity.role = 'ACCOUNTANT';
    for (const month of ['2026-13', '2026-1', '2999-01', '', '2025-12', "2026-10'; DROP TABLE"]) {
      const res = await exporter.GET(get(`http://x/api/fiscal/export?month=${encodeURIComponent(month)}`));
      expect(res.status).toBe(400);
    }
    expect(calls).toEqual([]);
  });
});

describe('la exportación CSV', () => {
  it('se AUDITA antes de entregar el archivo, con el mes y el número de filas', async () => {
    identity.role = 'ACCOUNTANT';
    const res = await exporter.GET(get('http://x/api/fiscal/export?month=2026-10'));
    expect(res.status).toBe(200);
    expect(calls).toEqual(['exportInput', 'audit']); // lee, deja rastro y solo entonces responde
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ action: 'fiscal.exported', details: { metadata: { month: '2026-10', rows: 1 } } });
  });

  it('cabeceras: descarga (attachment), no-store, sin sniffing, CSV con BOM para Excel', async () => {
    identity.role = 'ACCOUNTANT';
    const res = await exporter.GET(get('http://x/api/fiscal/export?month=2026-10'));
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="yaentre-fiscal-2026-10.csv"');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    // `Response.text()` decodifica UTF-8 y QUITA el BOM: se comprueban los BYTES, que es lo que recibe Excel.
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('2026-10-05,COBRO,Básico,CARD,999.00,861.21,137.79');
  });

  it('🔒 el archivo no lleva ningún dato personal', async () => {
    identity.role = 'ACCOUNTANT';
    const text = await (await exporter.GET(get('http://x/api/fiscal/export?month=2026-10'))).text();
    expect(text).not.toMatch(/@|ckprofile|conta@/);
  });

  it('el JSON del resumen también es no-store', async () => {
    identity.role = 'ADMIN';
    const res = await summary.GET(get('http://x/api/fiscal/summary?year=2026'));
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});

describe('parámetros (puros)', () => {
  const NOW = new Date('2026-10-15T12:00:00Z');

  it('el año por omisión es el actual en hora de México, y el rango es 2026..actual', () => {
    expect(parseFiscalYear(null, NOW)).toEqual({ ok: true, year: 2026 });
    expect(parseFiscalYear('2026', NOW)).toEqual({ ok: true, year: 2026 });
    expect(parseFiscalYear('2027', NOW)).toEqual({ ok: false });
    expect(parseFiscalYear('2025', NOW)).toEqual({ ok: false });
  });

  it('el 1 de enero a las 05:59Z todavía es el año anterior en México', () => {
    expect(parseFiscalYear(null, new Date('2027-01-01T05:59:59Z'))).toEqual({ ok: true, year: 2026 });
    expect(parseFiscalYear(null, new Date('2027-01-01T06:00:00Z'))).toEqual({ ok: true, year: 2027 });
  });

  it('el mes pedido no puede ser futuro ni anterior al primer año fiscal', () => {
    expect(parseFiscalMonth('2026-10', NOW)).toEqual({ ok: true, month: { year: 2026, month: 10 } });
    expect(parseFiscalMonth('2026-11', NOW)).toEqual({ ok: false });
    expect(parseFiscalMonth('2025-12', NOW)).toEqual({ ok: false });
    expect(parseFiscalMonth(null, NOW)).toEqual({ ok: false });
  });
});
