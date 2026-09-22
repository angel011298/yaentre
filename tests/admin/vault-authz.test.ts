import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError } from '@/lib/auth/errors';

/**
 * G99 — autorización de la bóveda: Server Action Y Route Handler.
 *
 * Los dos son endpoints propios. `app/admin/layout.tsx` no protege ninguno, y
 * el Route Handler además se alcanza con un GET directo desde la barra de
 * direcciones — ni siquiera hace falta JavaScript. Por eso los dos verifican
 * el rol por su cuenta y por eso los dos se prueban aquí.
 *
 * Reparto de privilegio que se verifica:
 *   · anónimo / STUDENT / PARENT → nada.
 *   · ADMIN no maestro           → puede VER y SUBIR, no puede BORRAR.
 *   · ADMIN maestro              → todo.
 */

const storageCalls: string[] = [];
const dbCalls: string[] = [];
/** Registro ORDENADO y combinado: permite afirmar QUÉ pasó antes que qué. */
const order: string[] = [];
const auditRows: Array<Record<string, unknown>> = [];

const identity: { role: string | null; email: string | null } = { role: null, email: null };

vi.mock('@/lib/auth/guards', () => ({
  requireRole: vi.fn(async (allowed: string | string[]) => {
    if (identity.role === null) throw new AuthError('UNAUTHORIZED', 'Sin sesión.');
    const roles = Array.isArray(allowed) ? allowed : [allowed];
    if (!roles.includes(identity.role)) throw new AuthError('FORBIDDEN', 'Sin permiso.');
    return {
      authUser: { id: 'uid', email: identity.email },
      profile: { id: 'cku0000000000000000000001', role: identity.role },
    };
  }),
}));

vi.mock('@/lib/auth/supabase-server', () => ({
  createSupabaseServerClient: async () => ({
    storage: {
      from: () => ({
        upload: async () => {
          storageCalls.push('upload'); order.push('upload');
          return { error: null };
        },
        remove: async () => {
          storageCalls.push('remove'); order.push('remove');
          return { error: null };
        },
        download: async () => {
          storageCalls.push('download'); order.push('download');
          return { data: new Blob([Buffer.from('contenido')]), error: null };
        },
      }),
    },
  }),
}));

vi.mock('@/lib/db/admin-vault', () => ({
  recordVaultFile: vi.fn(async () => {
    dbCalls.push('recordVaultFile'); order.push('recordVaultFile');
    return { id: 'cku0000000000000000000abc' };
  }),
  getVaultFile: vi.fn(async () => ({
    id: 'cku0000000000000000000abc',
    path: 'uuid.pdf',
    originalName: 'plan.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 100,
    sha256: 'abc',
    uploadedByEmail: 'jefa@yaentre.com',
    createdAt: new Date('2026-09-21T00:00:00.000Z'),
  })),
  softDeleteFile: vi.fn(async () => {
    dbCalls.push('softDeleteFile'); order.push('softDeleteFile');
    return true;
  }),
  undoSoftDelete: vi.fn(async () => {
    dbCalls.push('undoSoftDelete');
  }),
}));

vi.mock('@/lib/rate-limit/store', () => ({
  consumeRateLimit: vi.fn(async () => ({ allowed: true, hits: 1, retryAfterSecs: 0 })),
}));

