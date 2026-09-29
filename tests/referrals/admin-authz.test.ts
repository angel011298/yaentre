import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError } from '@/lib/auth/errors';

/**
 * Matriz de autorización de la administración de REFERIDOS (Bloque 3), con el
 * mismo rigor que `teachers-authz.test.ts`: la pregunta no es «¿devuelve error?»
 * sino «¿llega a tocar la base?». Roles: anónimo, STUDENT, PARENT, ACCOUNTANT,
 * SUPPORT, ADMIN no maestro, ADMIN maestro — y todos los que no son ADMIN figuran
 * EN la lista de maestros, para que lo único que pueda detenerlos sea el rol.
 */

const dbCalls: string[] = [];
const order: string[] = [];
const ids: string[] = [];
const auditRows: Array<Record<string, any>> = []; // eslint-disable-line @typescript-eslint/no-explicit-any
let dbResult: { ok: true } | { ok: false; code: string; message: string } = { ok: true };
let dbThrows = false;

const identity: { role: string | null; email: string | null } = { role: null, email: null };

vi.mock('@/lib/auth/guards', () => ({
  requireRole: vi.fn(async (allowed: string | string[]) => {
    if (identity.role === null) throw new AuthError('UNAUTHORIZED', 'Debes iniciar sesión para continuar.');
    const roles = Array.isArray(allowed) ? allowed : [allowed];
    if (!roles.includes(identity.role)) throw new AuthError('FORBIDDEN', 'No tienes permiso para acceder a esto.');
    return { authUser: { id: 'auth-uid', email: identity.email }, profile: { id: 'cku0000000000000000000001', role: identity.role } };
  }),
}));
vi.mock('@/lib/db/referrals', () => ({
  suspendReferralCode: vi.fn(async (id: string) => {
    ids.push(id);
    dbCalls.push('suspend');
    order.push('db');
    if (dbThrows) throw new Error('db down');
    return dbResult;
  }),
  reinstateReferralCode: vi.fn(async (id: string) => {
    ids.push(id);
    dbCalls.push('reinstate');
    order.push('db');
    if (dbThrows) throw new Error('db down');
    return dbResult;
  }),
  resolveFraudFlag: vi.fn(async (id: string) => {
    ids.push(id);
    dbCalls.push('resolve');
    order.push('db');
    if (dbThrows) throw new Error('db down');
    return dbResult;
  }),
  listReferrers: vi.fn(async () => {
    dbCalls.push('listReferrers');
    return [];
  }),
  listFraudAlerts: vi.fn(async () => {
    dbCalls.push('listFraud');
    return [];
  }),
}));
vi.mock('@/lib/observability/report', () => ({ reportSilentDegradation: () => undefined, reportControlFailure: () => undefined }));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), withScope: vi.fn() }));
vi.mock('@/lib/rate-limit/store', () => ({ consumeRateLimit: vi.fn(async () => ({ allowed: true, hits: 1, retryAfterSecs: 0 })) }));
vi.mock('@/lib/admin/audit-log', () => ({
  logAdminAction: vi.fn(async (action: string, actor: unknown, details: unknown) => {
    // La escritura real tarda: si alguien deja de ESPERARLA, la fila llegaría después de la respuesta.
    await new Promise((resolve) => setTimeout(resolve, 5));
    order.push('audit');
    auditRows.push({ action, actor, ...(details as object) });
  }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const actions = await import('@/app/actions/admin-referrals');
const service = await import('@/lib/referrals/admin-service');
const listRoute = await import('@/app/api/admin/referrals/route');
const fraudRoute = await import('@/app/api/admin/referrals/fraud/route');
const suspendRoute = await import('@/app/api/admin/referrals/[id]/suspend/route');
const reinstateRoute = await import('@/app/api/admin/referrals/[id]/reinstate/route');
const resolveRoute = await import('@/app/api/admin/referrals/[id]/resolve-flag/route');
const { consumeRateLimit } = await import('@/lib/rate-limit/store');

const CODE = 'cku0000000000000000000004';
const SALE = 'cku0000000000000000000005';
const REASON = 'Revisado contra el historial de compras.';

const beAnonymous = () => Object.assign(identity, { role: null, email: null });
const beRole = (role: string, email: string) => Object.assign(identity, { role, email });

const ORIGINAL = process.env.MASTER_ADMIN_EMAILS;
beforeEach(() => {
  dbCalls.length = 0;
  ids.length = 0;
  order.length = 0;
  auditRows.length = 0;
  dbResult = { ok: true };
  dbThrows = false;
  vi.mocked(consumeRateLimit).mockResolvedValue({ allowed: true, hits: 1, retryAfterSecs: 0 });
  // Todos los roles NO admin figuran como maestros: solo el rol puede detenerlos.
  process.env.MASTER_ADMIN_EMAILS = 'jefa@yaentre.com,student@x.mx,parent@x.mx,conta@x.mx,soporte@x.mx';
});
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.MASTER_ADMIN_EMAILS;
  else process.env.MASTER_ADMIN_EMAILS = ORIGINAL;
});

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const post = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });

