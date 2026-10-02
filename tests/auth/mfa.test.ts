import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  aalFromAccessToken,
  hasVerifiedTotp,
  needsMfaChallenge,
  normalizeTotpCode,
} from '@/lib/auth/mfa';

/**
 * G100 — segundo factor. Dos capas:
 *  1. el módulo puro (`src/lib/auth/mfa.ts`);
 *  2. el GUARD: con un TOTP verificado, una sesión aal1 no pasa `requireUser`
 *     y sí pasa `requireUserPendingMfa` (solo para el reto). Es la única
 *     barrera: si `requireUser` dejara pasar aal1, el 2FA sería decorativo.
 */

const findUniqueMock = vi.fn();
const getUserMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: (dest: string) => {
    throw new Error(`REDIRECT:${dest}`);
  },
}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: { userProfile: { findUnique: (...a: unknown[]) => findUniqueMock(...a) } },
}));
vi.mock('@/lib/auth/supabase-server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: () => getUserMock(), getSession: () => getSessionMock() },
  }),
}));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), withScope: vi.fn() }));

// Ámbito de módulo, no dentro de un `it` (G73b).
const guards = await import('@/lib/auth/guards');

function jwtWithAal(aal: string): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS256' })}.${b64({ sub: 'u', aal })}.firma`;
}

const VERIFIED = [{ id: 'f1', factor_type: 'totp', status: 'verified' }];
const UNVERIFIED = [{ id: 'f1', factor_type: 'totp', status: 'unverified' }];

describe('módulo puro', () => {
  it('lee el aal del token', () => {
    expect(aalFromAccessToken(jwtWithAal('aal2'))).toBe('aal2');
    expect(aalFromAccessToken(jwtWithAal('aal1'))).toBe('aal1');
    expect(aalFromAccessToken('basura')).toBeNull();
    expect(aalFromAccessToken(null)).toBeNull();
  });

  it('solo un TOTP VERIFICADO exige el reto (una inscripción a medias no bloquea la cuenta)', () => {
    expect(hasVerifiedTotp(VERIFIED)).toBe(true);
    expect(needsMfaChallenge('aal1', VERIFIED)).toBe(true);
    expect(needsMfaChallenge('aal2', VERIFIED)).toBe(false);
    expect(needsMfaChallenge('aal1', UNVERIFIED)).toBe(false);
    expect(needsMfaChallenge(null, [])).toBe(false);
  });

  it('normaliza el código', () => {
    expect(normalizeTotpCode('123 456')).toBe('123456');
    expect(normalizeTotpCode('12345')).toBeNull();
    expect(normalizeTotpCode('12345a')).toBeNull();
  });
});

describe('guard requireUser con segundo factor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUniqueMock.mockResolvedValue({ id: 'p1', role: 'STUDENT', onboardingStep: 3 });
  });

  it('aal1 + TOTP verificado ⇒ requireUser RECHAZA con mfaRequired', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u', factors: VERIFIED } } });
    getSessionMock.mockResolvedValue({ data: { session: { access_token: jwtWithAal('aal1') } } });
    await expect(guards.requireUser()).rejects.toMatchObject({ code: 'UNAUTHORIZED', mfaRequired: true });
  });

  it('…pero requireUserPendingMfa la deja pasar marcada como pendiente', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u', factors: VERIFIED } } });
    getSessionMock.mockResolvedValue({ data: { session: { access_token: jwtWithAal('aal1') } } });
    await expect(guards.requireUserPendingMfa()).resolves.toMatchObject({ mfaPending: true });
  });

  it('aal2 + TOTP verificado ⇒ pasa', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u', factors: VERIFIED } } });
    getSessionMock.mockResolvedValue({ data: { session: { access_token: jwtWithAal('aal2') } } });
    await expect(guards.requireUser()).resolves.toMatchObject({ profile: { id: 'p1' } });
  });

  it('sin factor ⇒ pasa SIN leer la sesión (cero costo para quien no usa 2FA)', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u', factors: [] } } });
    await expect(guards.requireUser()).resolves.toMatchObject({ profile: { id: 'p1' } });
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it('sesión ilegible con TOTP verificado ⇒ falla CERRADO', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u', factors: VERIFIED } } });
    getSessionMock.mockResolvedValue({ data: { session: null } });
    await expect(guards.requireUser()).rejects.toMatchObject({ mfaRequired: true });
  });
});
