/**
 * scripts/g74/lighthouse-prod.mjs — G74.  `pnpm perf:lighthouse-prod`
 *
 * ── POR QUÉ EXISTE ──────────────────────────────────────────────────────────
 *
 * G62 midió Lighthouse contra `next build && next start` en esta misma
 * máquina y dio las 5 pantallas ≥ 85. `docs/VEREDICTO_LANZAMIENTO.md §5.6`
 * marcó ese número como 🟡 PARCIAL por una razón correcta: un build local no
 * es producción. No mide el arranque en frío de una función de Vercel, ni el
 * TLS real, ni la latencia a `us-east-1`, ni la CSP que sirve el edge, ni el
 * JS que el deploy real acabó emitiendo. «Debería ser igual o mejor» no es un
 * dato, y este proyecto ya tuvo tres defectos (G71 D1-D3) que solo existían en
 * producción.
 *
 * Esta sonda mide **https://yaentre.com**, en perfil MÓVIL, en las cinco
 * pantallas que el PRD §14 nombra: landing, registro, dashboard, práctica y
 * simulador. Las tres últimas exigen sesión, así que entra de verdad con una
 * cuenta real y le pasa las cookies a Lighthouse.
 *
 * ── CÓMO NO MENTIR ──────────────────────────────────────────────────────────
 *
 *  · Mediana de N corridas (default 3), no la mejor. Una sola corrida contra
 *    una función serverless mide si tocó arranque en frío, no el producto.
 *  · Se imprime `finalUrl` de cada corrida: si el guard o el muro suave
 *    redirigieron, el número es de OTRA pantalla y hay que verlo, no
 *    descubrirlo al escribir el documento.
 *  · Sale con código distinto de cero si alguna pantalla queda por debajo de
 *    85 (el criterio del PRD), para que no haga falta leer la tabla con
 *    cuidado para saber si pasó.
 *
 * ── USO ─────────────────────────────────────────────────────────────────────
 *
 *   G74_EMAIL=<cuenta> G74_PASSWORD=<temporal> pnpm perf:lighthouse-prod
 *   ... pnpm perf:lighthouse-prod 5 landing,registro   # N corridas, subconjunto
 *
 * La contraseña de la cuenta de prueba se fija temporalmente y se RESTAURA su
 * hash original al terminar (mismo protocolo que `pnpm security:live`, G73b).
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const LH_HOME =
  process.env.G74_LIGHTHOUSE_HOME ||
  'C:/Users/LENOVO/AppData/Local/npm-cache/_npx/8003d8991b0d346b/node_modules';
const { default: lighthouse } = await import(
  pathToFileURL(`${LH_HOME}/lighthouse/core/index.js`).href
);
const chromeLauncher = await import(pathToFileURL(`${LH_HOME}/chrome-launcher/dist/index.js`).href);

const BASE = process.env.G74_BASE_URL || 'https://yaentre.com';
const RUNS = Number(process.argv[2] || 3);
const ONLY = process.argv[3] ? process.argv[3].split(',') : null;
const OUT = process.env.G74_OUT_DIR || path.join(process.cwd(), '.lighthouse-g74');
const UMBRAL = 85; // PRD §14 / criterio 5.6

const EMAIL = process.env.G74_EMAIL;
const PASSWORD = process.env.G74_PASSWORD;

/** [etiqueta, ruta, ¿requiere sesión?] */
const PANTALLAS = [
  ['landing', '/', false],
  ['registro', '/registro', false],
  ['dashboard', '/app', true],
  ['practicar', '/practicar', true],
  ['simulador', '/simulador', true],
].filter(([l]) => !ONLY || ONLY.includes(l));

fs.mkdirSync(path.join(OUT, 'reports'), { recursive: true });
// chrome-launcher escribe su log DENTRO del userDataDir y no lo crea él.
fs.mkdirSync(path.join(OUT, 'chrome-profile'), { recursive: true });

// ── 1. Sesión real, si alguna pantalla la necesita ──────────────────────────
let cookieHeader = null;
if (PANTALLAS.some(([, , auth]) => auth)) {
  if (!EMAIL || !PASSWORD) {
    console.error('Faltan G74_EMAIL / G74_PASSWORD: las pantallas con sesión no se pueden medir.');
    process.exit(2);
  }
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/correo/i).fill(EMAIL);
  await page.getByLabel(/contraseña/i).fill(PASSWORD);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await page.waitForURL(/\/app|\/onboarding|\/diagnostico|\/tutor/, { timeout: 45_000 });
  const cookies = await ctx.cookies();
  cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  console.error(`sesión abierta (${cookies.length} cookies) → ${page.url()}`);
  await browser.close();
}

// ── 2. Chrome para Lighthouse ───────────────────────────────────────────────
const chrome = await chromeLauncher.launch({
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  userDataDir: path.join(OUT, 'chrome-profile'),
});

const baseOpts = {
  port: chrome.port,
  output: ['json', 'html'],
  logLevel: 'error',
  onlyCategories: ['performance'],
  formFactor: 'mobile',
  screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
  throttlingMethod: 'simulate',
  maxWaitForLoad: 60_000,
};

