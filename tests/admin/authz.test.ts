import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError } from '@/lib/auth/errors';

/**
 * G99 — MATRIZ DE AUTORIZACIÓN DE LAS ACCIONES DE ADMINISTRACIÓN.
 *
 * La pregunta que responde esta suite no es «¿devuelve error?», sino la más
 * fuerte: **¿llega a tocar la base?**. Los dobles de la capa de datos registran
 * cada llamada y los caminos denegados exigen ese registro VACÍO. Si mañana
 * alguien mueve `requireRole` una línea más abajo —después del `update` del
 * rol, o después de crear la cortesía—, esta suite se pone roja aunque el
 * `ActionResult` siga diciendo `FORBIDDEN`.
 *
 * Roles enumerados: anónimo, STUDENT, PARENT, ADMIN no maestro, ADMIN maestro.
 *
 * ⚠️ Los imports dinámicos van a ÁMBITO DE MÓDULO, nunca dentro de un `it`
 * (lección de G73b): cargar el grafo de módulos dentro del presupuesto de
 * tiempo de un test produce rojos intermitentes, que son peores que un verde
 * falso porque enseñan a reintentar hasta que pase.
 */

const dbCalls: string[] = [];
const auditRows: Array<Record<string, unknown>> = [];

// ── Identidad simulada, cambiada por cada caso de la matriz ────────────────
const identity: { role: string | null; email: string | null; profileId: string } = {
  role: null,
  email: null,
  profileId: 'cku0000000000000000000001',
};

vi.mock('@/lib/auth/guards', () => ({
  requireRole: vi.fn(async (allowed: string | string[]) => {
    if (identity.role === null) {
      throw new AuthError('UNAUTHORIZED', 'Debes iniciar sesión para continuar.');
    }
    const roles = Array.isArray(allowed) ? allowed : [allowed];
    if (!roles.includes(identity.role)) {
      throw new AuthError('FORBIDDEN', 'No tienes permiso para acceder a esto.');
    }
    return {
      authUser: { id: 'auth-uid', email: identity.email },
      profile: { id: identity.profileId, role: identity.role },
    };
  }),
}));

vi.mock('@/lib/db/admin-users', async () => {
  const actual = await vi.importActual<typeof import('@/lib/db/admin-users')>(
    '@/lib/db/admin-users'
  );
  return {
    AdminUserError: actual.AdminUserError,
    grantCompSubscription: vi.fn(async () => {
      dbCalls.push('grantCompSubscription');
      return {
        subscriptionId: 'cku0000000000000000000009',
        plan: 'PREMIUM' as const,
        season: 'HIGH_SEASON' as const,
        expiresAt: new Date('2027-01-06T00:00:00.000Z'),
        earlyBirdBadgeGranted: false,
      };
    }),
    cancelSubscription: vi.fn(async () => {
      dbCalls.push('cancelSubscription');
      return { subscriptionId: 'cku0000000000000000000009', previousStatus: 'ACTIVE' };
    }),
    changeUserRole: vi.fn(async () => {
      dbCalls.push('changeUserRole');
      return { previousRole: 'STUDENT' as const, role: 'ADMIN' as const };
    }),
    getUserDetail: vi.fn(async () => {
      dbCalls.push('getUserDetail');
      return { id: 'cku0000000000000000000002', email: 'objetivo@acierta-test.mx' };
    }),
  };
});

vi.mock('@/lib/db/auth-users', () => ({
  revokeAllSessions: vi.fn(async () => {
    dbCalls.push('revokeAllSessions');
    return 2;
  }),
}));

vi.mock('@/lib/auth/supabase-server', () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      resetPasswordForEmail: async () => {
        dbCalls.push('resetPasswordForEmail');
        return { error: null };
      },
    },
  }),
}));

vi.mock('@/lib/rate-limit/store', () => ({
  consumeRateLimit: vi.fn(async () => ({ allowed: true, hits: 1, retryAfterSecs: 0 })),
}));

