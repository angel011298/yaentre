import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({ lookups: [] as string[], valid: true, fail: false }));

vi.mock('@/lib/db/referrals', () => ({
  resolveCodeForAttribution: vi.fn(async (code: string) => {
    h.lookups.push(code);
    if (h.fail) throw new Error('db down');
    return h.valid ? { id: 'code1' } : null;
  }),
}));
vi.mock('@/lib/auth/site-url', () => ({ getSiteUrl: () => 'https://yaentre.test' }));
vi.mock('@/lib/observability/report', () => ({ reportSilentDegradation: vi.fn(), reportControlFailure: vi.fn() }));

const { GET } = await import('@/app/r/[code]/route');
const { reportSilentDegradation } = await import('@/lib/observability/report');
const { REFERRAL_COOKIE_MAX_AGE_SECS } = await import('@/lib/referrals/code');

let ipCounter = 0;
function hit(code: string, cookie?: string, ip?: string) {
  const headers: Record<string, string> = { 'x-forwarded-for': ip ?? `10.0.0.${++ipCounter}` };
  if (cookie) headers.cookie = cookie;
  const req = new NextRequest(`https://yaentre.test/r/${code}`, { headers });
  return GET(req, { params: Promise.resolve({ code }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  h.lookups.length = 0;
  h.valid = true;
  h.fail = false;
});

describe('GET /r/{código}', () => {
  it('un código válido: redirige a la landing con ?ref y escribe la cookie de 30 días', async () => {
    const res = await hit('ab2cd3ef');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://yaentre.test/?ref=AB2CD3EF');
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('ye_ref=AB2CD3EF');
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toContain(`Max-Age=${REFERRAL_COOKIE_MAX_AGE_SECS}`);
    expect(cookie).toMatch(/Path=\//);
    expect(h.lookups).toEqual(['AB2CD3EF']);
  });

  it('en producción la cookie lleva Secure', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = await hit('AB2CD3EF');
    vi.unstubAllEnvs();
    expect(res.headers.get('set-cookie')).toMatch(/Secure/i);
  });

  it('la respuesta nunca se cachea (una respuesta en caché no escribiría la cookie)', async () => {
    const res = await hit('AB2CD3EF');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('FIRST TOUCH WINS: con una atribución ya guardada NO se sobreescribe y ni siquiera se consulta la base', async () => {
    const res = await hit('ZZ9YY8XX', 'ye_ref=AB2CD3EF');
    expect(res.status).toBe(307);
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(h.lookups).toEqual([]);
  });

  it('una cookie CORRUPTA no cuenta como atribución: el enlace la reemplaza', async () => {
    const res = await hit('AB2CD3EF', 'ye_ref=%25%25basura');
    expect(res.headers.get('set-cookie')).toContain('ye_ref=AB2CD3EF');
  });

  it('un código que no existe (o está suspendido) redirige igual, SIN cookie', async () => {
    h.valid = false;
    const res = await hit('NOEXISTE');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('https://yaentre.test/');
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it.each(['ab', 'a'.repeat(30), 'AB-CD', '..%2F..'])('un código mal formado (%s) redirige a la landing sin consultar la base ni escribir nada', async (bad) => {
    const res = await hit(bad);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://yaentre.test/');
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(h.lookups).toEqual([]);
  });

  it('si la base falla: la visita no se rompe, no hay cookie y queda reportado', async () => {
    h.fail = true;
    const res = await hit('AB2CD3EF');
    expect(res.status).toBe(307);
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(reportSilentDegradation).toHaveBeenCalledWith('referral_attribution', expect.any(Error), { stage: 'link' });
  });

  it('el limitador barato por IP: pasado el límite deja de consultar la base y de escribir cookies', async () => {
    const ip = '203.0.113.9';
    for (let i = 0; i < 30; i++) await hit('AB2CD3EF', undefined, ip);
    h.lookups.length = 0;
    const res = await hit('AB2CD3EF', undefined, ip);
    expect(res.status).toBe(307);
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(h.lookups).toEqual([]);
  });

  it('el rojo es alcanzable: otra IP, mismo código, SÍ escribe la cookie', async () => {
    const res = await hit('AB2CD3EF', undefined, '198.51.100.7');
    expect(res.headers.get('set-cookie')).toContain('ye_ref=AB2CD3EF');
  });
});
