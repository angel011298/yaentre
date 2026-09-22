/**
 * scripts/g99/prod-probe.ts — G99, verificación EN PRODUCCIÓN por efecto.
 *
 *   G99_PROBE_PASSWORD=… pnpm admin:prod-probe
 *
 * Responde, contra `https://yaentre.com` real, las dos preguntas del criterio
 * de aceptación que no se pueden contestar con pruebas unitarias:
 *
 *   1. ¿Un ADMIN llega de verdad a /admin/usuarios y /admin/bitacora?
 *   2. ¿Una cuenta sin rol ADMIN recibe rechazo **tanto en la página como
 *      invocando la Server Action sin pasar por la interfaz**?
 *
 * ── Por qué se invoca la acción a mano ─────────────────────────────────────
 *
 * Esconder un botón no cierra nada: Next.js expone cada Server Action como un
 * POST a la misma URL de la página que la importa, con la cabecera
 * `Next-Action: <id>`. Ese id se hornea en el bundle durante el build, así que
 * no se puede adivinar — se cosecha del JS servido (G98).
 *
 * El orden importa y es deliberado: los ids se cosechan MIENTRAS la cuenta es
 * ADMIN, y luego se REPLAYAN ya degradada a STUDENT. Así se prueba que quien
 * rechaza es la acción misma, no la inaccesibilidad de la página. Es el caso
 * real de un administrador al que se le retiró el acceso y que conserva el id.
 *
 * La cuenta fixture se promueve y se DEGRADA dentro de la misma corrida, pase
 * lo que pase (`finally`). Una sonda que deja una cuenta con rol ADMIN en
 * producción es un defecto propio (G71 §6 D6).
 */
import '../g71/env';
import { chromium, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const BASE = 'https://yaentre.com';
const FIXTURE_DOMAIN = '@acierta-test.mx';
const EMAIL = process.env.G99_PROBE_EMAIL ?? 'e2e.free@acierta-test.mx';
const PASSWORD = process.env.G99_PROBE_PASSWORD ?? '';

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

interface Result {
  id: string;
  ok: boolean;
  detalle: string;
}
const results: Result[] = [];
const record = (id: string, ok: boolean, detalle: string): void => {
  results.push({ id, ok, detalle });
  console.log(`  ${ok ? '✅' : '❌'} ${id} — ${detalle}`);
};
const paso = (m: string): void => console.log(`\n· ${m}`);

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/correo/i).fill(EMAIL);
  await page.getByLabel(/contraseña/i).fill(PASSWORD);
  await page.getByRole('button', { name: /entrar|iniciar/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45_000 });
}

async function setRole(profileId: string, role: 'ADMIN' | 'STUDENT'): Promise<void> {
  await prisma.userProfile.update({ where: { id: profileId }, data: { role } });
  const after = await prisma.userProfile.findUnique({
    where: { id: profileId },
    select: { role: true },
  });
  if (after?.role !== role) throw new Error(`No se pudo fijar el rol a ${role}`);
}