// La bitácora se simula para poder CONTAR filas: la promesa "toda acción
// escribe exactamente una fila, incluso al fallar" se verifica aquí.
vi.mock('@/lib/admin/audit-log', () => ({
  logAdminAction: vi.fn(async (action: string, actor: unknown, details: unknown) => {
    auditRows.push({ action, actor, ...(details as object) });
  }),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const actions = await import('@/app/actions/admin-users');
const { consumeRateLimit } = await import('@/lib/rate-limit/store');

const TARGET = 'cku0000000000000000000002';
const SUB = 'cku0000000000000000000009';
const REASON = 'Soporte: la alumna perdió el acceso antes del examen.';

/** Las cinco acciones destructivas, con una entrada VÁLIDA cada una. */
const DESTRUCTIVE = [
  {
    name: 'grantCompAction',
    run: () => actions.grantCompAction({ userProfileId: TARGET, reason: REASON, plan: 'PREMIUM', season: 'HIGH_SEASON' }),
    dbCall: 'grantCompSubscription',
  },
  {
    name: 'cancelPlanAction',
    run: () => actions.cancelPlanAction({ userProfileId: TARGET, reason: REASON, subscriptionId: SUB }),
    dbCall: 'cancelSubscription',
  },
  {
    name: 'forcePasswordResetAction',
    run: () => actions.forcePasswordResetAction({ userProfileId: TARGET, reason: REASON }),
    dbCall: 'resetPasswordForEmail',
  },
  {
    name: 'revokeSessionsAction',
    run: () => actions.revokeSessionsAction({ userProfileId: TARGET, reason: REASON }),
    dbCall: 'revokeAllSessions',
  },
  {
    name: 'changeRoleAction',
    run: () => actions.changeRoleAction({ userProfileId: TARGET, reason: REASON, role: 'ADMIN' }),
    dbCall: 'changeUserRole',
  },
] as const;

const ORIGINAL_MASTER_LIST = process.env.MASTER_ADMIN_EMAILS;

beforeEach(() => {
  dbCalls.length = 0;
  auditRows.length = 0;
  vi.mocked(consumeRateLimit).mockResolvedValue({ allowed: true, hits: 1, retryAfterSecs: 0 });
  process.env.MASTER_ADMIN_EMAILS = 'jefa@yaentre.com';
});

afterEach(() => {
  if (ORIGINAL_MASTER_LIST === undefined) delete process.env.MASTER_ADMIN_EMAILS;
  else process.env.MASTER_ADMIN_EMAILS = ORIGINAL_MASTER_LIST;
});

function beAnonymous() {
  identity.role = null;
  identity.email = null;
}
function beRole(role: 'STUDENT' | 'PARENT' | 'ADMIN', email: string) {
  identity.role = role;
  identity.email = email;
}

/**
 * ⚠️ AISLAR EL GUARD DE ROL DE LA COMPUERTA DE MAESTRO.
 *
 * Primera versión de esta suite: STUDENT y PARENT usaban correos FUERA de
 * `MASTER_ADMIN_EMAILS`, así que los detenía la compuerta de maestro y no el
 * guard de rol — y ambos devuelven `FORBIDDEN`. Comprobado por mutación:
 * aflojando `requireRole('ADMIN')` a `requireRole(['ADMIN','STUDENT','PARENT'])`
 * la suite seguía **36/36 en verde**. Era un verde que no comprobaba lo que su
 * nombre afirmaba (G71 §6 D6).
 *
 * La corrección: en estos casos el correo del STUDENT/PARENT **sí** está en la
 * lista de maestros. Así la compuerta de maestro los dejaría pasar y lo ÚNICO
 * que puede detenerlos es el rol. Con esa misma mutación, la suite se pone
 * roja.
 */
describe('sin rol ADMIN, ninguna acción toca la base', () => {
  for (const action of DESTRUCTIVE) {
    it(`${action.name} — anónimo`, async () => {
      beAnonymous();
      const result = await action.run();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe('UNAUTHORIZED');
      expect(dbCalls).toEqual([]);
    });

    it(`${action.name} — STUDENT (incluso estando en MASTER_ADMIN_EMAILS)`, async () => {
      process.env.MASTER_ADMIN_EMAILS = 'jefa@yaentre.com,alumna@acierta-test.mx';
      beRole('STUDENT', 'alumna@acierta-test.mx');
      const result = await action.run();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe('FORBIDDEN');
      expect(dbCalls).toEqual([]);
      // Ninguna fila de bitácora: el rechazo ocurre ANTES de tener actor.
      expect(auditRows).toEqual([]);
    });

    it(`${action.name} — PARENT (incluso estando en MASTER_ADMIN_EMAILS)`, async () => {
      process.env.MASTER_ADMIN_EMAILS = 'jefa@yaentre.com,tutor@acierta-test.mx';
      beRole('PARENT', 'tutor@acierta-test.mx');
      const result = await action.run();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe('FORBIDDEN');
      expect(dbCalls).toEqual([]);
      expect(auditRows).toEqual([]);
    });
  }
});

describe('ADMIN que NO es maestro: se deniega y NO toca la base', () => {
  for (const action of DESTRUCTIVE) {
    it(`${action.name}`, async () => {
      beRole('ADMIN', 'ayudante@yaentre.com');
      const result = await action.run();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe('FORBIDDEN');
      expect(dbCalls).toEqual([]);
      // El intento SÍ queda auditado: es justo lo que interesa registrar.
      expect(auditRows).toHaveLength(1);
      expect(auditRows[0].outcome).toBe('rejected');
    });
  }
});

describe('MASTER_ADMIN_EMAILS ausente: ni siquiera el dueño pasa', () => {
  for (const action of DESTRUCTIVE) {
    it(`${action.name}`, async () => {
      delete process.env.MASTER_ADMIN_EMAILS;
      beRole('ADMIN', 'jefa@yaentre.com');
      const result = await action.run();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe('FORBIDDEN');
      expect(dbCalls).toEqual([]);
      expect(auditRows[0]).toMatchObject({ metadata: { denied: 'NOT_CONFIGURED' } });
    });
  }
});

describe('ADMIN maestro: la acción se aplica y queda auditada', () => {
  for (const action of DESTRUCTIVE) {
    it(`${action.name}`, async () => {
      beRole('ADMIN', 'jefa@yaentre.com');
      const result = await action.run();
      expect(result.ok).toBe(true);
      expect(dbCalls).toContain(action.dbCall);
      const applied = auditRows.filter((r) => r.outcome !== 'rejected');
      expect(applied).toHaveLength(1);
      expect(applied[0].reason).toBe(REASON);
    });
  }
});

describe('validación: motivo obligatorio, id con forma de cuid', () => {
  it('sin motivo se rechaza, no toca la base y DEJA fila de bitácora', async () => {
    beRole('ADMIN', 'jefa@yaentre.com');
    const result = await actions.revokeSessionsAction({ userProfileId: TARGET, reason: 'corto' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('VALIDATION');
    expect(dbCalls).toEqual([]);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].outcome).toBe('rejected');
  });

  it('un id que no es cuid se rechaza antes de consultar', async () => {
    beRole('ADMIN', 'jefa@yaentre.com');
    const result = await actions.revokeSessionsAction({
      userProfileId: "1 OR 1=1; DROP TABLE users--",
      reason: REASON,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('VALIDATION');
    expect(dbCalls).toEqual([]);
  });
});

describe('límite de tasa alcanzado: rechazo controlado, no excepción', () => {
  it('devuelve RATE_LIMIT, no toca la base y queda auditado', async () => {
    beRole('ADMIN', 'jefa@yaentre.com');
    vi.mocked(consumeRateLimit).mockResolvedValue({
      allowed: false,
      hits: 61,
      retryAfterSecs: 900,
    });
    const result = await actions.revokeSessionsAction({ userProfileId: TARGET, reason: REASON });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('RATE_LIMIT');
    expect(dbCalls).toEqual([]);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]).toMatchObject({ metadata: { denied: 'RATE_LIMIT' } });
  });
});

describe('un admin maestro no puede degradarse a sí mismo', () => {
  it('rechaza cuando el objetivo es el propio actor, aunque el rol pedido sea ADMIN', async () => {
    beRole('ADMIN', 'jefa@yaentre.com');
    const result = await actions.changeRoleAction({
      userProfileId: identity.profileId,
      reason: REASON,
      role: 'ADMIN',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('FORBIDDEN');
    expect(dbCalls).toEqual([]);
    expect(auditRows[0]).toMatchObject({ metadata: { denied: 'SELF_TARGET' } });
  });

  it('rechaza también la degradación explícita a STUDENT', async () => {
    beRole('ADMIN', 'jefa@yaentre.com');
    const result = await actions.changeRoleAction({
      userProfileId: identity.profileId,
      reason: REASON,
      role: 'STUDENT',
    });
    expect(result.ok).toBe(false);
    expect(dbCalls).toEqual([]);
  });

  it('pero SÍ puede cambiar el rol de otra cuenta', async () => {
    beRole('ADMIN', 'jefa@yaentre.com');
    const result = await actions.changeRoleAction({
      userProfileId: TARGET,
      reason: REASON,
      role: 'ADMIN',
    });
    expect(result.ok).toBe(true);
    expect(dbCalls).toContain('changeUserRole');
  });
});