const mediana = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const resultados = {};

for (const [label, ruta, auth] of PANTALLAS) {
  const url = `${BASE}${ruta}`;
  const opts = { ...baseOpts };
  if (auth) opts.extraHeaders = { Cookie: cookieHeader };

  const corridas = [];
  for (let i = 1; i <= RUNS; i++) {
    let res;
    try {
      res = await lighthouse(url, opts);
    } catch (err) {
      console.error(`  ${label} r${i}: ERROR ${err.message}`);
      continue;
    }
    const { lhr, report } = res;
    fs.writeFileSync(path.join(OUT, 'reports', `${label}-r${i}.json`), report[0]);
    fs.writeFileSync(path.join(OUT, 'reports', `${label}-r${i}.html`), report[1]);
    const a = lhr.audits;
    const nv = (k) => (a[k] && a[k].numericValue) || 0;
    const fila = {
      score: Math.round(lhr.categories.performance.score * 100),
      fcp: nv('first-contentful-paint'),
      lcp: nv('largest-contentful-paint'),
      tbt: nv('total-blocking-time'),
      cls: nv('cumulative-layout-shift'),
      si: nv('speed-index'),
      ttfb: nv('server-response-time'),
      bytesKB: Math.round(nv('total-byte-weight') / 1024),
      finalUrl: lhr.finalDisplayedUrl,
    };
    corridas.push(fila);
    console.error(
      `  ${label} r${i}: ${fila.score}  LCP ${Math.round(fila.lcp)}  TBT ${Math.round(fila.tbt)}  ` +
        `CLS ${fila.cls.toFixed(3)}  TTFB ${Math.round(fila.ttfb)}  → ${fila.finalUrl}`
    );
  }

  if (corridas.length === 0) {
    resultados[label] = { url, error: 'sin reportes' };
    continue;
  }
  const p = (k) => mediana(corridas.map((c) => c[k]));
  resultados[label] = {
    url,
    runs: corridas.length,
    score: p('score'),
    scores: corridas.map((c) => c.score),
    fcp_ms: Math.round(p('fcp')),
    lcp_ms: Math.round(p('lcp')),
    tbt_ms: Math.round(p('tbt')),
    cls: +p('cls').toFixed(3),
    si_ms: Math.round(p('si')),
    ttfb_ms: Math.round(p('ttfb')),
    bytes_kb: p('bytesKB'),
    // Si esto no es la URL que se pidió, el número NO es de esta pantalla.
    // Se mira CADA corrida, no solo la primera: una sola redirección (sesión
    // caída a mitad de la tanda) ya contamina la mediana, y mirar únicamente
    // r1 la escondería — el defecto D6 de G71 en miniatura.
    final_url: corridas[0].finalUrl,
    redirigida: corridas.some((c) => !c.finalUrl.startsWith(url)),
    urls_redirigidas: [...new Set(corridas.filter((c) => !c.finalUrl.startsWith(url)).map((c) => c.finalUrl))],
  };
}

try {
  await chrome.kill();
} catch {
  /* el proceso ya murió: no es un fallo de la medición */
}

fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(resultados, null, 2));

console.log(`\n${'═'.repeat(94)}`);
console.log(`🦉 G74 — Lighthouse móvil contra PRODUCCIÓN (${BASE}) · mediana de ${RUNS} corridas`);
console.log('═'.repeat(94));
console.log(
  'pantalla'.padEnd(12) +
    'score'.padStart(6) +
    'corridas'.padStart(12) +
    'LCP'.padStart(9) +
    'TBT'.padStart(8) +
    'CLS'.padStart(8) +
    'SI'.padStart(9) +
    'TTFB'.padStart(8) +
    'KB'.padStart(7)
);
let bajoUmbral = 0;
for (const [label, v] of Object.entries(resultados)) {
  if (v.error) {
    console.log(label.padEnd(12) + '  ' + v.error);
    bajoUmbral++;
    continue;
  }
  if (v.score < UMBRAL) bajoUmbral++;
  console.log(
    label.padEnd(12) +
      String(v.score).padStart(6) +
      `(${v.scores.join(',')})`.padStart(12) +
      `${v.lcp_ms}ms`.padStart(9) +
      `${v.tbt_ms}ms`.padStart(8) +
      String(v.cls).padStart(8) +
      `${v.si_ms}ms`.padStart(9) +
      `${v.ttfb_ms}ms`.padStart(8) +
      String(v.bytes_kb).padStart(7) +
      (v.score < UMBRAL ? '   ❌ < 85' : '   ✅') +
      (v.redirigida ? `   ⚠️ alguna corrida redirigida a ${v.urls_redirigidas.join(', ')}` : '')
  );
}
console.log('═'.repeat(94));
console.log(`Reportes completos en ${path.join(OUT, 'reports')}`);
if (bajoUmbral > 0) {
  console.log(`❌ ${bajoUmbral} pantalla(s) por debajo de ${UMBRAL}.`);
  process.exit(1);
}
console.log(`✅ Las ${Object.keys(resultados).length} pantallas ≥ ${UMBRAL}.`);
process.exit(0);
