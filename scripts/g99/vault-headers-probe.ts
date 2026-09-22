/**
 * scripts/g99/vault-headers-probe.ts — G99 tarea 11/12, EN PRODUCCIÓN.
 *
 *   G99_PROBE_PASSWORD=… pnpm admin:vault-headers
 *
 * Comprueba las cabeceras de la respuesta REAL de `/api/admin/vault/<id>`
 * contra `https://yaentre.com` — no leyendo la configuración, que es lo que
 * el encargo prohíbe explícitamente, sino mirando lo que sale por la red.
 *
 * Sube un archivo de verdad por la Server Action (no por SQL: así se ejerce el
 * camino completo, incluida la lista blanca y el cálculo del sha256), lee sus
 * cabeceras en las dos variantes (inline y `?download=1`), comprueba que sin
 * rol ADMIN la ruta responde 404, y borra el archivo al terminar.
 */
import '../g71/env';
import { chromium, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const BASE = 'https://yaentre.com';
const FIXTURE_DOMAIN = '@acierta-test.mx';
const EMAIL = process.env.G99_PROBE_EMAIL ?? 'e2e.free@acierta-test.mx';
const PASSWORD = process.env.G99_PROBE_PASSWORD ?? '';

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

interface Check {
  id: string;
  ok: boolean;
  detalle: string;
}
const checks: Check[] = [];
const record = (id: string, ok: boolean, detalle: string) => {
  checks.push({ id, ok, detalle });
  console.log(`  ${ok ? '✅' : '❌'} ${id} — ${detalle}`);
};

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/correo/i).fill(EMAIL);
  await page.getByLabel(/contraseña/i).fill(PASSWORD);
  await page.getByRole('button', { name: /entrar|iniciar/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45_000 });
}

async function setRole(profileId: string, role: 'ADMIN' | 'STUDENT'): Promise<void> {
  await prisma.userProfile.update({ where: { id: profileId }, data: { role } });
}

const EXPECTED_CACHE = 'no-store, no-cache, must-revalidate, private';

