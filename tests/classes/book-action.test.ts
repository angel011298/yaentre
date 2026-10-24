import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * G103 — `bookClassAction` llamada DIRECTAMENTE (como lo haría un `fetch` a la
 * ruta de la Server Action, sin pasar por ninguna pantalla). La pregunta no es
 * «¿devuelve error?», sino «¿llegó a apartar el horario o a tocar Stripe?»: los
 * dobles registran cada llamada y los caminos denegados exigen el registro
 * VACÍO. Con controles positivos: con Premium (o en regularización) SÍ llega.
 */

const calls: string[] = [];
const state = { premium: false, verified: true, teacherOwner: 'cku_teacher_owner' };
let heldWith: Record<string, unknown> | null = null;

vi.mock('@/lib/auth/guards', async () => {
  const { AuthError } = await import('@/lib/auth/errors');
  return {
    requireVerifiedForPurchase: vi.fn(async () => {
      calls.push('guard');
      if (!state.verified) throw new AuthError('UNAUTHORIZED', 'Verifica tu correo.');
      return { authUser: { email: 'alumna@acierta-test.mx' }, profile: { id: 'cku_student_1' } };
    }),
    requireUser: vi.fn(async () => ({ authUser: {}, profile: { id: 'cku_student_1' } })),
  };
});

vi.mock('@/lib/db/premium-access', () => ({
  hasPremiumAccess: vi.fn(async () => {
    calls.push('premium?');
    return state.premium;
  }),
}));

vi.mock('@/lib/rate-limit/store', () => ({
  consumeRateLimit: vi.fn(async () => ({ allowed: true, hits: 1, retryAfterSecs: 0 })),
}));

const NOW = new Date('2026-10-26T14:00:00Z'); // lunes 08:00 CDMX
const SLOT = '2026-11-02T15:00:00.000Z'; // lunes 2-nov 09:00 CDMX

vi.mock('@/lib/db/classes', () => ({
  HOLD_MINUTES: 31,
  getBookableTeacher: vi.fn(async (_id: string, track: string) => {
    calls.push(`teacher:${track}`);
    return {
      id: 'ckteacher00000000000000001',
      userProfileId: state.teacherOwner,
      status: 'ACTIVE',
      level: 'VERIFICADO',
      displayName: 'Prof. Ana',
      subjects: [{ subjectKey: track === 'REGULARIZACION' ? 'reg_matematicas' : 'matematicas' }],
    };
  }),
  loadSlotInputs: vi.fn(async () => ({
    availability: [{ dayOfWeek: 1, startTime: '09:00', endTime: '11:00' }],
    blockedDates: [],
    bookings: [],
  })),
  createClassHold: vi.fn(async (input: Record<string, unknown>) => {
    calls.push('hold');
    heldWith = input;
    return { ok: true, replay: false, classSession: { id: 'ckclass0000000000000000001', status: 'PENDING_PAYMENT', paidAt: null } };
  }),
  attachPaymentRefs: vi.fn(async () => undefined),
  releaseHold: vi.fn(async () => {
    calls.push('release');
  }),
  findStudentStripeCustomerId: vi.fn(async () => 'cus_known'),
  getClassForStudent: vi.fn(),
  getClassForTeacher: vi.fn(),
  markClassCancelled: vi.fn(),
  markClassCompleted: vi.fn(),
}));

vi.mock('@/lib/stripe/client', () => ({
  getStripe: () => ({
    customers: { create: async () => ({ id: 'cus_new' }) },
    paymentMethods: {
      list: async () => {
        calls.push('stripe.paymentMethods.list');
        return { data: [] };
      },
    },
    paymentIntents: { create: async () => ({ id: 'pi_x', status: 'succeeded' }) },
    checkout: {
      sessions: {
        create: async (p: Record<string, unknown>) => {
          calls.push('stripe.checkout.create');
          return { id: 'cs_test_x', url: 'https://checkout.stripe.test/x', ...p };
        },
      },
    },
  }),
}));

const { bookClassAction } = await import('@/app/actions/classes');

function input(over: Record<string, unknown> = {}) {
  return {
    teacherId: 'ckteacher00000000000000001',
    subjectKey: 'matematicas',
    track: 'ADMISION' as const,
    startsAt: SLOT,
    durationMinutes: 50 as const,
    idempotencyKey: '11111111-1111-4111-8111-111111111111',
    adultDeclared: true as const,
    ...over,
  };
}

const ENV = { ...process.env };
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  calls.length = 0;
  heldWith = null;
  state.premium = false;
  state.verified = true;
  state.teacherOwner = 'cku_teacher_owner';
  process.env.SALES_OPEN = 'true';
  process.env.VERCEL_ENV = 'preview';
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  process.env.FEATURE_TEACHER_AVAILABILITY = 'true';
  process.env.FEATURE_REGULARIZACION = 'true';
});
afterEach(() => {
  vi.useRealTimers();
  process.env = { ...ENV };
});

