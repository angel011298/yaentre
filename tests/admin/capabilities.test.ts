import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CAPABILITIES,
  STAFF_ROLES,
  capabilitiesOf,
  evaluateRefundAuthority,
  isNonStudentRole,
  isStaffRole,
  postLoginPath,
  roleHasCapability,
  type Capability,
} from '@/lib/admin/capabilities';

/**
 * MATRIZ DE CAPACIDADES DE LOS ROLES DE PERSONAL — Bloque 3.
 *
 * La tabla de aquí abajo se escribe A MANO y por separado de la matriz del
 * módulo: si las dos salieran de la misma constante, la prueba pasaría aunque
 * alguien le diera una capacidad de más a un rol. Se enumeran TODAS las
 * celdas rol × capacidad y, además, cuántas son verdaderas: añadir una
 * capacidad a un rol sin tocar esta prueba la pone en rojo por las dos vías.
 */

const ROLES = ['STUDENT', 'PARENT', 'ADMIN', 'ACCOUNTANT', 'SUPPORT'] as const;

/** Lo que cada rol PUEDE hacer, a mano. Lo que no está aquí, no puede. */
const EXPECTED: Record<(typeof ROLES)[number], readonly Capability[]> = {
  STUDENT: [],
  PARENT: [],
  ADMIN: ['admin.panel', 'fiscal.read', 'users.read', 'arco.handle', 'refunds.issue'],
  ACCOUNTANT: ['fiscal.read'],
  SUPPORT: ['users.read', 'arco.handle', 'refunds.issue'],
};

describe('matriz rol × capacidad, celda por celda', () => {
  for (const role of ROLES) {
    for (const capability of CAPABILITIES) {
      const allowed = EXPECTED[role].includes(capability);
      it(`${role} ${allowed ? 'PUEDE' : 'NO puede'} ${capability}`, () => {
        expect(roleHasCapability(role, capability)).toBe(allowed);
      });
    }
  }

  it('hay exactamente 9 celdas verdaderas de 25 (5 roles × 5 capacidades)', () => {
    let allowed = 0;
    for (const role of ROLES) for (const cap of CAPABILITIES) if (roleHasCapability(role, cap)) allowed += 1;
    expect(ROLES.length * CAPABILITIES.length).toBe(25);
    expect(allowed).toBe(9);
  });

  it('el contador tiene UNA sola capacidad: solo lectura fiscal', () => {
    expect(capabilitiesOf('ACCOUNTANT')).toEqual(['fiscal.read']);
  });

  it('el contador NO puede tocar cuentas, reembolsos, ARCO ni el panel de administración', () => {
    for (const cap of ['admin.panel', 'users.read', 'arco.handle', 'refunds.issue'] as const) {
      expect(roleHasCapability('ACCOUNTANT', cap)).toBe(false);
    }
  });

  it('soporte NO ve lo fiscal ni el panel de administración', () => {
    expect(roleHasCapability('SUPPORT', 'fiscal.read')).toBe(false);
    expect(roleHasCapability('SUPPORT', 'admin.panel')).toBe(false);
  });

  it('un rol desconocido, vacío o nulo no tiene NINGUNA capacidad', () => {
    for (const role of ['ROOT', 'admin', 'Admin', '', null, undefined]) {
      for (const cap of CAPABILITIES) expect(roleHasCapability(role, cap)).toBe(false);
    }
  });

  it('el rol distingue mayúsculas: «admin» no es ADMIN', () => {
    expect(roleHasCapability('admin', 'admin.panel')).toBe(false);
    expect(isStaffRole('admin')).toBe(false);
  });

  it('los roles de personal son exactamente tres', () => {
    expect([...STAFF_ROLES]).toEqual(['ADMIN', 'ACCOUNTANT', 'SUPPORT']);
    expect(isStaffRole('STUDENT')).toBe(false);
    expect(isStaffRole('PARENT')).toBe(false);
  });
});

describe('a dónde manda el inicio de sesión a cada rol', () => {
  it('cada rol a su destino; el contador y soporte NUNCA a /app', () => {
    expect(postLoginPath('STUDENT')).toBe('/app');
    expect(postLoginPath('PARENT')).toBe('/tutor');
    expect(postLoginPath('ADMIN')).toBe('/app'); // como hasta ahora: entra a /admin por su cuenta
    expect(postLoginPath('ACCOUNTANT')).toBe('/fiscal');
    expect(postLoginPath('SUPPORT')).toBe('/soporte');
    expect(postLoginPath(undefined)).toBe('/app');
    expect(postLoginPath(null)).toBe('/app');
  });

  it('los roles que no son de alumno son tutor, contador y soporte (ADMIN no: ya tiene su onboarding)', () => {
    expect(ROLES.filter((r) => isNonStudentRole(r))).toEqual(['PARENT', 'ACCOUNTANT', 'SUPPORT']);
  });
});

