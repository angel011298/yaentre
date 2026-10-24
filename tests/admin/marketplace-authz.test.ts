import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError } from '@/lib/auth/errors';

/**
 * G103 — MATRIZ DE AUTORIZACIÓN de la moderación del marketplace, con el mismo
 * estándar que `tests/admin/authz.test.ts` (G99): la pregunta es «¿llegó a
 * tocar la base?». Roles: anónimo, STUDENT, PARENT, ADMIN no maestro, ADMIN
 * maestro. Y la bitácora se escribe también cuando la acción se RECHAZA.
 */

const dbCalls: string[] = [];
const auditRows: Array<{ action: string; outcome?: string; metadata?: Record<string, unknown> }> = [];
const identity: { role: string | null; email: string | null } = { role: null, email: null };

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/lib/auth/guards', () => ({
  requireRole: vi.fn(async (allowed: string) => {
    if (identity.role === null) throw new AuthError('UNAUTHORIZED', 'Debes iniciar sesión para continuar.');
    if (identity.role !== allowed) throw new AuthError('FORBIDDEN', 'No tienes permiso para acceder a esto.');
    return {
      authUser: { id: 'auth', email: identity.email, email_confirmed_at: '2026-10-01T00:00:00Z' },
      profile: { id: 'cku0000000000000000000admin', role: identity.role },
    };
  }),
}));

vi.mock('@/lib/admin/audit-log', () => ({
  logAdminAction: vi.fn(async (action: string, _actor: unknown, details: { outcome?: string; metadata?: Record<string, unknown> } = {}) => {
    auditRows.push({ action, outcome: details.outcome ?? 'applied', metadata: details.metadata });
  }),
}));

vi.mock('@/lib/rate-limit/store', () => ({ consumeRateLimit: vi.fn(async () => ({ allowed: true, hits: 1, retryAfterSecs: 0 })) }));

vi.mock('@/lib/db/teachers', () => ({
  getTeacherForAdmin: vi.fn(async () => {
    dbCalls.push('teachers.get');
    return { id: 'ckteacher00000000000000001', userProfileId: 'cku_t', status: 'PENDING_REVIEW' };
  }),
  setTeacherStatus: vi.fn(async (_id: string, status: string) => {
    dbCalls.push(`teachers.set:${status}`);
    return { status };
  }),
}));

vi.mock('@/lib/db/courses', () => ({
  setCourseStatusByAdmin: vi.fn(async (_id: string, to: string) => {
    dbCalls.push(`courses.set:${to}`);
    return true;
  }),
  setReviewHidden: vi.fn(async () => {
    dbCalls.push('reviews.hide');
    return true;
  }),
}));

const { reviewTeacherAction, reviewCourseAction, moderateCourseReviewAction } = await import('@/app/actions/admin-marketplace');

const TEACHER = { teacherId: 'ckteacher00000000000000001', decision: 'APPROVE', reason: 'CURP y CLABE verificadas' };
const COURSE = { courseId: 'ckcourse0000000000000000a', decision: 'APPROVE', reason: 'Contenido original y claro' };
const REVIEW = { enrollmentId: 'ckenroll0000000000000000a', hidden: true, reason: 'Reseña con datos personales' };

const ENV = { ...process.env };
beforeEach(() => {
  dbCalls.length = 0;
  auditRows.length = 0;
  identity.role = null;
  identity.email = null;
  process.env.MASTER_ADMIN_EMAILS = 'dueno@acierta-test.mx';
});
afterEach(() => {
  process.env = { ...ENV };
});

describe.each([
  ['anónimo', null],
  ['STUDENT', 'STUDENT'],
  ['PARENT', 'PARENT'],
])('%s', (_label, role) => {
  it('no llega a la base en ninguna acción de moderación', async () => {
    identity.role = role;
    identity.email = 'x@acierta-test.mx';
    for (const r of [await reviewTeacherAction(TEACHER), await reviewCourseAction(COURSE), await moderateCourseReviewAction(REVIEW)]) {
      expect(r.ok).toBe(false);
    }
    expect(dbCalls).toEqual([]);
  });
});

describe('ADMIN no maestro', () => {
  beforeEach(() => {
    identity.role = 'ADMIN';
    identity.email = 'otro-admin@acierta-test.mx';
  });

  it('NO aprueba profesores (decide quién cobra) y el intento queda en la bitácora', async () => {
    const r = await reviewTeacherAction(TEACHER);
    expect(r).toMatchObject({ ok: false, code: 'FORBIDDEN' });
    expect(dbCalls).toEqual([]);
    expect(auditRows).toEqual([expect.objectContaining({ action: 'teacher.reviewed', outcome: 'rejected' })]);
  });

  it('SÍ modera cursos y reseñas (y queda auditado)', async () => {
    expect((await reviewCourseAction(COURSE)).ok).toBe(true);
    expect((await moderateCourseReviewAction(REVIEW)).ok).toBe(true);
    expect(dbCalls).toEqual(['courses.set:PUBLISHED', 'reviews.hide']);
    expect(auditRows.map((a) => a.outcome)).toEqual(['applied', 'applied']);
  });

  it('id que no es cuid → VALIDATION, auditado, sin base', async () => {
    const r = await reviewCourseAction({ ...COURSE, courseId: "' OR 1=1 --" });
    expect(r).toMatchObject({ ok: false, code: 'VALIDATION' });
    expect(dbCalls).toEqual([]);
    expect(auditRows).toEqual([expect.objectContaining({ outcome: 'rejected' })]);
  });

  it('sin motivo → VALIDATION', async () => {
    expect(await reviewCourseAction({ ...COURSE, reason: 'ok' })).toMatchObject({ code: 'VALIDATION' });
    expect(dbCalls).toEqual([]);
  });
});

describe('ADMIN maestro', () => {
  beforeEach(() => {
    identity.role = 'ADMIN';
    identity.email = 'dueno@acierta-test.mx';
  });

  it('aprueba un profesor en revisión', async () => {
    const r = await reviewTeacherAction(TEACHER);
    expect(r).toMatchObject({ ok: true, data: { status: 'ACTIVE' } });
    expect(dbCalls).toEqual(['teachers.get', 'teachers.set:ACTIVE']);
    expect(auditRows.at(-1)).toMatchObject({ action: 'teacher.reviewed', outcome: 'applied' });
  });

  it('una transición que no aplica (suspender a uno en revisión) se rechaza y se audita', async () => {
    const r = await reviewTeacherAction({ ...TEACHER, decision: 'SUSPEND' });
    expect(r).toMatchObject({ ok: false, code: 'INVALID' });
    expect(dbCalls).toEqual(['teachers.get']);
    expect(auditRows.at(-1)).toMatchObject({ outcome: 'rejected' });
  });

  it('MASTER_ADMIN_EMAILS ausente → cerrado para todos', async () => {
    delete process.env.MASTER_ADMIN_EMAILS;
    expect(await reviewTeacherAction(TEACHER)).toMatchObject({ ok: false, code: 'FORBIDDEN' });
    expect(dbCalls).toEqual([]);
  });
});