const WRITES = [
  { name: 'suspendReferralAction', action: () => actions.suspendReferralAction({ referralId: CODE, reason: REASON }), db: 'suspend', audit: 'referral.suspended' },
  { name: 'reinstateReferralAction', action: () => actions.reinstateReferralAction({ referralId: CODE, reason: REASON }), db: 'reinstate', audit: 'referral.reinstated' },
  { name: 'resolveReferralFlagAction (CLEAR)', action: () => actions.resolveReferralFlagAction({ saleId: SALE, decision: 'CLEAR', reason: REASON }), db: 'resolve', audit: 'referral.flag_resolved' },
  { name: 'resolveReferralFlagAction (CONFIRM)', action: () => actions.resolveReferralFlagAction({ saleId: SALE, decision: 'CONFIRM', reason: REASON }), db: 'resolve', audit: 'referral.flag_resolved' },
] as const;

describe('escrituras — solo el admin MAESTRO, y ningún otro llega a la base', () => {
  for (const w of WRITES) {
    it(`${w.name} — anónimo → UNAUTHORIZED, sin base ni bitácora`, async () => {
      beAnonymous();
      expect(await w.action()).toMatchObject({ ok: false, code: 'UNAUTHORIZED' });
      expect(dbCalls).toEqual([]);
      expect(auditRows).toEqual([]);
    });

    for (const [role, email] of [
      ['STUDENT', 'student@x.mx'],
      ['PARENT', 'parent@x.mx'],
      ['ACCOUNTANT', 'conta@x.mx'],
      ['SUPPORT', 'soporte@x.mx'],
    ] as const) {
      it(`${w.name} — ${role} (aunque su correo esté en la lista de maestros) → FORBIDDEN, sin base`, async () => {
        beRole(role, email);
        expect(await w.action()).toMatchObject({ ok: false, code: 'FORBIDDEN' });
        expect(dbCalls).toEqual([]);
      });
    }

    it(`${w.name} — ADMIN no maestro → FORBIDDEN, sin base, y el intento QUEDA en la bitácora`, async () => {
      beRole('ADMIN', 'otro-admin@yaentre.com');
      expect(await w.action()).toMatchObject({ ok: false, code: 'FORBIDDEN' });
      expect(dbCalls).toEqual([]);
      expect(auditRows).toHaveLength(1);
      expect(auditRows[0]).toMatchObject({ action: w.audit, outcome: 'rejected', targetKind: 'referral' });
    });

    it(`${w.name} — ADMIN maestro → aplica y deja fila 'applied' ANTES de responder`, async () => {
      beRole('ADMIN', 'jefa@yaentre.com');
      expect(await w.action()).toEqual({ ok: true, data: { applied: true } });
      expect(dbCalls).toEqual([w.db]);
      expect(auditRows).toHaveLength(1);
      expect(auditRows[0]).toMatchObject({ action: w.audit, outcome: 'applied', reason: REASON });
      expect(order).toEqual(['db', 'audit']);
    });

    it(`${w.name} — si la operación se rechaza (estado inválido) la bitácora dice 'rejected' y la respuesta trae el motivo`, async () => {
      beRole('ADMIN', 'jefa@yaentre.com');
      dbResult = { ok: false, code: 'INVALID_STATE', message: 'Ese código ya estaba suspendido.' };
      expect(await w.action()).toEqual({ ok: false, code: 'INVALID_STATE', message: 'Ese código ya estaba suspendido.' });
      expect(auditRows[0]).toMatchObject({ outcome: 'rejected' });
    });

    it(`${w.name} — si la base revienta: UNKNOWN sin filtrar el mensaje, y queda la fila 'rejected'`, async () => {
      beRole('ADMIN', 'jefa@yaentre.com');
      dbThrows = true;
      const res = await w.action();
      expect(res).toMatchObject({ ok: false, code: 'UNKNOWN' });
      expect(JSON.stringify(res)).not.toContain('db down');
      expect(auditRows[0]).toMatchObject({ outcome: 'rejected' });
    });

    it(`${w.name} — límite de tasa: RATE_LIMIT, sin base, con rastro`, async () => {
      beRole('ADMIN', 'jefa@yaentre.com');
      vi.mocked(consumeRateLimit).mockResolvedValue({ allowed: false, hits: 99, retryAfterSecs: 600 });
      expect(await w.action()).toMatchObject({ ok: false, code: 'RATE_LIMIT' });
      expect(dbCalls).toEqual([]);
      expect(auditRows[0]).toMatchObject({ outcome: 'rejected', metadata: { denied: 'RATE_LIMIT' } });
    });
  }

  it('la validación: id que no es cuid, motivo corto o decisión inventada → VALIDATION, sin base, con rastro', async () => {
    beRole('ADMIN', 'jefa@yaentre.com');
    const bad = [
      () => actions.suspendReferralAction({ referralId: 'no-es-cuid', reason: REASON }),
      () => actions.suspendReferralAction({ referralId: CODE, reason: 'corto' }),
      () => actions.suspendReferralAction({ referralId: CODE }),
      () => actions.reinstateReferralAction({ referralId: '../../etc/passwd', reason: REASON }),
      () => actions.resolveReferralFlagAction({ saleId: SALE, decision: 'BORRAR', reason: REASON }),
      () => actions.resolveReferralFlagAction({ saleId: SALE, reason: REASON }),
      () => actions.suspendReferralAction(null),
      () => actions.suspendReferralAction('texto'),
    ];
    for (const run of bad) {
      auditRows.length = 0;
      expect(await run()).toMatchObject({ ok: false, code: 'VALIDATION' });
      expect(auditRows).toHaveLength(1);
      expect(auditRows[0]).toMatchObject({ outcome: 'rejected' });
    }
    expect(dbCalls).toEqual([]);
  });

  it('lo que llega en un id hostil se sanea antes de copiarse a la bitácora (sin saltos de línea ni longitud arbitraria)', async () => {
    beRole('ADMIN', 'jefa@yaentre.com');
    await actions.suspendReferralAction({ referralId: 'x\n[ADMIN_AUDIT] falso'.padEnd(200, 'a'), reason: REASON });
    const id = auditRows[0].metadata.targetId as string;
    expect(id).not.toMatch(/[\n\r\s\[\]]/);
    expect(id.length).toBeLessThanOrEqual(40);
  });
});