/** Cosecha los ids de Server Action del bundle de la página dada. */
async function harvestActionIds(page: Page): Promise<string[]> {
  const srcs: string[] = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[src]')).map((s) => (s as HTMLScriptElement).src)
  );
  const ids = new Set<string>();
  for (const url of srcs) {
    const text: string = await page.evaluate(async (u) => {
      try {
        return await (await fetch(u)).text();
      } catch {
        return '';
      }
    }, url);
    for (const m of text.matchAll(/createServerReference\)?\s*\(\s*["']([0-9a-f]{32,64})["']/g)) {
      ids.add(m[1]);
    }
    for (const m of text.matchAll(/["']([0-9a-f]{40})["']\s*,\s*[a-zA-Z$_]+\.callServer/g)) {
      ids.add(m[1]);
    }
  }
  return [...ids];
}

/** Invoca una Server Action por su id, contra la URL de la página que la importa. */
async function invokeAction(
  page: Page,
  pagePath: string,
  actionId: string,
  args: unknown[]
): Promise<{ status: number; body: string }> {
  return page.evaluate(
    async ({ path, id, payload }) => {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Next-Action': id, 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(payload),
      });
      return { status: res.status, body: (await res.text()).slice(0, 4000) };
    },
    { path: pagePath, id: actionId, payload: args }
  );
}

async function main() {
  if (!PASSWORD) {
    console.error('Falta G99_PROBE_PASSWORD (contraseña temporal de la cuenta fixture).');
    process.exitCode = 1;
    return;
  }
  if (!EMAIL.toLowerCase().endsWith(FIXTURE_DOMAIN)) {
    console.error(`La sonda solo corre con cuentas fixture (${FIXTURE_DOMAIN}). Recibido: ${EMAIL}`);
    process.exitCode = 1;
    return;
  }

  console.log(`G99 — verificación en PRODUCCIÓN (${BASE})\n`);

  const rows = await prisma.$queryRaw<Array<{ profileId: string }>>`
    SELECT "profileId" FROM app_security.profile_ids_by_email_search(${EMAIL})
  `;
  const profileId = rows[0]?.profileId;
  if (!profileId) throw new Error(`No hay perfil para ${EMAIL}`);
  console.log(`Cuenta fixture: ${EMAIL} → perfil ${profileId}`);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  let promoted = false;
  let actionIds: string[] = [];
  const auditBefore = await prisma.adminAuditLog.count();

  try {
    // ── FASE 1: como ADMIN (no maestro) ─────────────────────────────────
    paso('FASE 1 — la cuenta fixture se promueve a ADMIN (temporal)');
    await setRole(profileId, 'ADMIN');
    promoted = true;
    await login(page);

    const usuarios = await page.goto(`${BASE}/admin/usuarios`, { waitUntil: 'domcontentloaded' });
    const usuariosOk =
      usuarios !== null &&
      usuarios.status() === 200 &&
      page.url().includes('/admin/usuarios') &&
      (await page.getByRole('heading', { name: /usuarios/i }).count()) > 0;
    record(
      'ADMIN-usuarios',
      usuariosOk,
      `HTTP ${usuarios?.status()} en ${page.url()} — encabezado «Usuarios» ${usuariosOk ? 'presente' : 'AUSENTE'}`
    );

    const bitacora = await page.goto(`${BASE}/admin/bitacora`, { waitUntil: 'domcontentloaded' });
    const bitacoraOk =
      bitacora !== null &&
      bitacora.status() === 200 &&
      (await page.getByRole('heading', { name: /bit[áa]cora/i }).count()) > 0;
    record('ADMIN-bitacora', bitacoraOk, `HTTP ${bitacora?.status()} en ${page.url()}`);

    // Cosechar ids desde el detalle de una cuenta (ahí viven las acciones).
    await page.goto(`${BASE}/admin/usuarios/${profileId}`, { waitUntil: 'domcontentloaded' });
    actionIds = await harvestActionIds(page);
    console.log(`    (ids de Server Action hallados: ${actionIds.length})`);

    // ── FASE 2: ADMIN NO maestro invoca una acción destructiva ──────────
    paso('FASE 2 — ADMIN que NO está en MASTER_ADMIN_EMAILS invoca la acción a mano');
    let masterBlocked: { status: number; body: string } | null = null;
    for (const id of actionIds) {
      const out = await invokeAction(page, `/admin/usuarios/${profileId}`, id, [
        { userProfileId: profileId, reason: 'Sonda G99 de verificación en producción.' },
      ]);
      if (out.body.includes('administrador maestro') || out.body.includes('FORBIDDEN')) {
        masterBlocked = out;
        console.log(`    · ${id.slice(0, 12)}… → HTTP ${out.status} (respuesta de la acción)`);
        break;
      }
    }
    record(
      'ADMIN-no-maestro-bloqueado',
      masterBlocked !== null,
      masterBlocked
        ? `la acción respondió con rechazo de maestro: ${masterBlocked.body.slice(0, 120)}`
        : 'NINGUNA acción respondió con rechazo — revisar'
    );

    // ── FASE 3: degradar a STUDENT y REPLAYAR los mismos ids ────────────
    paso('FASE 3 — la cuenta se degrada a STUDENT y se repiten los MISMOS ids');
    await setRole(profileId, 'STUDENT');
    promoted = false;

    const pageAsStudent = await page.goto(`${BASE}/admin/usuarios`, {
      waitUntil: 'domcontentloaded',
    });
    const studentRedirected = !page.url().includes('/admin');
    record(
      'STUDENT-pagina-rechazada',
      studentRedirected,
      `HTTP ${pageAsStudent?.status()} y terminó en ${page.url()}`
    );

    // La acción se invoca desde una página que el STUDENT SÍ puede cargar:
    // el POST va a la ruta de la página, pero quien decide es la acción.
    await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
    let studentBlockedAll = actionIds.length > 0;
    const detalles: string[] = [];
    for (const id of actionIds) {
      const out = await invokeAction(page, `/admin/usuarios/${profileId}`, id, [
        { userProfileId: profileId, reason: 'Sonda G99 de verificación en producción.' },
      ]);
      const leaked =
        out.body.includes('"ok":true') || out.body.includes('Listo') || out.status === 500;
      if (leaked) {
        studentBlockedAll = false;
        detalles.push(`${id.slice(0, 12)}… → HTTP ${out.status} ${out.body.slice(0, 120)}`);
      }
    }
    record(
      'STUDENT-accion-rechazada',
      studentBlockedAll,
      studentBlockedAll
        ? `los ${actionIds.length} ids cosechados como ADMIN fueron rechazados ya como STUDENT`
        : `FUGA: ${detalles.join(' | ')}`
    );

    // ── FASE 4: la bitácora registró los intentos ───────────────────────
    paso('FASE 4 — los intentos quedaron en la bitácora');
    const auditAfter = await prisma.adminAuditLog.count();
    record(
      'BITACORA-registra-intentos',
      auditAfter > auditBefore,
      `filas antes=${auditBefore}, después=${auditAfter} (+${auditAfter - auditBefore})`
    );
  } finally {
    if (promoted) {
      console.log('\n⚠️  Restaurando el rol de la cuenta fixture a STUDENT…');
      await setRole(profileId, 'STUDENT').catch((e) => console.error('  fallo al degradar:', e));
    }
    const finalRole = await prisma.userProfile.findUnique({
      where: { id: profileId },
      select: { role: true },
    });
    console.log(`Rol final de la cuenta fixture (releído de la base): ${finalRole?.role}`);
    await browser.close();
  }

  console.log('\n┌─ Resultado ──────────────────────────────────────────────────');
  for (const r of results) console.log(`│ ${r.ok ? '✅' : '❌'} ${r.id}`);
  console.log('└──────────────────────────────────────────────────────────────');
  const fallos = results.filter((r) => !r.ok);
  console.log(`\n${results.length - fallos.length}/${results.length} comprobaciones en verde.`);
  if (fallos.length > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
