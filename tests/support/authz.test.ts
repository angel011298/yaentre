/* eslint-disable @typescript-eslint/no-explicit-any -- dobles de prueba: parámetros arbitrarios de Stripe y filas de bitácora */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError } from '@/lib/auth/errors';
import { roleHasCapability, type Capability } from '@/lib/admin/capabilities';

/**
 * Matriz de autorización de la MESA DE SOPORTE (Bloque 3): anónimo × STUDENT ×
 * PARENT × ACCOUNTANT × SUPPORT × ADMIN no maestro × ADMIN maestro, contra las
 * tres puertas (Server Action, servicio, Route Handler). La pregunta no es
 * «¿devuelve error?» sino **¿llega a tocar Stripe o la base?** — y estas acciones
 * se alcanzan con un `fetch` sin renderizar el layout, así que el guard tiene que
 * estar en la primera línea de cada una.
 *
 * Los roles sin capacidad figuran EN la lista de maestros, para que lo único que
 * pueda detenerlos sea el rol.
 */

const state = {
  touched: [] as string[],
  stripeCalls: [] as any[],
  audit: [] as Array<Record<string, any>>,
  rateAllowed: true,
  insideValve: true,
  exportFound: true,
};
const identity: { role: string | null; email: string | null } = { role: null, email: null };

vi.mock('@/lib/auth/guards', () => {
  return {
    requireCapability: vi.fn(async (capability: string) => {
      if (identity.role === null) throw new AuthError('UNAUTHORIZED', 'Debes iniciar sesión para continuar.');
      const { roleHasCapability: has } = await import('@/lib/admin/capabilities');
      if (!has(identity.role, capability as Capability)) throw new AuthError('FORBIDDEN', 'No tienes permiso para acceder a esto.');
      return { authUser: { id: 'auth-uid', email: identity.email }, profile: { id: 'cku0000000000000000000001', role: identity.role } };
    }),
  };
});
vi.mock('@/lib/rate-limit/store', () => ({
  consumeRateLimit: vi.fn(async () => ({ allowed: state.rateAllowed, hits: 1, retryAfterSecs: 120 })),
}));
vi.mock('@/lib/admin/audit-log', () => ({
  logAdminAction: vi.fn(async (action: string, actor: unknown, details: unknown) => {
    state.audit.push({ action, actor, ...(details as object) });
  }),
}));
vi.mock('@/lib/observability/report', () => ({ reportSilentDegradation: vi.fn(), reportControlFailure: vi.fn() }));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), withScope: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/stripe/client', () => ({
  getStripe: () => ({
    refunds: {
      create: async (params: any, opts: any) => {
        state.touched.push('stripe.refund');
        state.stripeCalls.push({ params, opts });
        return { id: 're_1', amount: params.amount, created: 1_790_000_000, status: 'succeeded', reason: params.reason, metadata: params.metadata };
      },
    },
  }),
}));
vi.mock('@/lib/db/support', () => ({
  loadRefundFacts: vi.fn(async () => {
    state.touched.push('loadRefundFacts');
    return {
      id: 'cku0000000000000000000009',
      plan: 'SEASON_PASS',
      status: 'ACTIVE',
      isComp: false,
      userProfileId: 'cku0000000000000000000003',
      paidAt: new Date('2026-11-10T12:00:00.000Z'),
      sessionsSinceActivation: state.insideValve ? 0 : 3,
      payments: [{ id: 'pay1', amountCents: 99_900, paymentIntentId: 'pi_1', refundedCents: 0 }],
    };
  }),
  loadSupportFicha: vi.fn(async () => {
    state.touched.push('loadSupportFicha');
    return { id: 'cku0000000000000000000003', role: 'STUDENT', displayName: null, email: 'a@x.mx', emailVerified: true, createdAt: new Date(), lastSignInAt: null, marketingEnabled: true, plans: [] };
  }),
  searchUsersForSupportDb: vi.fn(async () => {
    state.touched.push('searchUsers');
    return { rows: [], total: 0 };
  }),
}));
vi.mock('@/lib/db/refunds', () => ({
  recordRefundsForPaymentIntent: vi.fn(async () => {
    state.touched.push('recordRefunds');
    return { paymentId: 'pay1', subscriptionId: 'cku0000000000000000000009', inserted: 1, refundedCents: 99_900, paymentAmountCents: 99_900, anyFromSupport: true };
  }),
  cancelRefundedSubscription: vi.fn(async () => {
    state.touched.push('cancelSubscription');
    return { canceled: true, creditRestoredCents: 0 };
  }),
}));
vi.mock('@/lib/db/referrals', () => ({
  reverseSaleForSubscription: vi.fn(async () => {
    state.touched.push('reverseSale');
    return { reversed: false, wasAccrued: false, consumedBeforeReversalCents: 0 };
  }),
}));
vi.mock('@/lib/db/account', () => ({
  buildUserDataExport: vi.fn(async () => {
    state.touched.push('buildExport');
    return state.exportFound ? { cuenta: { correo: 'a@x.mx' } } : null;
  }),
}));
vi.mock('@/lib/db/auth-users', () => ({ getAuthEmail: vi.fn(async () => 'a@x.mx') }));
vi.mock('@/lib/db/notifications', () => ({
  setNotificationPreference: vi.fn(async () => {
    state.touched.push('setNotificationPreference');
  }),
}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: { userProfile: { findUnique: vi.fn(async () => ({ id: 'cku0000000000000000000003' })) } },
}));

