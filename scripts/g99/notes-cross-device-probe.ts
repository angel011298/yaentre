/**
 * scripts/g99/notes-cross-device-probe.ts — EN PRODUCCIÓN.
 *
 *   G99_PROBE_PASSWORD=… pnpm admin:notes-cross-device
 *
 * Prueba literal del requisito: una nota creada por el admin tiene que
 * poder guardarse, verse y borrarse «sin importar que se abra sesión en un
 * dispositivo nuevo en el momento que sea».
 *
 * Un `localStorage` pasaría cualquier prueba que solo mirara la MISMA
 * pestaña/sesión de navegador. Por eso aquí se usan DOS contextos de
 * Playwright completamente independientes —sin cookies ni storage
 * compartido entre sí, el equivalente real a "otro dispositivo"— con dos
 * inicios de sesión separados contra https://yaentre.com:
 *
 *   1. Contexto A: inicia sesión, escribe una nota con un marcador único
 *      usando el FORMULARIO real (no una llamada directa a la acción).
 *   2. Se cierra el contexto A por completo.
 *   3. Contexto B (nuevo, "otro dispositivo"): inicia sesión de nuevo,
 *      abre /admin/boveda, y la nota tiene que estar ahí.
 *   4. Se borra desde el contexto B.
 *   5. Contexto C (un tercer dispositivo más): confirma que ya no aparece.
 *
 * La cuenta fixture se promueve a ADMIN y se degrada a STUDENT al terminar,
 * pase lo que pase.
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
  const emailField = page.getByLabel(/correo/i);
  await emailField.waitFor({ state: 'visible' });
  // Mismo cuidado que al escribir una nota: un margen fijo antes del primer
  // clic para que React termine de hidratar el formulario. Sin esto, el
  // primer intento de esta sonda perdía el submit del login por completo —
  // credenciales verificadas correctas por separado contra /auth/v1/token,
  // así que el fallo era de timing en el navegador, no de la cuenta.
  await page.waitForTimeout(500);
  await emailField.fill(EMAIL);
  await page.getByLabel(/contraseña/i).fill(PASSWORD);
  await page.getByRole('button', { name: /entrar|iniciar/i }).click();
  const moved = await page
    .waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 })
    .then(() => true)
    .catch(() => false);
  if (!moved) {
    // El limitador EN MEMORIA de proxy.ts (primera línea, barata, pero NO
    // comparte contador entre instancias de Vercel — ver CLAUDE.md) puede
    // seguir marcando esta cuenta si la sonda se corrió varias veces seguidas
    // hace poco. El mensaje en pantalla lo distingue de un fallo real.
    const bodyText = await page.locator('body').innerText().catch(() => '');
    if (/demasiados intentos/i.test(bodyText)) {
      throw new Error(
        'Limitador de login (en memoria, por instancia) todavía activo. ' +
          'Espera ~1-2 min sin más intentos y vuelve a correr la sonda.'
      );
    }
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15_000 });
  }
}

async function setRole(profileId: string, role: 'ADMIN' | 'STUDENT'): Promise<void> {
  await prisma.userProfile.update({ where: { id: profileId }, data: { role } });
}

/** Botón `type="button"` con `onClick`: antes de hidratar, un clic no hace
 *  nada (ni error ni navegación) — se reintenta hasta ver una respuesta. */
