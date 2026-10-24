import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * G103 — `GET /api/admin/subscriptions/expiring`: un Route Handler no lo
 * protege ningún layout; el rol se verifica en la ruta. Por efecto: ¿se llegó
 * a consultar la base? Con control positivo.
 */
const state: { role: string | null } = { role: null };
const dbCalls: string[] = [];

vi.mock('@/lib/auth/guards', async () => {
  const { AuthError } = await import('@/lib/auth/errors');
  return {
    requireRole: vi.fn(async (allowed: string) => {
      if (!state.role) throw new AuthError('UNAUTHORIZED', 'Debes iniciar sesión para continuar.');
      if (state.role !== allowed) throw new AuthError('FORBIDDEN', 'No tienes permiso para acceder a esto.');
      return { profile: { id: 'cku_admin', role: state.role }, authUser: {} };
    }),
  };
});
vi.mock('@/lib/db/admin-expiring', () => ({
  listExpiringSubscriptions: vi.fn(async () => {
    dbCalls.push('list');
    return [{ id: 's1', expiresAt: new Date('2026-11-01T06:00:00Z'), graceEndsAt: null, extendedAt: null }];
  }),
}));

const { GET } = await import('@/app/api/admin/subscriptions/expiring/route');

beforeEach(() => {
  state.role = null;
  dbCalls.length = 0;
});

describe('GET /api/admin/subscriptions/expiring', () => {
  it('sin sesión 401, alumno o tutor 403, sin tocar la base; siempre no-store', async () => {
    const anon = await GET();
    expect(anon.status).toBe(401);
    expect(anon.headers.get('cache-control')).toBe('no-store');
    for (const role of ['STUDENT', 'PARENT']) {
      state.role = role;
      expect((await GET()).status, role).toBe(403);
    }
    expect(dbCalls).toEqual([]);
  });

  it('control positivo: un ADMIN recibe la lista', async () => {
    state.role = 'ADMIN';
    const r = await GET();
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ count: 1 });
    expect(dbCalls).toEqual(['list']);
  });
});