describe('las mismas reglas por la ruta HTTP (la otra puerta de entrada)', () => {
  it('suspend: anónimo 401, STUDENT 403, ADMIN no maestro 403, maestro 200', async () => {
    beAnonymous();
    expect((await suspendRoute.POST(post({ reason: REASON }), params(CODE))).status).toBe(401);
    beRole('STUDENT', 'student@x.mx');
    expect((await suspendRoute.POST(post({ reason: REASON }), params(CODE))).status).toBe(403);
    beRole('ADMIN', 'otro-admin@yaentre.com');
    expect((await suspendRoute.POST(post({ reason: REASON }), params(CODE))).status).toBe(403);
    expect(dbCalls).toEqual([]);
    beRole('ADMIN', 'jefa@yaentre.com');
    expect((await suspendRoute.POST(post({ reason: REASON }), params(CODE))).status).toBe(200);
    expect(dbCalls).toEqual(['suspend']);
  });

  it('el id que se aplica es EL DE LA RUTA (no uno fijo, no uno del cuerpo)', async () => {
    beRole('ADMIN', 'jefa@yaentre.com');
    const OTHER = 'cku0000000000000000000009';
    await suspendRoute.POST(post({ reason: REASON, referralId: CODE }), params(OTHER));
    await reinstateRoute.POST(post({ reason: REASON, referralId: CODE }), params(OTHER));
    await resolveRoute.POST(post({ decision: 'CLEAR', reason: REASON, saleId: SALE }), params(OTHER));
    expect(ids).toEqual([OTHER, OTHER, OTHER]);
  });

  it('reinstate y resolve-flag: el id sale de la RUTA y se valida; una decisión inválida es 400', async () => {
    beRole('ADMIN', 'jefa@yaentre.com');
    expect((await reinstateRoute.POST(post({ reason: REASON }), params(CODE))).status).toBe(200);
    expect((await reinstateRoute.POST(post({ reason: REASON }), params('basura'))).status).toBe(400);
    expect((await resolveRoute.POST(post({ decision: 'CLEAR', reason: REASON }), params(SALE))).status).toBe(200);
    expect((await resolveRoute.POST(post({ decision: 'X', reason: REASON }), params(SALE))).status).toBe(400);
    expect((await resolveRoute.POST(new Request('http://x', { method: 'POST', body: 'no-json' }), params(SALE))).status).toBe(400);
  });

  it('un estado inválido es 409 y un código inexistente 404', async () => {
    beRole('ADMIN', 'jefa@yaentre.com');
    dbResult = { ok: false, code: 'INVALID_STATE', message: 'x' };
    expect((await suspendRoute.POST(post({ reason: REASON }), params(CODE))).status).toBe(409);
    dbResult = { ok: false, code: 'NOT_FOUND', message: 'x' };
    expect((await suspendRoute.POST(post({ reason: REASON }), params(CODE))).status).toBe(404);
  });

  it('el límite de tasa es 429', async () => {
    beRole('ADMIN', 'jefa@yaentre.com');
    vi.mocked(consumeRateLimit).mockResolvedValue({ allowed: false, hits: 99, retryAfterSecs: 60 });
    expect((await suspendRoute.POST(post({ reason: REASON }), params(CODE))).status).toBe(429);
  });
});

