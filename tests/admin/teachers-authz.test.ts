import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError } from '@/lib/auth/errors';

/**
 * Matriz de autorización de las acciones de administración de PROFESORES
 * (Bloque 2), con el mismo rigor que `authz.test.ts` (G99): la pregunta no es
 * «¿devuelve error?» sino «¿llega a tocar la base?». Roles: anónimo, STUDENT,
 * PARENT, ADMIN no maestro, ADMIN maestro. Y los STUDENT/PARENT figuran EN la
 * lista de maestros, para que lo único que pueda detenerlos sea el rol.
 */

const dbCalls: string[] = [];
const auditRows: Array<Record<string, unknown>> = [];

const identity: { role: string | null; email: string | null } = { role: null, email: null };

vi.mock('@/lib/auth/guards', () => ({
  requireRole: vi.fn(async (allowed: string | string[]) => {
    if (identity.role === null) throw new AuthError('UNAUTHORIZED', 'Debes iniciar sesión para continuar.');
    const roles = Array.isArray(allowed) ? allowed : [allowed];
    if (!roles.includes(identity.role)) throw new AuthError('FORBIDDEN', 'No tienes permiso para acceder a esto.');
    return { authUser: { id: 'auth-uid', email: identity.email }, profile: { id: 'cku0000000000000000000001', role: identity.role } };
  }),
}));

