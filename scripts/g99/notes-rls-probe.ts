/**
 * scripts/g99/notes-rls-probe.ts — VERIFICACIÓN POR EFECTO de `admin_notes`.
 *
 *   G99_PROBE_PASSWORD=… pnpm admin:notes-rls
 *
 * Mismo patrón y la misma cuenta fixture que scripts/g99/rls-probe.ts (que
 * verifica `admin_audit_log`): ejecuta las operaciones REALES contra
 * `/rest/v1` —la misma API que alcanza cualquier navegador con la anon
 * key— en vez de preguntar si el GRANT está escrito.
 *
 * Control positivo primero (escribe con el módulo real `createNote` y
 * confirma que Prisma la ve), y limpieza garantizada al final.
 */
import '../g71/env';
import { PrismaClient } from '@prisma/client';
import { createNote } from '../../src/lib/db/admin-notes';

const prisma = new PrismaClient();

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PROBE_PASSWORD = process.env.G99_PROBE_PASSWORD ?? '';
const STUDENT_EMAIL = process.env.G99_PROBE_EMAIL ?? 'e2e.free@acierta-test.mx';

const MARKER = `g99-notes-probe-${Date.now()}`;

interface Check {
  id: string;
  descripcion: string;
  bloqueado: boolean;
  detalle: string;
}
const checks: Check[] = [];
function record(id: string, descripcion: string, bloqueado: boolean, detalle: string) {
  checks.push({ id, descripcion, bloqueado, detalle });
}

async function rest(
  token: string | null,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = { apikey: ANON, 'content-type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers.Prefer = 'return=representation';
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* cuerpo vacío o no-JSON */
  }
  return { status: res.status, body: parsed };
}

function blocked(r: { status: number; body: unknown }): boolean {
  if (r.status >= 400) return true;
  return Array.isArray(r.body) && r.body.length === 0;
}
function brief(r: { status: number; body: unknown }): string {
  const s = typeof r.body === 'string' ? r.body : JSON.stringify(r.body);
  return `HTTP ${r.status} ${(s ?? '').slice(0, 160)}`;
}

async function signIn(email: string): Promise<string | null> {
  if (!PROBE_PASSWORD) return null;
  const res = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PROBE_PASSWORD }),
  });
  const body = (await res.json()) as { access_token?: string };
  if (!res.ok || !body.access_token) {
    throw new Error(`login ${email}: ${res.status} ${JSON.stringify(body)}`);
  }
  return body.access_token;
}

async function main() {
  console.log('admin_notes — RLS verificada POR EFECTO contra /rest/v1\n');

  // ── 0. CONTROL POSITIVO ───────────────────────────────────────────────
  const anyProfile = await prisma.userProfile.findFirstOrThrow({ select: { id: true } });
  await createNote({ content: MARKER, authorId: anyProfile.id, authorEmail: MARKER });

  const written = await prisma.adminNote.findFirst({ where: { content: MARKER }, select: { id: true } });
  if (!written) {
    console.error(
      '🛑 CONTROL POSITIVO FALLIDO: la fila no se escribió o Prisma no la ve.\n' +
        '   Sin esto, cualquier "0 filas" de abajo no probaría nada. Se aborta.'
    );
    process.exitCode = 1;
    return;
  }
  console.log(`✅ Control positivo: nota ${written.id} escrita por la app y visible vía Prisma.\n`);

  try {
    // ── 1. ANÓNIMO ───────────────────────────────────────────────────────
    const anonRead = await rest(null, 'GET', 'admin_notes?select=*&limit=5');
    record('ANON-select', 'anónimo LEE admin_notes', blocked(anonRead), brief(anonRead));

    const anonMarker = await rest(null, 'GET', `admin_notes?select=*&content=eq.${MARKER}`);
    record(
      'ANON-select-marcador',
      'anónimo lee LA NOTA que acabamos de escribir',
      blocked(anonMarker),
      brief(anonMarker)
    );

    const anonInsert = await rest(null, 'POST', 'admin_notes', {
      id: 'g99notesprobe_anon',
      content: 'forjada',
    });
    record('ANON-insert', 'anónimo FABRICA una nota', blocked(anonInsert), brief(anonInsert));

    const anonDelete = await rest(null, 'DELETE', `admin_notes?content=eq.${MARKER}`);
    record('ANON-delete', 'anónimo BORRA la nota', blocked(anonDelete), brief(anonDelete));

    // ── 2. SESIÓN REAL DE STUDENT ───────────────────────────────────────
    const jwt = await signIn(STUDENT_EMAIL);
    if (!jwt) {
      console.log(
        '⚠️  Sin G99_PROBE_PASSWORD: no se probó con sesión STUDENT real.\n' +
          '    Los casos anónimos sí corrieron.\n'
      );
    } else {
      console.log(`Sesión real obtenida para ${STUDENT_EMAIL}.\n`);
      const stuRead = await rest(jwt, 'GET', 'admin_notes?select=*&limit=5');
      record('STU-select', 'STUDENT LEE admin_notes', blocked(stuRead), brief(stuRead));

      const stuMarker = await rest(jwt, 'GET', `admin_notes?select=*&content=eq.${MARKER}`);
      record(
        'STU-select-marcador',
        'STUDENT lee LA NOTA que acabamos de escribir',
        blocked(stuMarker),
        brief(stuMarker)
      );

      const stuInsert = await rest(jwt, 'POST', 'admin_notes', {
        id: 'g99notesprobe_stu',
        content: 'forjada',
      });
      record('STU-insert', 'STUDENT FABRICA una nota', blocked(stuInsert), brief(stuInsert));

      const stuDelete = await rest(jwt, 'DELETE', `admin_notes?content=eq.${MARKER}`);
      record('STU-delete', 'STUDENT BORRA la nota', blocked(stuDelete), brief(stuDelete));

      const stuUpdate = await rest(jwt, 'PATCH', `admin_notes?content=eq.${MARKER}`, {
        content: 'alterada',
      });
      record('STU-update', 'STUDENT ALTERA el contenido', blocked(stuUpdate), brief(stuUpdate));
    }

    // ── 3. La nota sigue intacta tras todos los intentos ────────────────
    const still = await prisma.adminNote.findFirst({
      where: { id: written.id },
      select: { content: true },
    });
    record(
      'INTEGRIDAD',
      'la nota sobrevive intacta a los intentos de borrado/alteración',
      still?.content === MARKER,
      `content=${JSON.stringify(still?.content ?? null)}`
    );

    // ── Reporte ─────────────────────────────────────────────────────────
    const fallos = checks.filter((c) => !c.bloqueado);
    console.log('┌─ Resultado ──────────────────────────────────────────────────');
    for (const c of checks) {
      console.log(
        `│ ${c.bloqueado ? '✅ BLOQUEADO' : '❌ PERMITIDO'}  ${c.id.padEnd(22)} ${c.descripcion}`
      );
      if (!c.bloqueado) console.log(`│      ↳ ${c.detalle}`);
    }
    console.log('└──────────────────────────────────────────────────────────────');
    console.log(`\n${checks.length - fallos.length}/${checks.length} intentos ilegítimos bloqueados.`);
    if (fallos.length > 0) {
      console.log(`\n⚠️  ${fallos.length} AGUJERO(S).`);
      process.exitCode = 1;
    }
  } finally {
    const deleted = await prisma.adminNote.deleteMany({ where: { content: MARKER } });
    console.log(`\nLimpieza: ${deleted.count} nota(s) de sonda borrada(s).`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