const { requireCapability } = await import('@/lib/auth/guards');
const actions = await import('@/app/actions/support');
const service = await import('@/lib/support/service');
const exportRoute = await import('@/app/api/support/users/[id]/export/route');

const SUB = 'cku0000000000000000000009';
const USER = 'cku0000000000000000000003';
const REASON = 'Solicitud verificada por correo del titular.';

const ORIGINAL = process.env.MASTER_ADMIN_EMAILS;
beforeEach(() => {
  vi.mocked(requireCapability).mockClear();
  state.touched.length = 0;
  state.stripeCalls.length = 0;
  state.audit.length = 0;
  state.rateAllowed = true;
  state.insideValve = true;
  state.exportFound = true;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-11T12:00:00.000Z')); // 24 h después del cobro
  process.env.MASTER_ADMIN_EMAILS = 'jefa@yaentre.com,student@x.mx,parent@x.mx,conta@x.mx,soporte@x.mx';
});
afterEach(() => {
  vi.useRealTimers();
  if (ORIGINAL === undefined) delete process.env.MASTER_ADMIN_EMAILS;
  else process.env.MASTER_ADMIN_EMAILS = ORIGINAL;
});

const beAnonymous = () => Object.assign(identity, { role: null, email: null });
const beRole = (role: string, email: string) => Object.assign(identity, { role, email });

const ROLES_WITHOUT: Record<string, Array<[string, string]>> = {
  // Quién NO tiene cada capacidad (según la matriz real) — se derivan, no se inventan.
  'refunds.issue': [['STUDENT', 'student@x.mx'], ['PARENT', 'parent@x.mx'], ['ACCOUNTANT', 'conta@x.mx']],
  'arco.handle': [['STUDENT', 'student@x.mx'], ['PARENT', 'parent@x.mx'], ['ACCOUNTANT', 'conta@x.mx']],
  'users.read': [['STUDENT', 'student@x.mx'], ['PARENT', 'parent@x.mx'], ['ACCOUNTANT', 'conta@x.mx']],
};

describe('la matriz de capacidades que estas pruebas suponen es la real', () => {
  it('SUPPORT: users.read, arco.handle y refunds.issue; ACCOUNTANT: ninguna de las tres', () => {
    for (const cap of ['users.read', 'arco.handle', 'refunds.issue'] as Capability[]) {
      expect(roleHasCapability('SUPPORT', cap)).toBe(true);
      expect(roleHasCapability('ADMIN', cap)).toBe(true);
      expect(roleHasCapability('ACCOUNTANT', cap)).toBe(false);
      expect(roleHasCapability('STUDENT', cap)).toBe(false);
      expect(roleHasCapability('PARENT', cap)).toBe(false);
    }
  });
});

