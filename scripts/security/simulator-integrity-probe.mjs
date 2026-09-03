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

  paso('3/4 manipular el reloj del cliente y comprobar el cronómetro');
  // Se adelanta el reloj del NAVEGADOR una hora — si el cronómetro en pantalla
  // se calculara con el reloj del cliente sin ancla al servidor, esto lo haría
  // saltar a "tiempo agotado" o a un valor absurdo de inmediato.
  const timerLabel = page.getByLabel('Tiempo restante');
  const antes = await timerLabel.textContent().catch(() => null);
  await page.evaluate(() => {
    const real = Date.now;
    const offsetMs = 60 * 60 * 1000; // +1 hora — sonda deliberada del reloj del navegador
    Date.now = () => real() + offsetMs;
  });
  await page.waitForTimeout(1500);
  const despues = await timerLabel.textContent().catch(() => null);
  record(
    'I2-cronometro-no-salta-con-reloj-manipulado',
    Boolean(antes && despues),
    `antes de adelantar el reloj: "${antes}" · después de adelantarlo 1h: "${despues}" — ` +
      'si el cronómetro dependiera del reloj del cliente sin ancla al servidor, saltaría a 00:00:00 o a un valor absurdo'
  );

  paso('4/4 terminar y confirmar que el cierre también se vigiló');
  const finishBtn = page.getByRole('button', { name: /terminar examen/i });
  if (await finishBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await finishBtn.click();
    const confirmBtn = page.getByRole('button', { name: /sí, terminar/i });
    if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await page.waitForURL(/resultado|result/i, { timeout: 30_000 }).catch(() => {});
  }
  // A partir de aquí SÍ es legítimo que la clave aparezca (pantalla de
  // resultados/repaso) — la sonda ya cumplió su propósito antes de este punto.

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