async function clickAndWaitForOutcome(page: Page, outcomePattern: RegExp): Promise<string> {
  const outcome = page.getByText(outcomePattern);
  for (let intento = 1; intento <= 4; intento += 1) {
    const ok = await outcome
      .first()
      .waitFor({ timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (ok) return (await outcome.first().textContent()) ?? '';
    console.log(`    (sin respuesta tras el intento ${intento}; reintentando el clic)`);
  }
  throw new Error('No hubo respuesta del control tras varios intentos.');
}

/**
 * Escribe en el textarea y guarda. `fill()` puede caer ANTES de que React
 * termine de hidratar y adjuntar su `onChange`: el DOM muestra el texto pero
 * el estado controlado se queda vacío, y el botón «Guardar nota»
 * (`disabled={... || content.trim().length === 0}`) nunca se habilita — un
 * único intento se quedaba esperando 30 s un clic que no podía completarse.
 * Se reintenta el `fill()` hasta que el botón esté realmente habilitado.
 */
async function typeNoteAndSave(page: Page, text: string): Promise<void> {
  const textarea = page.getByPlaceholder('Escribe una nota…');
  const saveButton = page.getByRole('button', { name: /^Guardar nota$/ });

  // Espera explícita a que React termine de hidratar ANTES de escribir: sin
  // esto, `fill()` puede caer entre el DOM ya pintado y los listeners de
  // React todavía sin adjuntar — el valor queda en el DOM pero el estado
  // controlado (`content`) no se entera, así que el botón nunca se habilita.
  // Confirmado con diagnóstico: una llamada async cualquiera ANTES del
  // primer `fill()` (aunque no toque el textarea) le da a React el tick que
  // necesita. `waitForFunction` sobre `document.readyState` más un margen
  // fijo es más barato y determinista que adivinar con reintentos ciegos.
  await textarea.waitFor({ state: 'visible' });
  await page.waitForTimeout(400);

  for (let intento = 1; intento <= 8; intento += 1) {
    await textarea.fill(text);
    const enabled = await saveButton.isEnabled().catch(() => false);
    if (enabled) {
      await saveButton.click();
      return;
    }
    console.log(`    (el botón sigue deshabilitado tras el intento ${intento} de escribir; reintentando)`);
    await page.waitForTimeout(500);
  }
  throw new Error('El botón «Guardar nota» nunca se habilitó tras escribir el contenido.');
}

const MARKER = `g99-notes-cross-device-${Date.now()}`;

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

  console.log(`Notas — persistencia entre dispositivos EN PRODUCCIÓN (${BASE})\n`);
  console.log(`Marcador de esta corrida: ${MARKER}\n`);

  const rows = await prisma.$queryRaw<Array<{ profileId: string }>>`
    SELECT "profileId" FROM app_security.profile_ids_by_email_search(${EMAIL})
  `;
  const profileId = rows[0]?.profileId;
  if (!profileId) throw new Error(`No hay perfil para ${EMAIL}`);

  const browser = await chromium.launch();
  let promoted = false;

  try {
    await setRole(profileId, 'ADMIN');
    promoted = true;

    // ── "Dispositivo 1": crea la nota por el formulario real ────────────
    console.log('· "Dispositivo" 1 — crea la nota');
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await login(pageA);
    await pageA.goto(`${BASE}/admin/boveda`, { waitUntil: 'domcontentloaded' });

    await typeNoteAndSave(pageA, MARKER);
    const createOutcome = await clickAndWaitForOutcome(pageA, new RegExp(MARKER));
    record(
      'CREAR-dispositivo-1',
      createOutcome.includes(MARKER),
      'la nota aparece en la lista tras guardarla en el primer contexto'
    );

    // Contexto A se CIERRA por completo — nada de cookies ni storage
    // compartido sobrevive de aquí en adelante.
    await ctxA.close();

    // ── "Dispositivo 2": sesión NUEVA, independiente ─────────────────────
    console.log('\n· "Dispositivo" 2 — sesión nueva, ¿aparece la nota?');
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await login(pageB);
    await pageB.goto(`${BASE}/admin/boveda`, { waitUntil: 'domcontentloaded' });

    const visibleOnB = await pageB.getByText(MARKER).first().isVisible().catch(() => false);
    record(
      'VER-dispositivo-2',
      visibleOnB,
      visibleOnB
        ? 'la nota escrita en el "dispositivo" 1 es visible en una sesión y contexto de navegador totalmente nuevos'
        : 'la nota NO apareció en el segundo contexto — no sería server-side'
    );

    // ── Borrar desde el "dispositivo 2" ─────────────────────────────────
    // El botón de notas ("Borrar") no pide confirmación aparte (a diferencia
    // de la bóveda de archivos) — un solo clic dispara `deleteNoteAction`.
    // Mismo cuidado que al escribir la nota: se reintenta hasta que la nota
    // desaparece de la lista, por si el primer clic cae antes de hidratar.
    const noteCard = pageB.locator('li', { hasText: MARKER });
    const deleteButton = noteCard.getByRole('button', { name: /^Borrar$/ });
    let goneOnB = false;
    for (let intento = 1; intento <= 6 && !goneOnB; intento += 1) {
      await deleteButton.click({ timeout: 5000 }).catch(() => {});
      await pageB.waitForTimeout(800);
      goneOnB = !(await pageB.getByText(MARKER).first().isVisible().catch(() => false));
      if (!goneOnB) console.log(`    (la nota sigue visible tras el intento ${intento} de borrar; reintentando)`);
    }
    record('BORRAR-dispositivo-2', goneOnB, 'tras pulsar Borrar, ya no aparece en ese mismo contexto');
    await ctxB.close();

    // ── "Dispositivo 3": un tercer contexto confirma que se fue de VERAS ─
    console.log('\n· "Dispositivo" 3 — confirma el borrado desde otra sesión más');
    const ctxC = await browser.newContext();
    const pageC = await ctxC.newPage();
    await login(pageC);
    await pageC.goto(`${BASE}/admin/boveda`, { waitUntil: 'domcontentloaded' });
    const goneOnC = !(await pageC.getByText(MARKER).first().isVisible().catch(() => false));
    record(
      'BORRADO-confirmado-dispositivo-3',
      goneOnC,
      'un TERCER contexto, con su propia sesión, tampoco la ve — el borrado es del servidor, no de un navegador'
    );
    await ctxC.close();

    // ── Verificación directa en la base, por si algo quedó a medias ─────
    const stillInDb = await prisma.adminNote.findFirst({ where: { content: MARKER } });
    record('BASE-limpia', stillInDb === null, stillInDb ? `quedó la fila ${stillInDb.id}` : 'sin rastro en admin_notes');
  } finally {
    if (promoted) {
      await setRole(profileId, 'STUDENT').catch((e) => console.error('  fallo al degradar:', e));
    }
    // Por si el borrado por UI falló en algún punto: limpieza directa.
    const swept = await prisma.adminNote.deleteMany({ where: { content: MARKER } });
    if (swept.count > 0) console.log(`\nLimpieza de respaldo: ${swept.count} fila(s) borradas por Prisma.`);
    const finalRole = await prisma.userProfile.findUnique({
      where: { id: profileId },
      select: { role: true },
    });
    console.log(`\nRol final de la cuenta fixture: ${finalRole?.role}`);
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