const DOORS = [
  { name: 'issueRefundAction', cap: 'refunds.issue', run: () => actions.issueRefundAction({ subscriptionId: SUB, reason: REASON }), touches: 'loadRefundFacts' },
  { name: 'opposeMarketingAction', cap: 'arco.handle', run: () => actions.opposeMarketingAction({ userProfileId: USER, reason: REASON }), touches: 'setNotificationPreference' },
  { name: 'exportUserDataForSupport', cap: 'arco.handle', run: () => service.exportUserDataForSupport({ userProfileId: USER }), touches: 'buildExport' },
  { name: 'loadFichaForSupport', cap: 'users.read', run: () => service.loadFichaForSupport({ userProfileId: USER }), touches: 'loadSupportFicha' },
] as const;

async function asResult(fn: () => Promise<any>) {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, code: err.code, message: err.message };
    throw err;
  }
}

describe('sin la capacidad NADA toca Stripe ni la base', () => {
  for (const d of DOORS) {
    it(`${d.name} — anónimo → UNAUTHORIZED`, async () => {
      beAnonymous();
      expect(await asResult(d.run)).toMatchObject({ ok: false, code: 'UNAUTHORIZED' });
      expect(state.touched).toEqual([]);
      expect(state.audit).toEqual([]);
    });

    for (const [role, email] of ROLES_WITHOUT[d.cap]) {
      it(`${d.name} — ${role} (aunque su correo esté en la lista de maestros) → FORBIDDEN`, async () => {
        beRole(role, email);
        expect(await asResult(d.run)).toMatchObject({ ok: false, code: 'FORBIDDEN' });
        expect(state.touched).toEqual([]);
        expect(state.audit).toEqual([]);
      });
    }

    for (const [role, email] of [['SUPPORT', 'soporte@x.mx'], ['ADMIN', 'otro-admin@yaentre.com']] as const) {
      it(`${d.name} — ${role} con la capacidad llega hasta la base`, async () => {
        beRole(role, email);
        const res = await asResult(d.run);
        // Un ADMIN no maestro SÍ llega a leer los hechos del reembolso (para decidir), pero se le rechaza.
        const adminRefund = role === 'ADMIN' && d.name === 'issueRefundAction';
        expect(res.ok).toBe(!adminRefund);
        expect(state.touched).toContain(d.touches);
        // Hoy soporte y admin tienen las tres capacidades, así que la matriz sola no distingue
        // una capacidad equivocada: se comprueba QUÉ capacidad pidió cada puerta.
        expect(requireCapability).toHaveBeenCalledWith(d.cap);
      });
    }

    it(`${d.name} — sobre el límite de tasa: RATE_LIMIT, sin tocar nada, con rastro`, async () => {
      beRole('SUPPORT', 'soporte@x.mx');
      state.rateAllowed = false;
      expect(await asResult(d.run)).toMatchObject({ ok: false, code: 'RATE_LIMIT' });
      expect(state.touched).toEqual([]);
      expect(state.audit[0]).toMatchObject({ outcome: 'rejected', metadata: { denied: 'RATE_LIMIT' } });
    });

    it(`${d.name} — un id que no es cuid: VALIDATION, sin tocar nada, con rastro`, async () => {
      beRole('SUPPORT', 'soporte@x.mx');
      const bad = d.name === 'issueRefundAction'
        ? () => actions.issueRefundAction({ subscriptionId: '../../x', reason: REASON })
        : d.name === 'opposeMarketingAction'
          ? () => actions.opposeMarketingAction({ userProfileId: 'x', reason: REASON })
          : d.name === 'exportUserDataForSupport'
            ? () => service.exportUserDataForSupport({ userProfileId: 'x' })
            : () => service.loadFichaForSupport({ userProfileId: 'x' });
      expect(await asResult(bad)).toMatchObject({ ok: false, code: 'VALIDATION' });
      expect(state.touched).toEqual([]);
      expect(state.audit).toHaveLength(1);
      expect(state.audit[0]).toMatchObject({ outcome: 'rejected' });
    });
  }

  it('buscar personas: anónimo/STUDENT/PARENT/ACCOUNTANT → sin tocar la base; SUPPORT y ADMIN sí', async () => {
    beAnonymous();
    await expect(service.searchUsersForSupport({ q: 'ana' })).rejects.toBeInstanceOf(AuthError);
    for (const [role, email] of ROLES_WITHOUT['users.read']) {
      beRole(role, email);
      await expect(service.searchUsersForSupport({ q: 'ana' })).rejects.toBeInstanceOf(AuthError);
    }
    expect(state.touched).toEqual([]);
    beRole('SUPPORT', 'soporte@x.mx');
    expect((await service.searchUsersForSupport({ q: 'ana' })).ok).toBe(true);
    expect(state.touched).toContain('searchUsers');
  });
});

