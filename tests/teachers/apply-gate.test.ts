import { describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ created: 0, rate: 0 }));

vi.mock('@/lib/auth/supabase-server', () => ({ createSupabaseServerClient: async () => ({}) }));
vi.mock('@/lib/analytics/server', () => ({ trackServerEvent: async () => undefined }));
vi.mock('@/lib/email/client', () => ({ sendEmail: async () => ({ ok: true }) }));
vi.mock('@/lib/observability/report', () => ({ reportSilentDegradation: () => undefined }));
vi.mock('@/lib/rate-limit/store', () => ({
  consumeRateLimit: async () => {
    h.rate += 1;
    return { allowed: true };
  },
}));
vi.mock('@/lib/db/teachers', () => ({
  createTeacherApplication: async () => {
    h.created += 1;
    return { teacherId: 't1' };
  },
  updateOwnTeacher: async () => ({ clabeChanged: false }),
}));

const { submitTeacherApplication } = await import('@/lib/teachers/service');
const { MarketplaceError } = await import('@/lib/classes/errors');

describe('solicitud de profesor con textos legales pendientes', () => {
  it('se rechaza ANTES de tocar el límite de tasa o la base', async () => {
    const err = await submitTeacherApplication(
      { userProfileId: 'ckp', authUserId: 'uid', email: 'a@b.mx' },
      { csfDocumentPath: null } as never
    ).then(
      () => null,
      (e) => e
    );
    expect(err).toBeInstanceOf(MarketplaceError);
    expect(err.code).toBe('MARKETPLACE_CLOSED');
    expect(h.created).toBe(0);
    expect(h.rate).toBe(0);
  });
});
