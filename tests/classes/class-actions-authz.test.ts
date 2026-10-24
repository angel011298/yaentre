import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * G103 — autorización de las acciones de clase que MUEVEN DINERO (cancelar con
 * reembolso, marcar impartida → entra a la liquidación) y del alta de
 * profesor, llamadas directo (como un `fetch` a la Server Action). IDOR: el
 * dueño sale de la SESIÓN; un id ajeno no encuentra la clase, ni aunque el
 * cuerpo diga de quién es. Se mide por efecto: ¿se reembolsó?, ¿se marcó?
 */

const effects: string[] = [];
const who: { profileId: string | null; teacherId: string | null; teacherActive: boolean } = { profileId: null, teacherId: null, teacherActive: true };

const CLASS_A = {
  id: 'ckclass00000000000000000a',
  studentProfileId: 'cku_alumna_a',
  teacherId: 'ckteacher_a',
  status: 'BOOKED',
  paidAt: new Date('2026-10-01T00:00:00Z'),
  stripePaymentId: 'pi_a',
  finalTariffCents: 40_000,
  durationMinutes: 50,
  scheduledAt: new Date('2026-12-01T16:00:00Z'),
};

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/lib/auth/guards', async () => {
  const { AuthError } = await import('@/lib/auth/errors');
  const user = async () => {
    if (!who.profileId) throw new AuthError('UNAUTHORIZED', 'Debes iniciar sesión para continuar.');
    return { authUser: { email: 'x@acierta-test.mx', email_confirmed_at: '2026-10-01' }, profile: { id: who.profileId, role: 'STUDENT' } };
  };
  return { requireUser: vi.fn(user), requireVerifiedForPurchase: vi.fn(user) };
});

vi.mock('@/lib/teachers/guard', async () => {
  const { AuthError } = await import('@/lib/auth/errors');
  return {
    requireTeacher: vi.fn(async (opts: { active?: boolean } = {}) => {
      if (!who.profileId) throw new AuthError('UNAUTHORIZED', 'Debes iniciar sesión para continuar.');
      if (!who.teacherId) throw new AuthError('FORBIDDEN', 'No tienes un perfil de profesor.');
      if (opts.active && !who.teacherActive) throw new AuthError('FORBIDDEN', 'Tu perfil de profesor todavía no está activo.');
      return { profile: { id: who.profileId }, teacher: { id: who.teacherId, status: who.teacherActive ? 'ACTIVE' : 'SUSPENDED' } };
    }),
  };
});

vi.mock('@/lib/rate-limit/store', () => ({ consumeRateLimit: vi.fn(async () => ({ allowed: true, hits: 1, retryAfterSecs: 0 })) }));

vi.mock('@/lib/db/classes', () => ({
  // Las consultas reales filtran por (id, dueño); el doble hace lo mismo.
  getClassForStudent: vi.fn(async (id: string, studentProfileId: string) =>
    id === CLASS_A.id && studentProfileId === CLASS_A.studentProfileId ? { ...CLASS_A } : null
  ),
  getClassForTeacher: vi.fn(async (id: string, teacherId: string) => (id === CLASS_A.id && teacherId === CLASS_A.teacherId ? { ...CLASS_A } : null)),
  markClassCancelled: vi.fn(async (id: string, input: { by: string }) => effects.push(`cancel:${input.by}:${id}`)),
  markClassCompleted: vi.fn(async (id: string) => {
    effects.push(`complete:${id}`);
    return true;
  }),
}));

vi.mock('@/lib/stripe/client', () => ({
  getStripe: () => ({ refunds: { create: async (p: { payment_intent: string }) => (effects.push(`refund:${p.payment_intent}`), { id: 're_1' }) } }),
}));

vi.mock('@/lib/db/teachers', () => ({
  submitTeacherApplication: vi.fn(async (profileId: string) => {
    effects.push(`apply:${profileId}`);
    return { status: 'PENDING_REVIEW' };
  }),
  TeacherError: class TeacherError extends Error {},
}));

const { cancelClassByStudentAction, cancelClassByTeacherAction, completeClassAction } = await import('@/app/actions/classes');
const { applyAsTeacherAction } = await import('@/app/actions/teachers');

const ENV = { ...process.env };
beforeEach(() => {
  effects.length = 0;
  who.profileId = null;
  who.teacherId = null;
  who.teacherActive = true;
  process.env.FEATURE_TEACHER_AVAILABILITY = 'true';
  delete process.env.VERCEL_ENV;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-20T16:00:00Z')); // 11 días antes de la clase
});
afterEach(() => {
  vi.useRealTimers();
  process.env = { ...ENV };
});