describe('reembolso — quién y cuándo', () => {
  it('SOPORTE dentro de la válvula: Stripe se llama y el plan se da de baja', async () => {
    beRole('SUPPORT', 'soporte@x.mx');
    const res = await actions.issueRefundAction({ subscriptionId: SUB, reason: REASON });
    expect(res).toMatchObject({ ok: true, data: { refundedCents: 99_900, canceled: true } });
    expect(state.touched).toEqual(['loadRefundFacts', 'stripe.refund', 'recordRefunds', 'cancelSubscription', 'reverseSale']);
  });

  it('SOPORTE FUERA de la válvula (ya estudió): FORBIDDEN, y Stripe NO se llama', async () => {
    beRole('SUPPORT', 'soporte@x.mx');
    state.insideValve = false;
    const res = await actions.issueRefundAction({ subscriptionId: SUB, reason: REASON });
    expect(res).toMatchObject({ ok: false, code: 'FORBIDDEN' });
    expect((res as any).message).toMatch(/administrador maestro/);
    expect(state.stripeCalls).toEqual([]);
    expect(state.touched).toEqual(['loadRefundFacts']);
    expect(state.audit[0]).toMatchObject({ action: 'refund.issued', outcome: 'rejected', metadata: { denied: 'OUTSIDE_VALVE', insideValve: false } });
  });

  it('SOPORTE tras 48 h: FORBIDDEN', async () => {
    beRole('SUPPORT', 'soporte@x.mx');
    vi.setSystemTime(new Date('2026-11-13T12:00:01.000Z'));
    expect(await actions.issueRefundAction({ subscriptionId: SUB, reason: REASON })).toMatchObject({ ok: false, code: 'FORBIDDEN' });
    expect(state.stripeCalls).toEqual([]);
  });

  it('ADMIN no maestro: FORBIDDEN incluso dentro de la válvula', async () => {
    beRole('ADMIN', 'otro-admin@yaentre.com');
    const res = await actions.issueRefundAction({ subscriptionId: SUB, reason: REASON });
    expect(res).toMatchObject({ ok: false, code: 'FORBIDDEN' });
    expect(state.stripeCalls).toEqual([]);
    expect(state.audit[0]).toMatchObject({ metadata: { denied: 'MASTER_REQUIRED' } });
  });

  it('ADMIN maestro: reembolsa dentro y FUERA de la válvula', async () => {
    beRole('ADMIN', 'jefa@yaentre.com');
    expect((await actions.issueRefundAction({ subscriptionId: SUB, reason: REASON })).ok).toBe(true);
    state.touched.length = 0;
    state.stripeCalls.length = 0;
    state.insideValve = false;
    expect((await actions.issueRefundAction({ subscriptionId: SUB, reason: REASON })).ok).toBe(true);
    expect(state.stripeCalls).toHaveLength(1);
  });

  it('con la lista de maestros VACÍA nadie es maestro: el ADMIN queda rechazado (cierra, no abre)', async () => {
    beRole('ADMIN', 'jefa@yaentre.com');
    process.env.MASTER_ADMIN_EMAILS = '';
    expect(await actions.issueRefundAction({ subscriptionId: SUB, reason: REASON })).toMatchObject({ ok: false, code: 'FORBIDDEN' });
    expect(state.stripeCalls).toEqual([]);
  });

  it('la bitácora de un reembolso se escribe ANTES de responder, con el monto y si estaba en la válvula', async () => {
    beRole('SUPPORT', 'soporte@x.mx');
    await actions.issueRefundAction({ subscriptionId: SUB, reason: REASON });
    expect(state.audit).toHaveLength(1);
    expect(state.audit[0]).toMatchObject({
      action: 'refund.issued',
      reason: REASON,
      metadata: { subscriptionId: SUB, refundedCents: 99_900, insideValve: true, canceled: true },
    });
  });
});

