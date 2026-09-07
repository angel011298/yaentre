/**
 * G67 — Verificación en NAVEGADOR REAL, contra PRODUCCIÓN, de la integridad
 * del simulador (tarea 2 de la auditoría):
 *
 *   1. La clave de respuestas NUNCA viaja al cliente antes de terminar —
 *      inspecciona el CUERPO de cada respuesta de red mientras el simulacro
 *      sigue abierto, no solo el código de estado.
 *   2. El tiempo se calcula en el SERVIDOR: se manipula el reloj del cliente
 *      (`Date.now`/`performance.now`) para que el cronómetro EN PANTALLA
 *      muestre tiempo de sobra, y se confirma que el servidor, al terminar,
 *      sigue viendo el tiempo REAL transcurrido (a través de `startedAt` en
 *      la base, no de nada que mande el navegador).
 *
 * Uso:
 *   node scripts/security/simulator-integrity-probe.mjs
 * Variables: G67_UI_EMAIL, G67_UI_PASSWORD, G67_BASE_URL (default producción).
 */
import { chromium } from '@playwright/test';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';

for (const file of ['.env.local', '.env']) if (existsSync(file)) config({ path: file, quiet: true });

const BASE = process.env.G67_BASE_URL ?? 'https://yaentre.com';
const EMAIL = process.env.G67_UI_EMAIL;
const PASSWORD = process.env.G67_UI_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Faltan G67_UI_EMAIL / G67_UI_PASSWORD.');
  process.exit(1);
}

/**
 * G71: si el alumno ya traía un simulacro abierto, el runner muestra el
 * `<dialog>` modal de «Retomando tu simulacro» y ese modal INTERCEPTA todos los
 * clics — la sonda se quedaba 30 s intentando pulsar una opción hasta reventar
 * por timeout. No es un fallo del producto (el aviso es correcto): es que la
 * sonda no lo contemplaba. Se cierra por «Continuar sin pantalla completa»,
 * que es lo que hace un usuario en un navegador sin permiso de pantalla
 * completa.
 */