vi.mock('@/lib/db/teachers', () => ({
  getTeacherContact: vi.fn(async () => {
    dbCalls.push('getTeacherContact');
    return { id: 't', userProfileId: 'cku0000000000000000000003', publicName: 'Ana P.', paymentRail: 'ASIMILADOS', csfDocumentUrl: 'uid/a.pdf' };
  }),
  approveTeacher: vi.fn(async () => void dbCalls.push('approveTeacher')),
  suspendTeacher: vi.fn(async () => void dbCalls.push('suspendTeacher')),
  reactivateTeacher: vi.fn(async () => void dbCalls.push('reactivateTeacher')),
  listTeachersAdmin: vi.fn(async () => {
    dbCalls.push('listTeachersAdmin');
    return { rows: [], total: 0, page: 1, pageSize: 25 };
  }),
}));
vi.mock('@/lib/db/classes', () => ({
  listUpcomingCancellableClassIds: vi.fn(async () => {
    dbCalls.push('listUpcoming');
    return ['ckclassaaaaaaaaaaaaaaaaaa1', 'ckclassaaaaaaaaaaaaaaaaaa2'];
  }),
}));
vi.mock('@/lib/classes/cancellation', () => ({
  cancelClassAndRefund: vi.fn(async (input: { classId: string }) => {
    dbCalls.push(`cancel:${input.classId}`);
    if (input.classId.endsWith('2')) throw new Error('Stripe caído');
    return {};
  }),
}));
vi.mock('@/lib/classes/runtime', () => ({ classRuntimeDeps: () => ({}) }));
vi.mock('@/lib/teachers/service', () => ({ teacherDashboardUrl: () => 'https://yaentre.test/profesor' }));
vi.mock('@/lib/db/auth-users', () => ({ getAuthEmail: async () => 'ana@example.com' }));
vi.mock('@/lib/email/client', () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/analytics/server', () => ({ trackServerEvent: async () => undefined }));
vi.mock('@/lib/observability/report', () => ({ reportSilentDegradation: () => undefined, reportControlFailure: () => undefined }));
vi.mock('@/lib/rate-limit/store', () => ({
  consumeRateLimit: vi.fn(async () => ({ allowed: true, hits: 1, retryAfterSecs: 0 })),
}));
vi.mock('@/lib/admin/audit-log', () => ({
  logAdminAction: vi.fn(async (action: string, actor: unknown, details: unknown) => {
    auditRows.push({ action, actor, ...(details as object) });
  }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const actions = await import('@/app/actions/admin-teachers');
const service = await import('@/lib/teachers/admin-service');
const { consumeRateLimit } = await import('@/lib/rate-limit/store');

const TEACHER = 'cku0000000000000000000004';
const REASON = 'Documentos revisados contra la CURP.';

/**
 * El servicio LANZA el `AuthError` de un guard (los Route Handlers lo traducen con
 * `errorResponse`; las Server Actions, con `guarded`). Aquí se traduce igual para
 * poder comparar los cuatro caminos con la misma forma.
 */
async function asResult<T>(fn: () => Promise<{ ok: true; data: T } | { ok: false; code: string; message: string }>) {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AuthError) return { ok: false as const, code: err.code, message: err.message };
    throw err;
  }
}

const STATE_CHANGING = [
  { name: 'approveTeacherAction', run: () => actions.approveTeacherAction({ teacherId: TEACHER, reason: REASON }), dbCall: 'approveTeacher' },
  { name: 'suspendTeacherAction', run: () => actions.suspendTeacherAction({ teacherId: TEACHER, reason: REASON }), dbCall: 'suspendTeacher' },
  { name: 'reactivateTeacherAction', run: () => actions.reactivateTeacherAction({ teacherId: TEACHER, reason: REASON }), dbCall: 'reactivateTeacher' },
  { name: 'resolveCsfPathForAdmin', run: () => asResult(() => service.resolveCsfPathForAdmin({ teacherId: TEACHER })), dbCall: 'getTeacherContact' },
] as const;

const ORIGINAL = process.env.MASTER_ADMIN_EMAILS;
beforeEach(() => {
  dbCalls.length = 0;
  auditRows.length = 0;
  vi.mocked(consumeRateLimit).mockResolvedValue({ allowed: true, hits: 1, retryAfterSecs: 0 });
  process.env.MASTER_ADMIN_EMAILS = 'jefa@yaentre.com';
});
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.MASTER_ADMIN_EMAILS;
  else process.env.MASTER_ADMIN_EMAILS = ORIGINAL;
});

const beAnonymous = () => Object.assign(identity, { role: null, email: null });
const beRole = (role: string, email: string) => Object.assign(identity, { role, email });

describe('sin rol ADMIN, nada toca la base', () => {
  for (const a of STATE_CHANGING) {
    it(`${a.name} — anónimo`, async () => {
      beAnonymous();
      const r = await a.run();
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('UNAUTHORIZED');
      expect(dbCalls).toEqual([]);
    });
    it(`${a.name} — STUDENT (aun estando en MASTER_ADMIN_EMAILS)`, async () => {
      process.env.MASTER_ADMIN_EMAILS = 'jefa@yaentre.com,alumna@acierta-test.mx';
      beRole('STUDENT', 'alumna@acierta-test.mx');
      const r = await a.run();
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('FORBIDDEN');
      expect(dbCalls).toEqual([]);
      expect(auditRows).toEqual([]);
    });
    it(`${a.name} — PARENT (aun estando en MASTER_ADMIN_EMAILS)`, async () => {
      process.env.MASTER_ADMIN_EMAILS = 'jefa@yaentre.com,tutor@acierta-test.mx';
      beRole('PARENT', 'tutor@acierta-test.mx');
      const r = await a.run();
      expect(r.ok).toBe(false);
      expect(dbCalls).toEqual([]);
      expect(auditRows).toEqual([]);
    });
  }
});

describe('ADMIN que NO es maestro: se deniega, no toca la base y el intento queda auditado', () => {
  for (const a of STATE_CHANGING) {
    it(a.name, async () => {
      beRole('ADMIN', 'ayudante@yaentre.com');
      const r = await a.run();
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('FORBIDDEN');
      expect(dbCalls).toEqual([]);
      expect(auditRows).toHaveLength(1);
      expect(auditRows[0]!.outcome).toBe('rejected');
    });
  }
});

describe('MASTER_ADMIN_EMAILS ausente: ni el dueño pasa', () => {
  for (const a of STATE_CHANGING) {
    it(a.name, async () => {
      delete process.env.MASTER_ADMIN_EMAILS;
      beRole('ADMIN', 'jefa@yaentre.com');
      const r = await a.run();
      expect(r.ok).toBe(false);
      expect(dbCalls).toEqual([]);
    });
  }
});

describe('ADMIN maestro: se aplica y queda auditado', () => {
  for (const a of STATE_CHANGING) {
    it(a.name, async () => {
      beRole('ADMIN', 'jefa@yaentre.com');
      const r = await a.run();
      expect(r.ok).toBe(true);
      expect(dbCalls).toContain(a.dbCall);
      expect(auditRows.filter((x) => x.outcome !== 'rejected')).toHaveLength(1);
    });
  }
});

describe('validación y límite de tasa', () => {
  it('un id que no es cuid se rechaza SIN tocar la base y queda auditado', async () => {
    beRole('ADMIN', 'jefa@yaentre.com');
    const r = await actions.approveTeacherAction({ teacherId: "x' OR 1=1 --", reason: REASON });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('VALIDATION');
    expect(dbCalls).toEqual([]);
    expect(auditRows[0]).toMatchObject({ outcome: 'rejected' });
    // Lo que llega a la bitácora está saneado: un id hostil no inyecta nada.
    expect(JSON.stringify(auditRows[0])).not.toContain("'");
  });

  it('sin motivo no se aprueba ni se suspende', async () => {
    beRole('ADMIN', 'jefa@yaentre.com');
    for (const fn of [actions.approveTeacherAction, actions.suspendTeacherAction]) {
      const r = await fn({ teacherId: TEACHER, reason: '' });
      expect(r.ok).toBe(false);
    }
    expect(dbCalls).toEqual([]);
  });

  it('con el límite de tasa agotado se rechaza sin tocar la base', async () => {
    beRole('ADMIN', 'jefa@yaentre.com');
    vi.mocked(consumeRateLimit).mockResolvedValue({ allowed: false, hits: 99, retryAfterSecs: 120 });
    const r = await actions.suspendTeacherAction({ teacherId: TEACHER, reason: REASON });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('RATE_LIMIT');
    expect(dbCalls).toEqual([]);
  });
});

describe('suspender cancela las clases futuras con reembolso', () => {
  it('cancela cada una por separado: una que falla no impide la otra y se CUENTA', async () => {
    beRole('ADMIN', 'jefa@yaentre.com');
    const r = await actions.suspendTeacherAction({ teacherId: TEACHER, reason: REASON });
    expect(r).toEqual({ ok: true, data: { status: 'SUSPENDED', classesCancelled: 1, classesFailed: 1 } });
    expect(dbCalls.filter((c) => c.startsWith('cancel:'))).toHaveLength(2);
    expect(auditRows.at(-1)).toMatchObject({ action: 'teacher.suspended', metadata: { classesCancelled: 1, classesFailed: 1 } });
  });
});

describe('listado', () => {
  it('exige ADMIN pero no maestro', async () => {
    beRole('ADMIN', 'ayudante@yaentre.com');
    await service.listTeachersForAdmin({});
    expect(dbCalls).toContain('listTeachersAdmin');
  });
  it('un STUDENT no lo lee', async () => {
    beRole('STUDENT', 'a@b.mx');
    await expect(service.listTeachersForAdmin({})).rejects.toBeInstanceOf(AuthError);
    expect(dbCalls).toEqual([]);
  });
});