describe('ARCO', () => {
  it('la exportación deja la bitácora antes de entregar y entrega los datos', async () => {
    beRole('SUPPORT', 'soporte@x.mx');
    const res = await service.exportUserDataForSupport({ userProfileId: USER });
    expect(res).toMatchObject({ ok: true });
    expect((res as any).data.filename).toBe(`yaentre-datos-${USER}.json`);
    expect(JSON.parse((res as any).data.body)).toEqual({ cuenta: { correo: 'a@x.mx' } });
    expect(state.audit[0]).toMatchObject({ action: 'arco.exported', targetUserProfileId: USER });
  });

  it('una cuenta inexistente: NOT_FOUND, con el intento en la bitácora', async () => {
    beRole('SUPPORT', 'soporte@x.mx');
    state.exportFound = false;
    expect(await service.exportUserDataForSupport({ userProfileId: USER })).toMatchObject({ ok: false, code: 'NOT_FOUND' });
    expect(state.audit[0]).toMatchObject({ action: 'arco.exported', outcome: 'rejected' });
  });

  it('la ruta HTTP: 401/403 sin tocar nada; 200 con cabeceras que impiden guardar y reinterpretar los datos', async () => {
    beAnonymous();
    expect((await exportRoute.GET(new Request('http://x'), { params: Promise.resolve({ id: USER }) })).status).toBe(401);
    beRole('ACCOUNTANT', 'conta@x.mx');
    expect((await exportRoute.GET(new Request('http://x'), { params: Promise.resolve({ id: USER }) })).status).toBe(403);
    expect(state.touched).toEqual([]);

    beRole('SUPPORT', 'soporte@x.mx');
    const res = await exportRoute.GET(new Request('http://x'), { params: Promise.resolve({ id: USER }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-disposition')).toBe(`attachment; filename="yaentre-datos-${USER}.json"`);
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('la ruta HTTP con un id hostil: 400, sin tocar la base', async () => {
    beRole('SUPPORT', 'soporte@x.mx');
    const res = await exportRoute.GET(new Request('http://x'), { params: Promise.resolve({ id: '../../etc' }) });
    expect(res.status).toBe(400);
    expect(state.touched).toEqual([]);
  });

  it('la oposición apaga el marketing y queda en la bitácora con motivo', async () => {
    beRole('SUPPORT', 'soporte@x.mx');
    expect(await actions.opposeMarketingAction({ userProfileId: USER, reason: REASON })).toMatchObject({ ok: true });
    expect(state.touched).toContain('setNotificationPreference');
    expect(state.audit[0]).toMatchObject({ action: 'arco.marketing_opt_out', reason: REASON });
  });

  it('abrir una ficha deja rastro (support.ficha_viewed)', async () => {
    beRole('SUPPORT', 'soporte@x.mx');
    await service.loadFichaForSupport({ userProfileId: USER });
    expect(state.audit[0]).toMatchObject({ action: 'support.ficha_viewed', targetUserProfileId: USER });
  });
});