describe('cerrado: no aparta ni cobra', () => {
  it('venta cerrada → SALES_CLOSED antes de la identidad', async () => {
    delete process.env.SALES_OPEN;
    const r = await bookClassAction(input());
    expect(r).toMatchObject({ ok: false, code: 'SALES_CLOSED' });
    expect(calls).toEqual([]);
  });

  it('bandera de clases apagada → NOT_FOUND sin tocar nada', async () => {
    delete process.env.FEATURE_TEACHER_AVAILABILITY;
    const r = await bookClassAction(input());
    expect(r).toMatchObject({ ok: false, code: 'NOT_FOUND' });
    expect(calls).toEqual([]);
  });

  it('en producción, con el texto de la declaración TODO-CLO, la reserva se cierra', async () => {
    process.env.VERCEL_ENV = 'production';
    process.env.STRIPE_SECRET_KEY = 'sk_live_dummy';
    const r = await bookClassAction(input());
    expect(r).toMatchObject({ ok: false, code: 'LEGAL_PENDING' });
    expect(calls).not.toContain('hold');
  });
});

describe('pista ADMISION: Premium es requisito DEL SERVIDOR', () => {
  it('sin Premium, llamando la acción directo → PREMIUM_REQUIRED y ningún apartado', async () => {
    const r = await bookClassAction(input());
    expect(r).toMatchObject({ ok: false, code: 'PREMIUM_REQUIRED' });
    expect(calls).not.toContain('hold');
    expect(calls.some((c) => c.startsWith('stripe'))).toBe(false);
  });

  it('control positivo: con Premium SÍ aparta y lanza el cobro', async () => {
    state.premium = true;
    const r = await bookClassAction(input());
    expect(r.ok).toBe(true);
    expect(calls).toContain('hold');
    expect(calls).toContain('stripe.checkout.create');
  });
});

describe('pista REGULARIZACION: abierta sin plan', () => {
  it('sin Premium SÍ se reserva', async () => {
    const r = await bookClassAction(input({ track: 'REGULARIZACION', subjectKey: 'reg_matematicas' }));
    expect(r.ok).toBe(true);
    expect(calls).toContain('hold');
    expect(calls).not.toContain('premium?');
  });

  it('con la bandera de regularización apagada, no', async () => {
    delete process.env.FEATURE_REGULARIZACION;
    const r = await bookClassAction(input({ track: 'REGULARIZACION', subjectKey: 'reg_matematicas' }));
    expect(r).toMatchObject({ ok: false, code: 'TRACK_DISABLED' });
    expect(calls).not.toContain('hold');
  });
});

describe('el cliente no decide nada que cueste dinero', () => {
  it('sin la declaración de mayoría de edad → no aparta', async () => {
    state.premium = true;
    const r = await bookClassAction(input({ adultDeclared: false }));
    expect(r.ok).toBe(false);
    expect(calls).not.toContain('hold');
  });

  it('campos de más (monto, id de alumno, código) → rechazo de validación', async () => {
    state.premium = true;
    for (const extra of [{ priceCents: 1 }, { studentProfileId: 'cku_otra' }, { referralCode: 'X' }]) {
      calls.length = 0;
      const r = await bookClassAction(input(extra));
      expect(r.ok, JSON.stringify(extra)).toBe(false);
      expect(calls).not.toContain('hold');
    }
  });

  it('un horario que el servidor no ofrece (fuera de disponibilidad o < 4 h) → SLOT_TAKEN sin apartar', async () => {
    state.premium = true;
    for (const startsAt of ['2026-11-02T15:10:00.000Z', '2026-10-26T15:00:00.000Z', '2026-11-03T15:00:00.000Z']) {
      calls.length = 0;
      const r = await bookClassAction(input({ startsAt }));
      expect(r, startsAt).toMatchObject({ ok: false, code: 'SLOT_TAKEN' });
      expect(calls).not.toContain('hold');
    }
  });

  it('la tarifa del apartado la calcula el servidor con el tabulador (Verificado, 50 min, ≥ 48 h, diurno)', async () => {
    state.premium = true;
    await bookClassAction(input());
    const tariff = (heldWith as unknown as { tariff: { finalCents: number }; split: { teacherCents: number; yaentreCents: number } });
    expect(tariff.tariff.finalCents).toBe(Math.round(30_000 * 1.15));
    expect(tariff.split.teacherCents + tariff.split.yaentreCents).toBe(tariff.tariff.finalCents);
    expect(tariff.split.yaentreCents).toBe(Math.round(30_000 * 1.15) - Math.round(30_000 * 1.15 * 0.75));
  });

  it('un profesor no puede reservarse a sí mismo', async () => {
    state.premium = true;
    state.teacherOwner = 'cku_student_1';
    const r = await bookClassAction(input());
    expect(r.ok).toBe(false);
    expect(calls).not.toContain('hold');
  });
});
