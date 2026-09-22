/**
 * scripts/g99/html-headers-probe.ts — EN PRODUCCIÓN.
 *
 *   G99_PROBE_PASSWORD=… pnpm admin:html-headers
 *
 * Sube un `.html` REAL con un `<script>` dentro por la interfaz real de la
 * bóveda, y comprueba contra la respuesta REAL de `/api/admin/vault/<id>`
 * —no leyendo `vaultResponseHeaders` en el código— que:
 *
 *   · inline (Ver, sin `?download=1`): el `Content-Type` es `text/plain`,
 *     NUNCA `text/html` — así el navegador no puede interpretar el
 *     `<script>` como código ejecutable de `https://yaentre.com`;
 *   · el CUERPO servido inline es el HTML crudo tal cual se subió (se ve
 *     como texto fuente, no se transforma ni se filtra);
 *   · con `?download=1` sí se sirve `text/html` real, con
 *     `Content-Disposition: attachment` (fuerza a GUARDAR, no a ejecutar).
 *
 * Un solo login (un solo contexto): esta sonda no necesita simular varios
 * dispositivos, así que no compite por presupuesto de inicio de sesión con
 * `notes-cross-device-probe.ts`.
 */
import '../g71/env';
import { chromium } from '@playwright/test';
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

const EXPECTED_CACHE = 'no-store, no-cache, must-revalidate, private';
const HTML_MARKER = `g99-html-probe-${Date.now()}`;
const HTML_BYTES = Buffer.from(
  `<!doctype html><html><body><h1>${HTML_MARKER}</h1><script>window.__pwned = true;</script></body></html>`
);

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

  console.log(`.html en la bóveda — cabeceras REALES en producción (${BASE})\n`);

  const rows = await prisma.$queryRaw<Array<{ profileId: string }>>`
    SELECT "profileId" FROM app_security.profile_ids_by_email_search(${EMAIL})
  `;
  const profileId = rows[0]?.profileId;
  if (!profileId) throw new Error(`No hay perfil para ${EMAIL}`);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  let fileId: string | null = null;
  let promoted = false;

  try {
    await prisma.userProfile.update({ where: { id: profileId }, data: { role: 'ADMIN' } });
    promoted = true;

    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    const emailField = page.getByLabel(/correo/i);
    await emailField.waitFor({ state: 'visible' });
    await page.waitForTimeout(500);
    await emailField.fill(EMAIL);
    await page.getByLabel(/contraseña/i).fill(PASSWORD);
    await page.getByRole('button', { name: /entrar|iniciar/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45_000 });

    await page.goto(`${BASE}/admin/boveda`, { waitUntil: 'domcontentloaded' });
    await page.setInputFiles('input[type="file"]', {
      name: 'sonda.html',
      mimeType: 'text/html',
      buffer: HTML_BYTES,
    });

    const outcome = page.getByText(/Archivo guardado en la bóveda|no permitido|No pudimos guardar/i);
    let uploaded = false;
    for (let intento = 1; intento <= 5 && !uploaded; intento += 1) {
      await page.getByRole('button', { name: /^Subir$/ }).click();
      uploaded = await outcome
        .first()
        .waitFor({ timeout: 12_000 })
        .then(() => true)
        .catch(() => false);
      if (!uploaded) console.log(`    (sin respuesta tras el clic ${intento}; reintentando)`);
    }
    if (!uploaded) throw new Error('El botón Subir no produjo respuesta.');
    const outcomeText = (await outcome.first().textContent()) ?? '';
    if (!/Archivo guardado/i.test(outcomeText)) {
      throw new Error(`La subida de .html fue RECHAZADA: "${outcomeText.trim()}" (se esperaba que se aceptara)`);
    }

    const created = await prisma.adminFile.findFirst({
      where: { originalName: 'sonda.html', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, mimeType: true },
    });
    if (!created) throw new Error('La subida no dejó fila en admin_files.');
    fileId = created.id;
    record('SUBIDA-html-aceptada', created.mimeType === 'text/html', `mimeType guardado: ${created.mimeType}`);

    // ── Inline (Ver): NUNCA text/html ────────────────────────────────────
    const inline = await page.request.get(`${BASE}/api/admin/vault/${fileId}`);
    const ih = inline.headers();
    record(
      'INLINE-nunca-text-html',
      ih['content-type']?.startsWith('text/plain') === true,
      `content-type="${ih['content-type']}" (tiene que empezar con text/plain, NUNCA text/html)`
    );
    record('INLINE-cache', ih['cache-control'] === EXPECTED_CACHE, `cache-control="${ih['cache-control']}"`);

    const inlineBody = await inline.text();
    record(
      'INLINE-cuerpo-crudo',
      inlineBody.includes(HTML_MARKER) && inlineBody.includes('<script>'),
      'el cuerpo servido es el HTML tal cual se subió (se ve como fuente, no se filtra ni se transforma)'
    );

    // ── Descarga: SÍ el tipo real, con attachment ────────────────────────
    const dl = await page.request.get(`${BASE}/api/admin/vault/${fileId}?download=1`);
    const dh = dl.headers();
    record(
      'DOWNLOAD-tipo-real',
      dh['content-type']?.startsWith('text/html') === true &&
        dh['content-disposition']?.startsWith('attachment') === true,
      `content-type="${dh['content-type']}" disposition="${dh['content-disposition']}"`
    );
  } finally {
    if (fileId) {
      // La bitácora NO se limpia: la subida y las lecturas que esta sonda hizo
      // son acciones reales sobre la app y quedan registradas, igual que en
      // cualquier otra sonda de esta fase — solo se borra el ARCHIVO.
      const file = await prisma.adminFile.findUnique({ where: { id: fileId }, select: { path: true } });
      if (file) {
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
          const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
          const { createClient } = await import('@supabase/supabase-js');
          const client = createClient(supabaseUrl, anonKey);
          await client.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
          await client.storage.from('admin-vault').remove([file.path]);
        } catch (e) {
          console.error('  fallo al limpiar el objeto del bucket:', e);
        }
      }
      await prisma.adminFile.deleteMany({ where: { id: fileId } });
      console.log('\nLimpieza: archivo de sonda borrado.');
    }
    if (promoted) {
      await prisma.userProfile.update({ where: { id: profileId }, data: { role: 'STUDENT' } }).catch(() => {});
    }
    const finalRole = await prisma.userProfile.findUnique({ where: { id: profileId }, select: { role: true } });
    console.log(`Rol final de la cuenta fixture: ${finalRole?.role}`);
    await browser.close();
  }

  console.log('\n┌─ Resultado ──────────────────────────────────────────────────');
  for (const c of checks) console.log(`│ ${c.ok ? '✅' : '❌'} ${c.id}`);
  console.log('└──────────────────────────────────────────────────────────────');
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