describe('lecturas — ADMIN (no hace falta maestro); nadie más', () => {
  const READS = [
    ['GET /api/admin/referrals', () => listRoute.GET(), 'listReferrers'],
    ['GET /api/admin/referrals/fraud', () => fraudRoute.GET(), 'listFraud'],
  ] as const;

  for (const [name, call, db] of READS) {
    it(`${name} — anónimo 401; STUDENT/PARENT/ACCOUNTANT/SUPPORT 403 SIN tocar la base`, async () => {
      beAnonymous();
      expect((await call()).status).toBe(401);
      for (const [role, email] of [['STUDENT', 'student@x.mx'], ['PARENT', 'parent@x.mx'], ['ACCOUNTANT', 'conta@x.mx'], ['SUPPORT', 'soporte@x.mx']] as const) {
        beRole(role, email);
        expect((await call()).status, role).toBe(403);
      }
      expect(dbCalls).toEqual([]);
    });

    it(`${name} — ADMIN (aun sin ser maestro) 200`, async () => {
      beRole('ADMIN', 'otro-admin@yaentre.com');
      expect((await call()).status).toBe(200);
      expect(dbCalls).toEqual([db]);
    });

    it(`${name} — con el límite de lectura agotado: 429 sin tocar la base`, async () => {
      beRole('ADMIN', 'otro-admin@yaentre.com');
      vi.mocked(consumeRateLimit).mockResolvedValue({ allowed: false, hits: 999, retryAfterSecs: 60 });
      expect((await call()).status).toBe(429);
      expect(dbCalls).toEqual([]);
    });
  }

  it('el servicio lanza el AuthError del guard: ninguna lectura escapa a él', async () => {
    beRole('STUDENT', 'student@x.mx');
    await expect(service.listReferrersForAdmin()).rejects.toBeInstanceOf(AuthError);
    await expect(service.listFraudAlertsForAdmin()).rejects.toBeInstanceOf(AuthError);
  });
});