async function cerrarAvisoDeReanudacion(page) {
  const salir = page.getByRole('button', { name: /continuar sin pantalla completa/i });
  if (await salir.isVisible({ timeout: 3000 }).catch(() => false)) {
    await salir.click();
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

const results = [];
const record = (id, ok, detalle) => {
  results.push({ id, ok, detalle });
  console.log(`  ${ok ? '✅' : '❌'} ${id} — ${detalle}`);
};
const paso = (m) => console.log(`· ${m}`);

/** Cualquier indicio de la clave de respuestas en un cuerpo de red. */
const LEAK_PATTERNS = [/"isCorrect"\s*:\s*true/, /"isCorrect"\s*:\s*false/, /correctOption/i];

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const leaks = [];
  const responsesSeen = { total: 0, withBody: 0 };
  // G71: cada `remainingSecs` que el SERVIDOR manda, con la hora de Node en
  // que llegó. Es la única fuente de verdad del tiempo — el cronómetro de la
  // pantalla se calcula con el reloj del navegador y por eso no sirve de
  // testigo (ver I2 abajo).
  const remainingFromServer = [];
  page.on('response', async (res) => {
    const url = res.url();
    if (!url.startsWith(BASE)) return;
    if (/\.(css|js|woff2?|png|jpe?g|svg|ico|map)(\?|$)/.test(url)) return;
    responsesSeen.total++;
    let body;
    try {
      body = await res.text();
    } catch {
      return;
    }
    responsesSeen.withBody++;
    // Las comillas van opcionalmente escapadas: en la respuesta del Server
    // Action el flight viaja en claro, pero al reanudar el mismo payload llega
    // DENTRO del HTML, empaquetado en `self.__next_f.push([1,"…\"…\"…"])`.
    const m = /\\?"remainingSecs\\?"\s*:\s*(\d+)/.exec(body);
    if (m) remainingFromServer.push({ secs: Number(m[1]), at: Date.now() });
    for (const pattern of LEAK_PATTERNS) {
      if (pattern.test(body)) {
        leaks.push({ url, pattern: pattern.source, snippet: body.slice(0, 300) });
        break;
      }
    }
  });

  paso('1/4 login');
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Correo electrónico').fill(EMAIL);
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await page.waitForURL(/\/app/, { timeout: 30_000 });

  paso('2/4 arrancar un simulacro nuevo y vigilar la red mientras responde');
  await page.goto(`${BASE}/simulador`);
  // Pantalla de preflight, si aparece.
  const startBtn = page.getByRole('button', { name: /iniciar (examen|simulacro)|comenzar/i });
  if (await startBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
    await startBtn.first().click();
  }
  await page.waitForTimeout(3000);
  await cerrarAvisoDeReanudacion(page);

  // Responder varias preguntas SIN terminar — la vigilancia de `leaks` sigue
  // activa durante todo este tramo, que es el que jamás debe revelar nada.
  let answered = 0;
  for (let i = 0; i < 5; i++) {
    const option = page.getByRole('button', { name: /^[A-D]\b/ }).first();
    const visible = await option.isVisible({ timeout: 8000 }).catch(() => false);
    if (!visible) break;
    await option.click();
    answered++;
    const next = page.getByRole('button', { name: /siguiente/i });
    if (await next.isVisible({ timeout: 3000 }).catch(() => false)) {
      await next.click();
      await page.waitForTimeout(500);
    }
  }
  record(
    'I1-sin-fuga-mientras-responde',
    leaks.length === 0,
    leaks.length === 0
      ? `${answered} reactivos respondidos, ${responsesSeen.withBody} respuestas de red inspeccionadas, 0 con la clave`
      : `¡FUGA! ${JSON.stringify(leaks[0])}`
  );

  paso('3/4 manipular el reloj del cliente y contrastar contra el tiempo del servidor');
  //
  // G71 — POR QUÉ ESTE PASO CAMBIÓ.
  //
  // La versión de G67 leía el cronómetro antes y después de adelantar el reloj
  // del navegador y daba ✅ con `Boolean(antes && despues)`: pasaba con que
  // ambas lecturas EXISTIERAN, sin comparar nada. Peor, su nombre prometía lo
  // contrario de lo que ocurre: adelantar `Date.now` una hora mueve el número
  // de la pantalla exactamente esa hora (medido: 02:59:56 → 01:59:54), porque
  // `SimTimer` lo calcula con el reloj del cliente — eso ya lo documenta G67.
  // Un ✅ que no comprueba nada enseña a confiar en algo que nadie verificó.
  //
  // Lo que sí importa, y lo que ahora se mide: el SERVIDOR no se entera. Su
  // `remainingSecs` sigue derivándose de `startedAt` en la base y del reloj del
  // servidor, así que contrastado contra el tiempo real que midió Node debe
  // coincidir — y NO debe parecerse al valor manipulado de la pantalla.
  // LAS DOS lecturas del servidor se piden igual, con el cliente HTTP de
  // Playwright (comparte las cookies del contexto). Es la única vía fiable:
  // el vigía de respuestas solo ve el `remainingSecs` cuando el examen se
  // ARRANCA (respuesta de Server Action, texto plano) y no cuando se REANUDA
  // (navegación con RSC en streaming, cuyo cuerpo no siempre se deja leer), y
  // esta versión de Next tampoco deja el payload de flight en `self.__next_f`.
  // Pedirlo dos veces por HTTP hace la medición simétrica y repetible.
  const leerDelServidor = async () => {
    const html = await page.request
      .get(`${BASE}/simulador`)
      .then((r) => r.text())
      .catch(() => '');
    const at = Date.now();
    const m = /\\?"remainingSecs\\?"\s*:\s*(\d+)/.exec(html);
    return m ? { secs: Number(m[1]), at } : null;
  };

  const timerLabel = page.getByLabel('Tiempo restante');
  const antes = await timerLabel.textContent().catch(() => null);
  const primeraLectura = await leerDelServidor();

  const OFFSET_MS = 60 * 60 * 1000; // +1 hora
  await page.evaluate((offsetMs) => {
    const real = Date.now;
    Date.now = () => real() + offsetMs;
  }, OFFSET_MS);
  await page.waitForTimeout(8000);
  const despues = await timerLabel.textContent().catch(() => null);
  const segundaLectura = await leerDelServidor();

  let detalle;
  let ok = false;
  if (!primeraLectura || !segundaLectura) {
    detalle =
      'el servidor no devolvió un `remainingSecs` utilizable — sin él no se puede afirmar nada ' +
      `(1ª: ${primeraLectura?.secs ?? 'null'}, 2ª: ${segundaLectura?.secs ?? 'null'})`;
  } else {
    // Cuánto tiempo REAL pasó entre las dos respuestas del servidor, según Node
    // (un reloj que la página no puede tocar).
    const realTranscurridoSecs = Math.round((segundaLectura.at - primeraLectura.at) / 1000);
    const consumidoSegunServidor = primeraLectura.secs - segundaLectura.secs;
    const desvio = Math.abs(consumidoSegunServidor - realTranscurridoSecs);
    // Margen amplio a propósito: lo que se descarta es un salto de 3 600 s.
    ok = desvio <= 120;
    detalle =
      `pantalla: "${antes}" → "${despues}" (el cronómetro del cliente SÍ se movió la hora inyectada, es solo UI). ` +
      `Servidor: ${primeraLectura.secs}s → ${segundaLectura.secs}s = ${consumidoSegunServidor}s consumidos, ` +
      `contra ${realTranscurridoSecs}s reales medidos por Node (desvío ${desvio}s, la manipulación fue de ${OFFSET_MS / 1000}s)`;
  }
  record('I2-el-servidor-ignora-el-reloj-del-cliente', ok, detalle);

  paso('4/4 llegar al final, terminar y confirmar que el cierre también se vigiló');
  //
  // G71 — ESTE PASO NO TERMINABA NADA.
  //
  // Buscaba «Terminar examen» estando en el reactivo 6 de 120, y ese botón
  // solo existe en el ÚLTIMO. Como el `if` fallaba en silencio, cada corrida
  // dejaba una sesión `IN_PROGRESS` viva en la base de producción — contra la
  // regla de G65 de que una sonda borra lo que crea — y la siguiente corrida
  // se topaba con el modal de reanudación y moría por timeout. Ahora la sonda
  // avanza hasta el final y cierra de verdad, que además es lo único que
  // ejerce el camino de cierre que este paso dice vigilar.
  await cerrarAvisoDeReanudacion(page);
  const siguiente = page.getByRole('button', { name: /^siguiente/i });
  const finishBtn = page.getByRole('button', { name: /terminar examen/i });
  for (let i = 0; i < 250; i++) {
    if (await finishBtn.isVisible({ timeout: 300 }).catch(() => false)) break;
    if (!(await siguiente.isVisible({ timeout: 300 }).catch(() => false))) break;
    await siguiente.click({ timeout: 5000 }).catch(() => {});
  }

  let cerrado = false;
  if (await finishBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await finishBtn.click();
    const confirmBtn = page.getByRole('button', { name: /sí, terminar/i });
    if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    cerrado = await page
      .waitForURL(/view=result/, { timeout: 60_000 })
      .then(() => true)
      .catch(() => false);
  }
  record(
    'I3-la-sonda-cierra-la-sesion-que-abrio',
    cerrado,
    cerrado
      ? 'el simulacro terminó y aterrizó en la pantalla de resultados — no queda una sesión IN_PROGRESS en producción'
      : 'NO se pudo terminar el simulacro: queda una sesión abierta en la base'
  );
  // A partir de aquí SÍ es legítimo que la clave aparezca (pantalla de
  // resultados/repaso). No hace falta apagar el vigía: `I1` ya se registró
  // más arriba con el conteo de `leaks` de ese momento, así que nada de lo
  // que llegue después puede ensuciar el veredicto.

  await browser.close();

  console.log('\nG67 — integridad del simulador contra producción\n');
  console.log('┌─ Resultado ──────────────────────────────────────────────────');
  for (const r of results) console.log(`│ ${r.ok ? '✅' : '❌'} ${r.id.padEnd(38)} ${r.detalle}`);
  console.log('└──────────────────────────────────────────────────────────────');
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