describe('quién puede emitir un reembolso — 5 roles × maestro × válvula, enumerado', () => {
  const ALL = [...ROLES, 'ROOT'] as const;

  /** Las ÚNICAS celdas que autorizan, a mano: [rol, maestro, dentro de la válvula]. */
  const ALLOWED_CELLS = new Set([
    'ADMIN|true|true',
    'ADMIN|true|false',
    'SUPPORT|false|true',
    'SUPPORT|true|true',
  ]);

  for (const role of ALL) {
    for (const isMaster of [false, true]) {
      for (const insideValve of [false, true]) {
        const key = `${role}|${isMaster}|${insideValve}`;
        const allowed = ALLOWED_CELLS.has(key);
        it(`${role} · maestro=${isMaster} · válvula=${insideValve} → ${allowed ? 'AUTORIZA' : 'niega'}`, () => {
          const verdict = evaluateRefundAuthority({ role, isMaster, insideValve });
          expect(verdict.allowed).toBe(allowed);
        });
      }
    }
  }

  it('de 24 celdas, exactamente 4 autorizan', () => {
    let allowed = 0;
    for (const role of ALL)
      for (const isMaster of [false, true])
        for (const insideValve of [false, true])
          if (evaluateRefundAuthority({ role, isMaster, insideValve }).allowed) allowed += 1;
    expect(ALL.length * 2 * 2).toBe(24);
    expect(allowed).toBe(4);
  });

  it('soporte fuera de la válvula NO reembolsa, ni siquiera con un correo maestro', () => {
    expect(evaluateRefundAuthority({ role: 'SUPPORT', isMaster: true, insideValve: false })).toEqual({
      allowed: false,
      reason: 'OUTSIDE_VALVE',
    });
  });

  it('un ADMIN sin maestro no reembolsa ni dentro de la válvula', () => {
    expect(evaluateRefundAuthority({ role: 'ADMIN', isMaster: false, insideValve: true })).toEqual({
      allowed: false,
      reason: 'MASTER_REQUIRED',
    });
  });

  it('el contador y los roles sin la capacidad reciben ROLE_NOT_ALLOWED', () => {
    for (const role of ['ACCOUNTANT', 'STUDENT', 'PARENT', 'ROOT']) {
      expect(evaluateRefundAuthority({ role, isMaster: true, insideValve: true })).toEqual({
        allowed: false,
        reason: 'ROLE_NOT_ALLOWED',
      });
    }
  });
});

// ─────────────── Los guards REALES, con la sesión simulada ───────────────

const redirectMock = vi.fn((dest: string) => {
  throw new Error(`REDIRECT:${dest}`);
});
const findUniqueMock = vi.fn();
const getUserMock = vi.fn();

vi.mock('next/navigation', () => ({ redirect: (dest: string) => redirectMock(dest) }));
vi.mock('@/lib/db/prisma', () => ({
  prisma: { userProfile: { findUnique: (...a: unknown[]) => findUniqueMock(...a) } },
}));
vi.mock('@/lib/auth/supabase-server', () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: () => getUserMock() } }),
}));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), withScope: vi.fn() }));

// Ámbito de módulo, una sola vez (lección de G73b: no cargar el grafo dentro de un `it`).
const { requireCapability, requireOnboarding } = await import('@/lib/auth/guards');

function beRole(role: string | null) {
  if (role === null) {
    getUserMock.mockResolvedValue({ data: { user: null } });
    findUniqueMock.mockResolvedValue(null);
    return;
  }
  getUserMock.mockResolvedValue({ data: { user: { id: 'auth-uid', email: 'x@y.mx' } } });
  findUniqueMock.mockResolvedValue({ id: 'p1', userId: 'auth-uid', role, onboardingStep: 0 });
}

describe('requireCapability con la sesión real del guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  for (const role of ROLES) {
    for (const capability of CAPABILITIES) {
      const allowed = EXPECTED[role].includes(capability);
      it(`${role} × ${capability} → ${allowed ? 'pasa' : 'FORBIDDEN'}`, async () => {
        beRole(role);
        if (allowed) {
          await expect(requireCapability(capability)).resolves.toMatchObject({ profile: { role } });
        } else {
          await expect(requireCapability(capability)).rejects.toMatchObject({ code: 'FORBIDDEN' });
        }
      });
    }
  }

  it('sin sesión → UNAUTHORIZED, no FORBIDDEN', async () => {
    beRole(null);
    await expect(requireCapability('fiscal.read')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

describe('requireOnboarding: contador y soporte no caen en el asistente de alumno (misma clase de error que G10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ACCOUNTANT con onboardingStep=0 va a /fiscal, NO a /onboarding', async () => {
    beRole('ACCOUNTANT');
    await expect(requireOnboarding()).rejects.toThrow('REDIRECT:/fiscal');
  });

  it('SUPPORT con onboardingStep=0 va a /soporte, NO a /onboarding', async () => {
    beRole('SUPPORT');
    await expect(requireOnboarding()).rejects.toThrow('REDIRECT:/soporte');
  });

  it('PARENT sigue yendo a /tutor', async () => {
    beRole('PARENT');
    await expect(requireOnboarding()).rejects.toThrow('REDIRECT:/tutor');
  });

  it('un alumno con onboarding pendiente SÍ va a /onboarding (control positivo)', async () => {
    beRole('STUDENT');
    await expect(requireOnboarding()).rejects.toThrow('REDIRECT:/onboarding');
  });
});
