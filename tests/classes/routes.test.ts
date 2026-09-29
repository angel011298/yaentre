import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError } from '@/lib/auth/errors';

/**
 * Los Route Handlers del marketplace, ejecutados de verdad con guards y capa de
 * datos simulados. Lo que se comprueba: quién puede llamar, qué se serializa y
 * que un error interno nunca filtra su mensaje.
 */

const h = vi.hoisted(() => ({
  marketplaceOpen: true,
  role: 'STUDENT' as string | null,
  premium: { expiresAt: new Date('2027-06-01T00:00:00Z'), stripeCustomerId: 'cus_1' } as null | object,
  rateAllowed: true,
  teacher: null as null | Record<string, unknown>,
  bookCalls: [] as unknown[],
  cancelCalls: [] as unknown[],
  bookThrows: null as null | Error,
  reports: [] as string[],
}));

vi.mock('@/lib/marketplace/marketplace-gate', () => ({ marketplaceGate: () => ({ open: h.marketplaceOpen }) }));
vi.mock('@/lib/auth/guards', () => ({
  requireVerifiedUser: async () => {
    if (h.role === null) throw new AuthError('UNAUTHORIZED', 'Debes iniciar sesión para continuar.');
    return {
      authUser: { id: 'auth-1', email: 'a@example.com' },
      profile: { id: 'ckstudent0001', role: h.role, birthDate: new Date('2000-01-01T00:00:00Z') },
    };
  },
  requireTeacher: async () => {
    throw new AuthError('FORBIDDEN', 'No tienes un perfil de profesor activo en YaEntre.');
  },
}));
vi.mock('@/lib/rate-limit/store', () => ({ consumeRateLimit: async () => ({ allowed: h.rateAllowed }) }));
vi.mock('@/lib/observability/report', () => ({
  reportSilentDegradation: (area: string) => h.reports.push(area),
  reportControlFailure: (c: string) => h.reports.push(c),
}));
vi.mock('@/lib/db/classes', () => ({
  getActivePremium: async () => h.premium,
  getTeacherForBooking: async () => h.teacher,
  listStudentClasses: async () => [{ id: 'c1' }],
  getStudentClass: async () => null,
}));
vi.mock('@/lib/classes/booking', () => ({
  bookClass: async (...args: unknown[]) => {
    h.bookCalls.push(args);
    if (h.bookThrows) throw h.bookThrows;
    return { status: 'PROCESSING', classId: 'c1', priceCents: 30000 };
  },
}));
vi.mock('@/lib/classes/cancellation', () => ({
  cancelClassAndRefund: async (input: unknown) => {
    h.cancelCalls.push(input);
    return { refundCents: 100 };
  },
}));
vi.mock('@/lib/classes/runtime', () => ({ classRuntimeDeps: () => ({}) }));
vi.mock('@/lib/stripe/client', () => ({ getStripe: () => ({}) }));
vi.mock('@/lib/db/teachers', () => ({ listDirectory: async () => ({ items: [] }), getPublicTeacher: async () => null }));

const list = await import('@/app/api/classes/route');
const directory = await import('@/app/api/classes/teachers/route');
const quote = await import('@/app/api/classes/calculate-tariff/route');
const book = await import('@/app/api/classes/book/route');
const cancel = await import('@/app/api/classes/[id]/cancel/route');
const one = await import('@/app/api/classes/[id]/route');
const teacherMe = await import('@/app/api/teachers/me/route');

