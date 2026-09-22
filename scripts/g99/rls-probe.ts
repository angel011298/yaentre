/**
 * scripts/g99/rls-probe.ts — G99 tarea 2, VERIFICACIÓN POR EFECTO.
 *
 *   pnpm admin:rls
 *
 * La bitácora no se lee nunca desde el navegador. Esta sonda no pregunta si el
 * GRANT está escrito ni si `relrowsecurity` es `true` — eso es verificar
 * código. Ejecuta las operaciones REALES contra `/rest/v1`, la misma API
 * pública que alcanza cualquier navegador con `NEXT_PUBLIC_SUPABASE_ANON_KEY`
 * (que va en el bundle, es pública por diseño), y mira qué pasa (G73b).
 *
 * ── CONTROL POSITIVO: por qué el verde significa algo ──────────────────────
 *
 * Una sonda que comprueba «no devuelve filas» pasa igual de bien si la tabla
 * está vacía, si el nombre está mal escrito o si la petición nunca sale. Por
 * eso la sonda PRIMERO escribe una fila con un marcador único usando el módulo
 * real de la app (`logAdminAction`), y comprueba que Prisma SÍ la ve. Si ese
 * control positivo falla, la sonda se detiene: el resto de los verdes no
 * probarían nada (G71 §6 D6).
 *
 * ── Limpieza ───────────────────────────────────────────────────────────────
 * La fila de prueba se borra al terminar, pase lo que pase. Una sonda que deja
 * basura en producción es un defecto propio (G71 §6 D6).
 *
 * Requiere `G99_PROBE_PASSWORD` con la contraseña temporal de la cuenta
 * fixture STUDENT (se fija por SQL y se restaura el hash al terminar — mismo
 * método que G65/G98).
 */
import '../g71/env';
import { PrismaClient } from '@prisma/client';
import { logAdminAction } from '../../src/lib/admin/audit-log';

const prisma = new PrismaClient();

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PROBE_PASSWORD = process.env.G99_PROBE_PASSWORD ?? '';
const STUDENT_EMAIL = process.env.G99_PROBE_EMAIL ?? 'e2e.free@acierta-test.mx';

const MARKER = `g99-rls-probe-${Date.now()}`;

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
  console.log('G99 — RLS de la bitácora, verificada POR EFECTO contra /rest/v1\n');

  // ── 0. CONTROL POSITIVO ───────────────────────────────────────────────
  // Escribe con el módulo REAL de la app, y comprueba que Prisma la ve.
  await logAdminAction(
    'admin.promoted',
    { userProfileId: null as unknown as string, email: MARKER },
    { targetKind: 'system', reason: 'sonda G99 de RLS', metadata: { marker: MARKER } }
  );

  const written = await prisma.adminAuditLog.findFirst({
    where: { actorEmail: MARKER },
    select: { id: true },
  });
  if (!written) {
    console.error(
      '🛑 CONTROL POSITIVO FALLIDO: la fila no se escribió o Prisma no la ve.\n' +
        '   Sin esto, cualquier "0 filas" de abajo no probaría nada. Se aborta.'
    );
    process.exitCode = 1;
    return;
  }
  console.log(`✅ Control positivo: fila ${written.id} escrita por la app y visible vía Prisma.\n`);

  try {
    // ── 1. ANÓNIMO (solo la anon key del bundle) ────────────────────────
    const anonRead = await rest(null, 'GET', 'admin_audit_log?select=*&limit=5');
    record('ANON-select', 'anónimo LEE admin_audit_log', blocked(anonRead), brief(anonRead));

    const anonMarker = await rest(
      null,
      'GET',
      `admin_audit_log?select=*&actorEmail=eq.${MARKER}`
    );
    record(
      'ANON-select-marcador',
      'anónimo lee LA FILA que acabamos de escribir',
      blocked(anonMarker),
      brief(anonMarker)
    );

    const anonInsert = await rest(null, 'POST', 'admin_audit_log', {
      id: 'g99probe_anon',
      action: 'forjada',
      targetKind: 'system',
    });
    record('ANON-insert', 'anónimo FABRICA una fila de bitácora', blocked(anonInsert), brief(anonInsert));

    const anonDelete = await rest(null, 'DELETE', `admin_audit_log?actorEmail=eq.${MARKER}`);
    record('ANON-delete', 'anónimo BORRA su rastro', blocked(anonDelete), brief(anonDelete));

    // ── 2. SESIÓN REAL DE STUDENT ───────────────────────────────────────
    const jwt = await signIn(STUDENT_EMAIL);
    if (!jwt) {
      console.log(
        '⚠️  Sin G99_PROBE_PASSWORD: no se probó con sesión STUDENT real.\n' +
          '    Los casos anónimos sí corrieron. Para la prueba completa, fija la\n' +
          '    contraseña temporal de la cuenta fixture y vuelve a correr.\n'
      );
    } else {
      console.log(`Sesión real obtenida para ${STUDENT_EMAIL}.\n`);
      const stuRead = await rest(jwt, 'GET', 'admin_audit_log?select=*&limit=5');
      record('STU-select', 'STUDENT LEE admin_audit_log', blocked(stuRead), brief(stuRead));

      const stuMarker = await rest(
        jwt,
        'GET',
        `admin_audit_log?select=*&actorEmail=eq.${MARKER}`
      );
      record(
        'STU-select-marcador',
        'STUDENT lee LA FILA que acabamos de escribir',
        blocked(stuMarker),
        brief(stuMarker)
      );

      const stuInsert = await rest(jwt, 'POST', 'admin_audit_log', {
        id: 'g99probe_stu',
        action: 'forjada',
        targetKind: 'system',
      });
      record('STU-insert', 'STUDENT FABRICA una fila', blocked(stuInsert), brief(stuInsert));

      const stuDelete = await rest(jwt, 'DELETE', `admin_audit_log?actorEmail=eq.${MARKER}`);
      record('STU-delete', 'STUDENT BORRA el rastro', blocked(stuDelete), brief(stuDelete));

      const stuUpdate = await rest(jwt, 'PATCH', `admin_audit_log?actorEmail=eq.${MARKER}`, {
        reason: 'alterada',
      });
      record('STU-update', 'STUDENT ALTERA el motivo', blocked(stuUpdate), brief(stuUpdate));
    }

    // ── 3. La fila sigue intacta tras todos los intentos ────────────────
    const still = await prisma.adminAuditLog.findFirst({
      where: { actorEmail: MARKER },
      select: { reason: true },
    });
    record(
      'INTEGRIDAD',
      'la fila sobrevive intacta a los intentos de borrado/alteración',
      still?.reason === 'sonda G99 de RLS',
      `reason=${JSON.stringify(still?.reason ?? null)}`
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
    // La sonda BORRA lo que creó, pase lo que pase.
    const deleted = await prisma.adminAuditLog.deleteMany({ where: { actorEmail: MARKER } });
    console.log(`\nLimpieza: ${deleted.count} fila(s) de sonda borrada(s).`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
