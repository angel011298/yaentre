/* eslint-disable @typescript-eslint/no-explicit-any -- dobles de prueba que capturan los parámetros arbitrarios que la acción manda a Stripe y a Prisma */
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * La atribución de un registro a un código de referido (`signUpAction`).
 *
 * Lo que importa: QUÉ se escribe en `user_profiles` — `referredByCodeId` solo en
 * el `create` (first-touch: el `update` queda vacío para que un segundo pase por
 * la acción jamás la pise) — y que un fallo del programa NUNCA cueste una cuenta.
 */

const h = vi.hoisted(() => ({
  cookies: {} as Record<string, string>,
  upsertArgs: null as null | Record<string, any>,
  resolved: { id: 'code1' } as null | { id: string },
  resolveFails: false,
  ensureFails: false,
  ensured: [] as string[],
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (h.cookies[name] ? { value: h.cookies[name] } : undefined) }),
}));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock('@/lib/auth/supabase-server', () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      signUp: async () => ({ data: { user: { id: 'auth1', identities: [{}] }, session: { access_token: 'x' } }, error: null }),
      signInWithPassword: async () => ({ data: { session: null } }),
    },
  }),
}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    userProfile: {
      upsert: async (args: Record<string, any>) => {
        h.upsertArgs = args;
        return { id: 'prof1' };
      },
    },
  },
}));
vi.mock('@/lib/db/referrals', () => ({
  resolveCodeForAttribution: vi.fn(async () => {
    if (h.resolveFails) throw new Error('db down');
    return h.resolved;
  }),
  ensureReferralCode: vi.fn(async (id: string) => {
    if (h.ensureFails) throw new Error('db down');
    h.ensured.push(id);
    return { id: 'c', code: 'X', active: true };
  }),
}));
vi.mock('@/lib/rate-limit/store', () => ({
  consumeRateLimit: vi.fn(async () => ({ allowed: true, hits: 1, retryAfterSecs: 0 })),
  consumeAll: vi.fn(async () => ({ allowed: true, hits: 1, retryAfterSecs: 0 })),
}));
vi.mock('@/lib/rate-limit/request', () => ({ currentClientIp: async () => '10.0.0.1', emailSubject: (e: string) => e }));
vi.mock('@/lib/analytics/server', () => ({ trackServerEvent: vi.fn(async () => {}) }));
vi.mock('@/lib/auth/site-url', () => ({ getSiteUrl: () => 'https://yaentre.test' }));
vi.mock('@/lib/observability/report', () => ({ reportSilentDegradation: vi.fn(), reportControlFailure: vi.fn() }));

const { signUpAction } = await import('@/app/actions/auth');
const { reportSilentDegradation } = await import('@/lib/observability/report');

function form(extra: Record<string, string> = {}) {
  const f = new FormData();
  f.set('email', 'alumna@example.com');
  f.set('password', 'una-contraseña-larga-1');
  f.set('acceptTerms', 'on');
  f.set('birthDate', '2005-03-10');
  f.set('ageDeclaration', 'on');
  for (const [k, v] of Object.entries(extra)) f.set(k, v);
  return f;
}

async function signUp(extra?: Record<string, string>) {
  await expect(signUpAction({ status: 'idle' } as never, form(extra))).rejects.toThrow(/REDIRECT/);
}

beforeEach(() => {
  vi.clearAllMocks();
  h.cookies = {};
  h.upsertArgs = null;
  h.resolved = { id: 'code1' };
  h.resolveFails = false;
  h.ensureFails = false;
  h.ensured.length = 0;
});

describe('signUpAction — atribución de referidos', () => {
  it('con la cookie ye_ref de un código activo: referredByCodeId se escribe SOLO en el create', async () => {
    h.cookies.ye_ref = 'AB2CD3EF';
    await signUp();
    expect(h.upsertArgs?.create.referredByCodeId).toBe('code1');
    // first touch: un segundo paso por la acción no la pisa.
    expect(h.upsertArgs?.update).toEqual({});
  });

  it('sin cookie no hay atribución', async () => {
    await signUp();
    expect('referredByCodeId' in (h.upsertArgs?.create ?? {})).toBe(false);
  });

  it('una cookie corrupta se ignora', async () => {
    h.cookies.ye_ref = '%%%';
    await signUp();
    expect('referredByCodeId' in (h.upsertArgs?.create ?? {})).toBe(false);
  });

  it('un código que ya no atribuye (suspendido o inexistente) no deja atribución', async () => {
    h.cookies.ye_ref = 'AB2CD3EF';
    h.resolved = null;
    await signUp();
    expect('referredByCodeId' in (h.upsertArgs?.create ?? {})).toBe(false);
  });

  it('si la consulta del código FALLA: la cuenta se crea igual y el fallo se reporta', async () => {
    h.cookies.ye_ref = 'AB2CD3EF';
    h.resolveFails = true;
    await signUp();
    expect(h.upsertArgs).not.toBeNull();
    expect('referredByCodeId' in (h.upsertArgs?.create ?? {})).toBe(false);
    expect(reportSilentDegradation).toHaveBeenCalledWith('referral_attribution', expect.any(Error), { stage: 'signup' });
  });

  it('el registro la atribución de marketing NO se toca: sigue independiente', async () => {
    h.cookies.ye_ref = 'AB2CD3EF';
    h.cookies.yaentre_attribution = JSON.stringify({ landingPath: '/', capturedAt: 'x', utm_source: 'tiktok' });
    await signUp();
    expect(h.upsertArgs?.create.acquisitionSource.utm_source).toBe('tiktok');
    expect(h.upsertArgs?.create.referredByCodeId).toBe('code1');
  });
});

describe('signUpAction — código propio', () => {
  it('genera el código de la persona recién registrada', async () => {
    await signUp();
    expect(h.ensured).toEqual(['prof1']);
  });

  it('si no se puede generar, el registro NO se rompe: se reporta y se crea al abrir «Invita y gana»', async () => {
    h.ensureFails = true;
    await signUp();
    expect(reportSilentDegradation).toHaveBeenCalledWith('referral_code', expect.any(Error), { stage: 'signup' });
  });

  it('el registro de un TUTOR también recibe su código (spec §2: alumno o padre)', async () => {
    await signUp({ role: 'PARENT', birthDate: '', ageDeclaration: '' });
    expect(h.upsertArgs?.create.role).toBe('PARENT');
    expect(h.ensured).toEqual(['prof1']);
  });
});
