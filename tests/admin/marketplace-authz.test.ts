import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError } from '@/lib/auth/errors';
import { lastClosedWeekStart } from '@/lib/teachers/payout-calculator';
import { addDaysToKey } from '@/lib/teachers/slot-calculator';

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

vi.mock('@/lib/db/payouts', () => ({
  computeWeekPayouts: vi.fn(async () => {
    dbCalls.push('payouts.compute');
    return [{ teacherId: 't', outcome: 'created', payoutId: 'ckpayout00000000000000001', netCents: 50_000 }];
  }),
  applyPayoutDecision: vi.fn(async (_id: string, decision: string) => {
    dbCalls.push(`payouts.${decision}`);
    return { ok: true, teacherId: 't', teacherUserProfileId: 'cku_t', from: 'APPROVED', to: 'TRANSFERRED' };
  }),
}));

const { reviewTeacherAction, reviewCourseAction, moderateCourseReviewAction, computePayoutsAction, payoutDecisionAction } = await import(
  '@/app/actions/admin-marketplace'
);

const TEACHER = { teacherId: 'ckteacher00000000000000001', decision: 'APPROVE', reason: 'CURP y CLABE verificadas' };
const COURSE = { courseId: 'ckcourse0000000000000000a', decision: 'APPROVE', reason: 'Contenido original y claro' };
const REVIEW = { enrollmentId: 'ckenroll0000000000000000a', hidden: true, reason: 'Reseña con datos personales' };
const COMPUTE = { weekStart: '2026-10-12', reason: 'Liquidación semanal' };
const TRANSFER = { payoutId: 'ckpayout00000000000000001', decision: 'MARK_TRANSFERRED', reason: 'SPEI enviado', speiReference: 'MBAN0100261026' };

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
    for (const r of [
      await reviewTeacherAction(TEACHER),
      await reviewCourseAction(COURSE),
      await moderateCourseReviewAction(REVIEW),
      await computePayoutsAction(COMPUTE),
      await payoutDecisionAction(TRANSFER),
    ]) {
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

  it('NO calcula ni mueve liquidaciones (es dinero) y cada intento queda en la bitácora', async () => {
    expect(await computePayoutsAction(COMPUTE)).toMatchObject({ ok: false, code: 'FORBIDDEN' });
    for (const decision of ['APPROVE', 'MARK_TRANSFERRED', 'MARK_FAILED', 'CANCEL', 'FORFEIT_RETENTION']) {
      expect(await payoutDecisionAction({ ...TRANSFER, decision }), decision).toMatchObject({ ok: false, code: 'FORBIDDEN' });
    }
    expect(dbCalls).toEqual([]);
    expect(auditRows.every((a) => a.outcome === 'rejected')).toBe(true);
    expect(auditRows.map((a) => a.action)).toEqual(['payout.computed', ...Array(5).fill('payout.updated')]);
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

  it('calcula una semana cerrada (control positivo) y lo deja auditado con los ids creados', async () => {
    const r = await computePayoutsAction(COMPUTE);
    expect(r).toMatchObject({ ok: true, data: { created: 1, belowMinimum: 0, existing: 0 } });
    expect(auditRows.at(-1)).toMatchObject({ action: 'payout.computed', outcome: 'applied', metadata: { payoutIds: ['ckpayout00000000000000001'] } });
  });

  it('una semana que no ha cerrado, o una fecha que no es lunes, no se calcula', async () => {
    // El lunes de ESTA semana (la que sigue abierta).
    const thisMonday = addDaysToKey(lastClosedWeekStart(new Date()), 7);
    expect(await computePayoutsAction({ ...COMPUTE, weekStart: thisMonday })).toMatchObject({ ok: false, message: 'Esa semana todavía no termina.' });
    expect(await computePayoutsAction({ ...COMPUTE, weekStart: '2026-10-13' })).toMatchObject({ ok: false, code: 'INVALID' });
    expect(dbCalls).toEqual([]);
    expect(auditRows.every((a) => a.outcome === 'rejected')).toBe(true);
  });

  it('marcar como transferida exige una clave de rastreo SPEI válida', async () => {
    for (const speiReference of [undefined, '', '123', "x' OR 1=1", 'A'.repeat(31)]) {
      expect(await payoutDecisionAction({ ...TRANSFER, speiReference }), String(speiReference)).toMatchObject({ ok: false, code: 'VALIDATION' });
    }
    expect(dbCalls).toEqual([]);
    expect(await payoutDecisionAction(TRANSFER)).toMatchObject({ ok: true, data: { status: 'TRANSFERRED' } });
    expect(dbCalls).toEqual(['payouts.MARK_TRANSFERRED']);
    expect(auditRows.at(-1)).toMatchObject({ action: 'payout.updated', outcome: 'applied', metadata: { speiReference: 'MBAN0100261026' } });
  });

  it('campos de más (p. ej. un monto) se rechazan: el monto sale de la base, nunca del cliente', async () => {
    expect(await payoutDecisionAction({ ...TRANSFER, netCents: 1 })).toMatchObject({ ok: false, code: 'VALIDATION' });
    expect(await computePayoutsAction({ ...COMPUTE, teacherId: 'ckteacher00000000000000001' })).toMatchObject({ ok: false, code: 'VALIDATION' });
    expect(dbCalls).toEqual([]);
  });

  it('MASTER_ADMIN_EMAILS ausente → cerrado para todos', async () => {
    delete process.env.MASTER_ADMIN_EMAILS;
    expect(await reviewTeacherAction(TEACHER)).toMatchObject({ ok: false, code: 'FORBIDDEN' });
    expect(dbCalls).toEqual([]);
  });
});
