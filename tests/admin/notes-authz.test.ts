import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError } from '@/lib/auth/errors';

/**
 * Autorización de las Notas del panel (apartado dentro de /admin/boveda).
 *
 * Igual que `vault-authz.test.ts`: la pregunta no es «¿devuelve error?», sino
 * **¿llega a tocar la base?** — el doble de `src/lib/db/admin-notes` registra
 * cada llamada y los caminos denegados exigen ese registro VACÍO.
 *
 * Reparto de privilegio: anónimo / STUDENT / PARENT → nada. Cualquier ADMIN
 * (no hace falta maestro) → crear, ver y borrar. Es deliberadamente MÁS
 * permisivo que las acciones de cuentas/bóveda (que si exigen maestro para
 * lo destructivo): una nota es un apunte interno de bajo riesgo, no algo que
 * mueva dinero o cambie el acceso de una cuenta.
 */

const dbCalls: string[] = [];
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

vi.mock('@/lib/db/admin-notes', () => ({
  createNote: vi.fn(async (input: { content: string }) => {
    dbCalls.push('createNote');
    return {
      id: 'cku0000000000000000000nn1',
      content: input.content,
      authorEmail: identity.email,
      createdAt: new Date('2026-09-22T00:00:00.000Z'),
      updatedAt: new Date('2026-09-22T00:00:00.000Z'),
    };
  }),
  deleteNote: vi.fn(async (id: string) => {
    dbCalls.push('deleteNote');
    return {
      id,
      content: 'contenido de prueba',
      authorEmail: 'jefa@yaentre.com',
      createdAt: new Date('2026-09-22T00:00:00.000Z'),
      updatedAt: new Date('2026-09-22T00:00:00.000Z'),
    };
  }),
}));

vi.mock('@/lib/rate-limit/store', () => ({
  consumeRateLimit: vi.fn(async () => ({ allowed: true, hits: 1, retryAfterSecs: 0 })),
}));

vi.mock('@/lib/admin/audit-log', () => ({
  logAdminAction: vi.fn(async (action: string, actor: unknown, details: unknown) => {
    auditRows.push({ action, actor, ...(details as object) });
  }),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const actions = await import('@/app/actions/admin-notes');
const { consumeRateLimit } = await import('@/lib/rate-limit/store');

const NOTE_ID = 'cku0000000000000000000nn1';
const CONTENT = 'Recordatorio: revisar el lote de Geografía la próxima semana.';

function beAnonymous() {
  identity.role = null;
  identity.email = null;
}
function beRole(role: 'STUDENT' | 'PARENT' | 'ADMIN', email: string) {
  identity.role = role;
  identity.email = email;
}

beforeEach(() => {
  dbCalls.length = 0;
  auditRows.length = 0;
  vi.mocked(consumeRateLimit).mockResolvedValue({ allowed: true, hits: 1, retryAfterSecs: 0 });
});

describe('crear una nota', () => {
  it('anónimo no puede crear y no toca la base', async () => {
    beAnonymous();
    const result = await actions.createNoteAction({ content: CONTENT });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('UNAUTHORIZED');
    expect(dbCalls).toEqual([]);
  });

  it('STUDENT no puede crear y no toca la base', async () => {
    beRole('STUDENT', 'alumna@acierta-test.mx');
    const result = await actions.createNoteAction({ content: CONTENT });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('FORBIDDEN');
    expect(dbCalls).toEqual([]);
  });

  it('PARENT no puede crear y no toca la base', async () => {
    beRole('PARENT', 'tutor@acierta-test.mx');
    const result = await actions.createNoteAction({ content: CONTENT });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('FORBIDDEN');
    expect(dbCalls).toEqual([]);
  });

  it('cualquier ADMIN (no hace falta maestro) SÍ puede crear', async () => {
    beRole('ADMIN', 'ayudante@yaentre.com'); // no está en ninguna lista de maestros
    const result = await actions.createNoteAction({ content: CONTENT });
    expect(result.ok).toBe(true);
    expect(dbCalls).toEqual(['createNote']);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]).toMatchObject({ action: 'note.created', targetKind: 'note' });
  });

  it('contenido vacío se rechaza y no toca la base', async () => {
    beRole('ADMIN', 'ayudante@yaentre.com');
    const result = await actions.createNoteAction({ content: '   ' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('VALIDATION');
    expect(dbCalls).toEqual([]);
  });

  it('contenido de más de 5000 caracteres se rechaza', async () => {
    beRole('ADMIN', 'ayudante@yaentre.com');
    const result = await actions.createNoteAction({ content: 'x'.repeat(5001) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('VALIDATION');
    expect(dbCalls).toEqual([]);
  });

  it('límite de tasa alcanzado: rechazo controlado, no toca la base', async () => {
    beRole('ADMIN', 'ayudante@yaentre.com');
    vi.mocked(consumeRateLimit).mockResolvedValue({ allowed: false, hits: 121, retryAfterSecs: 300 });
    const result = await actions.createNoteAction({ content: CONTENT });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('RATE_LIMIT');
    expect(dbCalls).toEqual([]);
  });
});

describe('borrar una nota', () => {
  it('anónimo no puede borrar y no toca la base', async () => {
    beAnonymous();
    const result = await actions.deleteNoteAction({ noteId: NOTE_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('UNAUTHORIZED');
    expect(dbCalls).toEqual([]);
  });

  it('STUDENT no puede borrar y no toca la base', async () => {
    beRole('STUDENT', 'alumna@acierta-test.mx');
    const result = await actions.deleteNoteAction({ noteId: NOTE_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('FORBIDDEN');
    expect(dbCalls).toEqual([]);
  });

  it('PARENT no puede borrar y no toca la base', async () => {
    beRole('PARENT', 'tutor@acierta-test.mx');
    const result = await actions.deleteNoteAction({ noteId: NOTE_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('FORBIDDEN');
    expect(dbCalls).toEqual([]);
  });

  it('cualquier ADMIN (no hace falta maestro) SÍ puede borrar — incluida la nota de otro admin', async () => {
    beRole('ADMIN', 'ayudante@yaentre.com');
    const result = await actions.deleteNoteAction({ noteId: NOTE_ID });
    expect(result.ok).toBe(true);
    expect(dbCalls).toEqual(['deleteNote']);
    expect(auditRows[0]).toMatchObject({ action: 'note.deleted', targetKind: 'note' });
  });

  it('un id que no es cuid se rechaza antes de tocar la base', async () => {
    beRole('ADMIN', 'ayudante@yaentre.com');
    const result = await actions.deleteNoteAction({ noteId: "1 OR 1=1; DROP TABLE admin_notes--" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('VALIDATION');
    expect(dbCalls).toEqual([]);
  });

  it('límite de tasa alcanzado: rechazo controlado, no toca la base', async () => {
    beRole('ADMIN', 'ayudante@yaentre.com');
    vi.mocked(consumeRateLimit).mockResolvedValue({ allowed: false, hits: 121, retryAfterSecs: 300 });
    const result = await actions.deleteNoteAction({ noteId: NOTE_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('RATE_LIMIT');
    expect(dbCalls).toEqual([]);
  });
});