const post = (body: unknown) =>
  new Request('http://localhost/x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) as never;
const get = (url = 'http://localhost/x') => new Request(url) as never;
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const CLASS_ID = 'ckclassid0000000000000001';

const validBook = {
  teacherId: 'ckteacher0000000000000001',
  subjectKey: 'matematicas',
  scheduledAt: '2026-10-07T23:00:00Z',
  durationMinutes: 50,
  recordingConsent: false,
  expectedPriceCents: 30000,
};

beforeEach(() => {
  h.marketplaceOpen = true;
  h.role = 'STUDENT';
  h.premium = { expiresAt: new Date('2027-06-01T00:00:00Z'), stripeCustomerId: 'cus_1' };
  h.rateAllowed = true;
  h.teacher = null;
  h.bookCalls.length = 0;
  h.cancelCalls.length = 0;
  h.bookThrows = null;
  h.reports.length = 0;
});

describe('interruptor y sesión', () => {
  it('con el marketplace cerrado, directorio/cotizar/reservar responden 503 y NO llegan al manejador', async () => {
    h.marketplaceOpen = false;
    expect((await directory.GET(get())).status).toBe(503);
    expect((await quote.POST(post({}))).status).toBe(503);
    const res = await book.POST(post(validBook));
    expect(res.status).toBe(503);
    expect(h.bookCalls).toEqual([]);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('con el marketplace cerrado el alumno aún puede VER y CANCELAR sus clases', async () => {
    h.marketplaceOpen = false;
    expect((await list.GET(get())).status).toBe(200);
    const res = await cancel.POST(post({}), params(CLASS_ID));
    expect(res.status).toBe(200);
    expect(h.cancelCalls).toHaveLength(1);
  });

  it('sin sesión → 401', async () => {
    h.role = null;
    expect((await list.GET(get())).status).toBe(401);
  });

  it('una cuenta que no es de alumno (p. ej. tutor) no reserva → 403', async () => {
    h.role = 'PARENT';
    const res = await book.POST(post(validBook));
    expect(res.status).toBe(403);
    expect(h.bookCalls).toEqual([]);
  });

  it('sin Premium el directorio responde 402', async () => {
    h.premium = null;
    expect((await directory.GET(get())).status).toBe(402);
  });

  it('el límite de tasa devuelve 429', async () => {
    h.rateAllowed = false;
    expect((await directory.GET(get())).status).toBe(429);
  });

  it('un profesor no activo no entra a las rutas de profesor → 403', async () => {
    expect((await teacherMe.GET(get())).status).toBe(403);
  });
});

describe('el cuerpo: estricto y sin identificadores de persona', () => {
  it('reservar con un precio o un id de alumno de más se RECHAZA (400), no se ignora', async () => {
    for (const extra of [{ priceCents: 1 }, { studentProfileId: 'ckotro' }, { userProfileId: 'ckotro' }]) {
      const res = await book.POST(post({ ...validBook, ...extra }));
      expect(res.status).toBe(400);
    }
    expect(h.bookCalls).toEqual([]);
  });

  it('reservar SIN el precio que el alumno vio se rechaza', async () => {
    const { expectedPriceCents: _omit, ...rest } = validBook;
    void _omit;
    expect((await book.POST(post(rest))).status).toBe(400);
  });

  it('una fecha sin zona horaria se rechaza (el servidor la leería como UTC)', async () => {
    expect((await book.POST(post({ ...validBook, scheduledAt: '2026-10-07T17:00:00' }))).status).toBe(400);
  });

  it('una duración que no sea 50 u 80 se rechaza', async () => {
    expect((await book.POST(post({ ...validBook, durationMinutes: 60 }))).status).toBe(400);
  });

  it('un cuerpo que no es JSON se rechaza sin lanzar', async () => {
    const bad = new Request('http://localhost/x', { method: 'POST', body: 'no json' }) as never;
    expect((await book.POST(bad)).status).toBe(400);
  });

  it('una reserva válida pasa el alumno DEL GUARD, no del cuerpo, y responde 202', async () => {
    const res = await book.POST(post(validBook));
    expect(res.status).toBe(202);
    const [student, req] = h.bookCalls[0] as [{ profileId: string }, Record<string, unknown>];
    expect(student.profileId).toBe('ckstudent0001');
    expect(Object.keys(req)).not.toContain('studentProfileId');
  });
});

describe('cotizar: el alumno ve solo el precio (§5.0)', () => {
  it('la respuesta trae únicamente priceCents — ni fórmula, ni multiplicadores, ni comisión', async () => {
    h.teacher = {
      id: 'ckteacher0000000000000001',
      level: 'INICIAL',
      availability: [{ weekday: 3, startMinute: 480, endMinute: 1320 }],
      subjects: ['matematicas'],
    };
    // Miércoles 17:00 México; la hora actual real es anterior, así que hay anticipación.
    const when = new Date(Date.now() + 60 * 24 * 3_600_000);
    while (when.getUTCDay() !== 3) when.setUTCDate(when.getUTCDate() + 1);
    when.setUTCHours(23, 0, 0, 0);

    const res = await quote.POST(
      post({ teacherId: 'ckteacher0000000000000001', subjectKey: 'matematicas', scheduledAt: when.toISOString(), durationMinutes: 50 })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Object.keys(body.data)).toEqual(['priceCents']);
    expect(JSON.stringify(body)).not.toMatch(/multiplier|commission|comision|level|demand|capped|base/i);
  });
});

describe('errores internos', () => {
  it('un error inesperado es un 500 GENÉRICO: el mensaje real no sale al cliente y se reporta', async () => {
    h.bookThrows = new Error('connection to db-prod-xyz refused, password=hunter2');
    const res = await book.POST(post(validBook));
    expect(res.status).toBe(500);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain('hunter2');
    expect(text).not.toContain('db-prod');
    expect(h.reports).toContain('marketplace_api');
  });
});

describe('clase ajena', () => {
  it('un id que no es del alumno es 404 (no confirma que exista)', async () => {
    expect((await one.GET(get(), params(CLASS_ID))).status).toBe(404);
  });

  it('un id con forma inválida es 404 antes de tocar la base', async () => {
    expect((await one.GET(get(), params("1'; DROP TABLE"))).status).toBe(404);
  });
});