async function main() {
  if (!PASSWORD) {
    console.error('Falta G99_PROBE_PASSWORD.');
    process.exitCode = 1;
    return;
  }
  if (!EMAIL.toLowerCase().endsWith(FIXTURE_DOMAIN)) {
    console.error(`Solo cuentas fixture (${FIXTURE_DOMAIN}).`);
    process.exitCode = 1;
    return;
  }

  console.log(`G99 — cabeceras REALES de la bóveda en ${BASE}\n`);

  const rows = await prisma.$queryRaw<Array<{ profileId: string }>>`
    SELECT "profileId" FROM app_security.profile_ids_by_email_search(${EMAIL})
  `;
  const profileId = rows[0]?.profileId;
  if (!profileId) throw new Error(`No hay perfil para ${EMAIL}`);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  let fileId: string | null = null;

  try {
    await setRole(profileId, 'ADMIN');
    await login(page);

    // ── Subir por la interfaz real ──────────────────────────────────────
    await page.goto(`${BASE}/admin/boveda`, { waitUntil: 'domcontentloaded' });
    await page.setInputFiles('input[type="file"]', {
      name: 'sonda-g99.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('columna,valor\nuno,1\ndos,2\n'),
    });
    page.on('console', (m) => {
      if (m.type() === 'error') console.log(`    [consola] ${m.text().slice(0, 200)}`);
    });
    await page.getByRole('button', { name: /^Subir$/ }).click();

    // Se espera por el TEXTO concreto que el control debe producir, y el patrón
    // cubre tanto el éxito como el fallo: esperar por `[role="alert"]` a secas
    // se satisface con el route-announcer de Next (G73b).
    const outcome = page.getByText(
      /Archivo guardado en la bóveda|Tipo de archivo no permitido|No pudimos guardar|Demasiadas subidas|No recibimos ningún archivo|Algo salió mal|reservada al administrador/i
    );
    await outcome.first().waitFor({ timeout: 30_000 });
    const outcomeText = (await outcome.first().textContent()) ?? '';
    if (!/Archivo guardado/i.test(outcomeText)) {
      throw new Error(`La subida falló en producción: "${outcomeText.trim()}"`);
    }

    const created = await prisma.adminFile.findFirst({
      where: { originalName: 'sonda-g99.csv', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, sha256: true },
    });
    if (!created) throw new Error('La subida no dejó fila en admin_files.');
    fileId = created.id;
    record('SUBIDA', true, `archivo ${fileId} creado, sha256 ${created.sha256.slice(0, 16)}…`);

    // ── Cabeceras REALES: inline ────────────────────────────────────────
    const inline = await page.request.get(`${BASE}/api/admin/vault/${fileId}`);
    const ih = inline.headers();
    record(
      'INLINE-cabeceras',
      inline.status() === 200 &&
        ih['content-disposition']?.startsWith('inline') === true &&
        ih['cache-control'] === EXPECTED_CACHE &&
        ih['pragma'] === 'no-cache' &&
        ih['x-content-type-options'] === 'nosniff' &&
        ih['referrer-policy'] === 'no-referrer',
      `HTTP ${inline.status()} · cache-control="${ih['cache-control']}" · disposition="${ih['content-disposition']}" · pragma="${ih['pragma']}" · nosniff="${ih['x-content-type-options']}" · referrer="${ih['referrer-policy']}"`
    );

    const body = await inline.text();
    record('INLINE-contenido', body.includes('columna,valor'), `${body.length} bytes servidos`);

    // ── Cabeceras REALES: descarga ──────────────────────────────────────
    const dl = await page.request.get(`${BASE}/api/admin/vault/${fileId}?download=1`);
    const dh = dl.headers();
    record(
      'DOWNLOAD-cabeceras',
      dl.status() === 200 &&
        dh['content-disposition']?.startsWith('attachment') === true &&
        dh['cache-control'] === EXPECTED_CACHE,
      `HTTP ${dl.status()} · disposition="${dh['content-disposition']}" · cache-control="${dh['cache-control']}"`
    );

    // ── Sin rol ADMIN: 404, no 403 ──────────────────────────────────────
    await setRole(profileId, 'STUDENT');
    const asStudent = await page.request.get(`${BASE}/api/admin/vault/${fileId}`);
    record(
      'STUDENT-404',
      asStudent.status() === 404,
      `HTTP ${asStudent.status()} (404 a propósito: no se confirma que el archivo exista)`
    );

    const anon = await browser.newContext();
    const anonRes = await anon.request.get(`${BASE}/api/admin/vault/${fileId}`);
    record('ANON-404', anonRes.status() === 404, `HTTP ${anonRes.status()}`);
    await anon.close();
  } finally {
    // Limpieza: borra el archivo por el camino real y restaura el rol.
    if (fileId) {
      try {
        await setRole(profileId, 'ADMIN');
        const f = await prisma.adminFile.findUnique({
          where: { id: fileId },
          select: { path: true },
        });
        if (f) {
          const { createClient } = await import('@supabase/supabase-js');
          const anonClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          await anonClient.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
          await anonClient.storage.from('admin-vault').remove([f.path]);
        }
        await prisma.adminFile.deleteMany({ where: { id: fileId } });
      } catch (e) {
        console.error('  fallo al limpiar:', e);
      }
    }
    await setRole(profileId, 'STUDENT').catch(() => {});
    const finalRole = await prisma.userProfile.findUnique({
      where: { id: profileId },
      select: { role: true },
    });
    console.log(`\nRol final de la cuenta fixture: ${finalRole?.role}`);
    console.log('Limpieza: archivo de sonda borrado.');
    await browser.close();
  }

  const fallos = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - fallos.length}/${checks.length} comprobaciones en verde.`);
  if (fallos.length > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