vi.mock('@/lib/admin/audit-log', () => ({
  logAdminAction: vi.fn(async (action: string, _actor: unknown, details: unknown) => {
    auditRows.push({ action, ...(details as object) });
  }),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const vaultActions = await import('@/app/actions/admin-vault');
const route = await import('@/app/api/admin/vault/[id]/route');

const FILE_ID = 'cku0000000000000000000abc';
const REASON = 'Ya no se necesita este documento de soporte.';
const ORIGINAL = process.env.MASTER_ADMIN_EMAILS;

function pdfForm(): FormData {
  const fd = new FormData();
  fd.set('file', new File([new Uint8Array([1, 2, 3])], 'plan.pdf', { type: 'application/pdf' }));
  return fd;
}

function request(url = `https://yaentre.com/api/admin/vault/${FILE_ID}`) {
  return { nextUrl: new URL(url) } as never;
}

beforeEach(() => {
  storageCalls.length = 0;
  dbCalls.length = 0;
  order.length = 0;
  auditRows.length = 0;
  process.env.MASTER_ADMIN_EMAILS = 'jefa@yaentre.com';
});
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.MASTER_ADMIN_EMAILS;
  else process.env.MASTER_ADMIN_EMAILS = ORIGINAL;
});

describe('SUBIR — exige ADMIN, no exige maestro', () => {
  for (const [label, role] of [
    ['anónimo', null],
    ['STUDENT', 'STUDENT'],
    ['PARENT', 'PARENT'],
  ] as const) {
    it(`${label} no puede subir y no toca Storage`, async () => {
      identity.role = role;
      identity.email = role ? 'alguien@acierta-test.mx' : null;
      const result = await vaultActions.uploadVaultFileAction(pdfForm());
      expect(result.ok).toBe(false);
      expect(storageCalls).toEqual([]);
      expect(dbCalls).toEqual([]);
    });
  }

  it('ADMIN NO maestro SÍ puede subir', async () => {
    identity.role = 'ADMIN';
    identity.email = 'ayudante@yaentre.com';
    const result = await vaultActions.uploadVaultFileAction(pdfForm());
    expect(result.ok).toBe(true);
    expect(storageCalls).toContain('upload');
    expect(dbCalls).toContain('recordVaultFile');
    expect(auditRows[0]).toMatchObject({ action: 'vault.uploaded' });
  });

  it('un tipo fuera de la lista blanca se rechaza ANTES de tocar Storage', async () => {
    identity.role = 'ADMIN';
    identity.email = 'jefa@yaentre.com';
    const fd = new FormData();
    // .html SÍ está en la lista blanca (se puede ver/almacenar como texto
    // fuente, nunca como HTML ejecutable — ver src/lib/admin/vault.ts); un
    // ejecutable no lo está, y ese es el caso que esta prueba cubre.
    fd.set('file', new File([new Uint8Array([1])], 'x.exe', { type: 'application/x-msdownload' }));
    const result = await vaultActions.uploadVaultFileAction(fd);
    expect(result.ok).toBe(false);
    expect(storageCalls).toEqual([]);
    expect(auditRows[0]).toMatchObject({ metadata: { denied: 'VALIDATION' } });
  });

  it('.html SÍ se puede subir (lista blanca), pero se guarda para verse como texto, no como página', async () => {
    identity.role = 'ADMIN';
    identity.email = 'jefa@yaentre.com';
    const fd = new FormData();
    fd.set(
      'file',
      new File([new Uint8Array([1, 2, 3])], 'nota.html', { type: 'text/html' })
    );
    const result = await vaultActions.uploadVaultFileAction(fd);
    expect(result.ok).toBe(true);
    expect(storageCalls).toContain('upload');
    expect(dbCalls).toContain('recordVaultFile');
  });

  it('un archivo de 0 bytes se rechaza', async () => {
    identity.role = 'ADMIN';
    identity.email = 'jefa@yaentre.com';
    const fd = new FormData();
    fd.set('file', new File([], 'vacio.pdf', { type: 'application/pdf' }));
    const result = await vaultActions.uploadVaultFileAction(fd);
    expect(result.ok).toBe(false);
    expect(storageCalls).toEqual([]);
  });
});

describe('BORRAR — exige ADMIN **y** maestro', () => {
  for (const [label, role] of [
    ['anónimo', null],
    ['STUDENT', 'STUDENT'],
    ['PARENT', 'PARENT'],
  ] as const) {
    it(`${label} no puede borrar`, async () => {
      identity.role = role;
      identity.email = role ? 'alguien@acierta-test.mx' : null;
      const result = await vaultActions.deleteVaultFileAction({ fileId: FILE_ID, reason: REASON });
      expect(result.ok).toBe(false);
      expect(storageCalls).toEqual([]);
      expect(dbCalls).toEqual([]);
    });
  }

  it('ADMIN NO maestro NO puede borrar — y no toca Storage', async () => {
    identity.role = 'ADMIN';
    identity.email = 'ayudante@yaentre.com';
    const result = await vaultActions.deleteVaultFileAction({ fileId: FILE_ID, reason: REASON });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('FORBIDDEN');
    expect(storageCalls).toEqual([]);
    expect(dbCalls).toEqual([]);
    expect(auditRows[0]).toMatchObject({ metadata: { denied: 'NOT_MASTER' }, outcome: 'rejected' });
  });

  it('MASTER_ADMIN_EMAILS ausente: nadie borra', async () => {
    delete process.env.MASTER_ADMIN_EMAILS;
    identity.role = 'ADMIN';
    identity.email = 'jefa@yaentre.com';
    const result = await vaultActions.deleteVaultFileAction({ fileId: FILE_ID, reason: REASON });
    expect(result.ok).toBe(false);
    expect(storageCalls).toEqual([]);
  });

  it('ADMIN maestro borra: primero la fila, luego el objeto', async () => {
    identity.role = 'ADMIN';
    identity.email = 'jefa@yaentre.com';
    const result = await vaultActions.deleteVaultFileAction({ fileId: FILE_ID, reason: REASON });
    expect(result.ok).toBe(true);
    // El ORDEN importa: la fila se reclama primero (condicionada, para que dos
    // admins simultáneos no borren dos veces) y solo después se quita el
    // objeto del bucket.
    expect(order).toEqual(['softDeleteFile', 'remove']);
  });

  it('sin motivo no se borra nada', async () => {
    identity.role = 'ADMIN';
    identity.email = 'jefa@yaentre.com';
    const result = await vaultActions.deleteVaultFileAction({ fileId: FILE_ID, reason: 'no' });
    expect(result.ok).toBe(false);
    expect(storageCalls).toEqual([]);
    expect(dbCalls).toEqual([]);
  });
});

describe('Route Handler — el archivo no se sirve sin rol ADMIN', () => {
  for (const [label, role] of [
    ['anónimo', null],
    ['STUDENT', 'STUDENT'],
    ['PARENT', 'PARENT'],
  ] as const) {
    it(`${label} recibe 404 y no se descarga nada`, async () => {
      identity.role = role;
      identity.email = role ? 'alguien@acierta-test.mx' : null;
      const res = await route.GET(request(), { params: Promise.resolve({ id: FILE_ID }) });
      // 404, no 403: no se confirma siquiera que el archivo exista.
      expect(res.status).toBe(404);
      expect(storageCalls).toEqual([]);
    });
  }

  it('ADMIN recibe el archivo inline con las cabeceras no-store REALES', async () => {
    identity.role = 'ADMIN';
    identity.email = 'ayudante@yaentre.com';
    const res = await route.GET(request(), { params: Promise.resolve({ id: FILE_ID }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toBe('inline; filename="plan.pdf"');
    expect(res.headers.get('cache-control')).toBe('no-store, no-cache, must-revalidate, private');
    expect(res.headers.get('pragma')).toBe('no-cache');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    expect(storageCalls).toContain('download');
    expect(auditRows[0]).toMatchObject({ action: 'vault.viewed' });
  });

  it('?download=1 cambia a attachment y se audita como descarga', async () => {
    identity.role = 'ADMIN';
    identity.email = 'ayudante@yaentre.com';
    const res = await route.GET(
      request(`https://yaentre.com/api/admin/vault/${FILE_ID}?download=1`),
      { params: Promise.resolve({ id: FILE_ID }) }
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="plan.pdf"');
    expect(res.headers.get('cache-control')).toBe('no-store, no-cache, must-revalidate, private');
    expect(auditRows[0]).toMatchObject({ action: 'vault.downloaded' });
  });
});