describe('cancelar como alumno (reembolso total)', () => {
  it('sin sesión: nada', async () => {
    expect((await cancelClassByStudentAction({ classSessionId: CLASS_A.id })).ok).toBe(false);
    expect(effects).toEqual([]);
  });

  it('IDOR: otra alumna no encuentra la clase, ni diciendo en el cuerpo de quién es', async () => {
    who.profileId = 'cku_alumna_b';
    expect(await cancelClassByStudentAction({ classSessionId: CLASS_A.id })).toMatchObject({ ok: false, code: 'NOT_FOUND' });
    expect(await cancelClassByStudentAction({ classSessionId: CLASS_A.id, studentProfileId: CLASS_A.studentProfileId })).toMatchObject({ ok: false, code: 'VALIDATION' });
    expect(effects).toEqual([]);
  });

  it('a menos de 24 h ya no se cancela desde la app', async () => {
    who.profileId = CLASS_A.studentProfileId;
    vi.setSystemTime(new Date(CLASS_A.scheduledAt.getTime() - 23 * 3_600_000));
    expect(await cancelClassByStudentAction({ classSessionId: CLASS_A.id })).toMatchObject({ ok: false, code: 'TOO_LATE' });
    expect(effects).toEqual([]);
  });

  it('control positivo: la dueña cancela con anticipación → reembolso y cancelación', async () => {
    who.profileId = CLASS_A.studentProfileId;
    expect(await cancelClassByStudentAction({ classSessionId: CLASS_A.id })).toMatchObject({ ok: true });
    expect(effects).toEqual(['refund:pi_a', `cancel:STUDENT:${CLASS_A.id}`]);
  });
});

describe('cancelar o marcar impartida como profesor', () => {
  it('un alumno sin perfil de profesor: nada', async () => {
    who.profileId = 'cku_alumna_b';
    expect((await cancelClassByTeacherAction({ classSessionId: CLASS_A.id })).ok).toBe(false);
    expect((await completeClassAction({ classSessionId: CLASS_A.id })).ok).toBe(false);
    expect(effects).toEqual([]);
  });

  it('IDOR: otro profesor no encuentra la clase', async () => {
    who.profileId = 'cku_profe_b';
    who.teacherId = 'ckteacher_b';
    expect(await cancelClassByTeacherAction({ classSessionId: CLASS_A.id })).toMatchObject({ code: 'NOT_FOUND' });
    vi.setSystemTime(new Date(CLASS_A.scheduledAt.getTime() + 2 * 3_600_000));
    expect(await completeClassAction({ classSessionId: CLASS_A.id })).toMatchObject({ code: 'NOT_FOUND' });
    expect(effects).toEqual([]);
  });

  it('no se marca impartida antes de que termine, ni con el perfil suspendido', async () => {
    who.profileId = 'cku_profe_a';
    who.teacherId = CLASS_A.teacherId;
    expect(await completeClassAction({ classSessionId: CLASS_A.id })).toMatchObject({ code: 'TOO_EARLY' });
    vi.setSystemTime(new Date(CLASS_A.scheduledAt.getTime() + 2 * 3_600_000));
    who.teacherActive = false;
    expect((await completeClassAction({ classSessionId: CLASS_A.id })).ok).toBe(false);
    expect(effects).toEqual([]);
  });

  it('control positivo: el dueño la marca impartida al terminar (entra a la liquidación)', async () => {
    who.profileId = 'cku_profe_a';
    who.teacherId = CLASS_A.teacherId;
    vi.setSystemTime(new Date(CLASS_A.scheduledAt.getTime() + 2 * 3_600_000));
    expect(await completeClassAction({ classSessionId: CLASS_A.id })).toMatchObject({ ok: true });
    expect(effects).toEqual([`complete:${CLASS_A.id}`]);
  });

  it('con la bandera apagada, ninguna acción hace nada', async () => {
    delete process.env.FEATURE_TEACHER_AVAILABILITY;
    who.profileId = CLASS_A.studentProfileId;
    expect(await cancelClassByStudentAction({ classSessionId: CLASS_A.id })).toMatchObject({ code: 'NOT_FOUND' });
    expect(effects).toEqual([]);
  });
});

describe('alta de profesor', () => {
  const APP = {
    displayName: 'Profa. Ana',
    fullName: 'Ana Pérez García',
    curp: 'PEGA800101MDFRRN09',
    phone: '5512345678',
    clabe: '012180015812345678',
    bankName: 'BBVA',
    canInvoice: false,
    subjects: [{ subjectKey: 'matematicas', track: 'ADMISION' }],
    acceptContract: true,
    acceptNda: true,
    acceptRecording: true,
  };

  it('el perfil es el de la SESIÓN; un userProfileId en el cuerpo se rechaza', async () => {
    who.profileId = 'cku_aspirante';
    const r = await applyAsTeacherAction({ ...APP, userProfileId: 'cku_otra' } as never);
    expect(r.ok).toBe(false);
    expect(effects).toEqual([]);
  });

  it('control positivo: la solicitud válida se guarda a nombre del perfil de la sesión', async () => {
    who.profileId = 'cku_aspirante';
    expect(await applyAsTeacherAction(APP as never)).toMatchObject({ ok: true, data: { status: 'PENDING_REVIEW' } });
    expect(effects).toEqual(['apply:cku_aspirante']);
  });

  it('en producción, con los textos TODO-CLO, no se da de alta a nadie', async () => {
    who.profileId = 'cku_aspirante';
    process.env.VERCEL_ENV = 'production';
    expect(await applyAsTeacherAction(APP as never)).toMatchObject({ ok: false, code: 'LEGAL_PENDING' });
    expect(effects).toEqual([]);
  });
});
