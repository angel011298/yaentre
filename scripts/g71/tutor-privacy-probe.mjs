/**
 * G71 — Recorrido de TUTOR contra producción, con la privacidad demostrada por
 * el CUERPO de las respuestas de red, no por lo que se ve en pantalla.
 *
 * Qué hace, en orden:
 *   1. Entra como el ALUMNO y genera su código de vinculación.
 *   2. Entra como el TUTOR y canjea el código.
 *   3. Recorre TODO el panel del tutor vigilando cada respuesta de red y
 *      buscando en su cuerpo cualquier rastro de contenido de reactivos:
 *      enunciados, opciones, explicaciones o la clave de respuestas.
 *   4. Comprueba lo contrario también — que el panel SÍ trae las métricas —
 *      para que un panel roto (que no filtra nada porque no muestra nada) no
 *      pueda pasar por aprobado.
 *
 * Uso:
 *   node scripts/g71/tutor-privacy-probe.mjs
 * Variables: G71_STUDENT_EMAIL, G71_STUDENT_PASSWORD, G71_TUTOR_EMAIL,
 *            G71_TUTOR_PASSWORD, G71_BASE_URL (default producción).
 */
import { chromium } from '@playwright/test';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';

for (const file of ['.env.local', '.env']) if (existsSync(file)) config({ path: file, quiet: true });

const BASE = process.env.G71_BASE_URL ?? 'https://yaentre.com';
const STUDENT = { email: process.env.G71_STUDENT_EMAIL, password: process.env.G71_STUDENT_PASSWORD };
const TUTOR = { email: process.env.G71_TUTOR_EMAIL, password: process.env.G71_TUTOR_PASSWORD };

for (const [nombre, cuenta] of [['alumno', STUDENT], ['tutor', TUTOR]]) {
  if (!cuenta.email || !cuenta.password) {
    console.error(`Faltan las credenciales del ${nombre}.`);
    process.exit(1);
  }
}

const results = [];
const record = (id, ok, detalle) => {
  results.push({ id, ok, detalle });
  console.log(`  ${ok ? '✅' : '❌'} ${id} — ${detalle}`);
};
const paso = (m) => console.log(`· ${m}`);

/**
 * Rastros de contenido de reactivos. No basta con buscar `isCorrect`: el
 * enunciado y las opciones son igual de sensibles — el banco es el activo.
 */
const LEAK_PATTERNS = [
  { nombre: 'clave de respuesta', re: /"isCorrect"\s*:/ },
  { nombre: 'opción correcta', re: /correctOption/i },
  { nombre: 'enunciado del reactivo', re: /"stem"\s*:/ },
  { nombre: 'opciones del reactivo', re: /"options"\s*:\s*\[/ },
  { nombre: 'capas de explicación', re: /explanationLayer|"layers"\s*:\s*\[/i },
  { nombre: 'texto de opción', re: /"selectedOption"\s*:/ },
];

/** Cierra sesión y devuelve una página limpia. */
async function nuevaSesion(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    try {
      localStorage.setItem('yaentre-cookies-consent', 'true');
    } catch {}
  });
  return { context, page };
}

async function login(page, { email, password }, destino) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await page.waitForURL(new RegExp(destino), { timeout: 40_000 });
}

/**
 * Alta de la cuenta de tutor de punta a punta (`--signup`): registro real por
 * la interfaz + confirmación del correo REAL. No hace falta buzón: la API de
 * Resend devuelve el HTML ya renderizado de lo que salió por su SMTP, incluido
 * lo que origina Supabase Auth (patrón de G70b, `docs/CORREOS_AUTH.md` §6).
 */
async function altaDeTutor(browser) {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === 'placeholder') throw new Error('Falta RESEND_API_KEY para leer el correo de confirmación.');

  const { context, page } = await nuevaSesion(browser);
  const desde = Date.now();
  await page.goto(`${BASE}/registro?role=tutor`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Correo electrónico').fill(TUTOR.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(TUTOR.password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /crear cuenta/i }).click();
  await page.waitForURL(/\/login/, { timeout: 40_000 });
  record('T0a-registro-de-tutor', true, `cuenta creada para ${TUTOR.email}`);

  // Buscar el correo de confirmación (llega en segundos, se reintenta).
  let enlace = null;
  for (let intento = 0; intento < 12 && !enlace; intento++) {
    await page.waitForTimeout(5000);
    const lista = await fetch('https://api.resend.com/emails?limit=10', {
      headers: { Authorization: `Bearer ${key}` },
    }).then((r) => r.json());
    const correo = (lista.data ?? []).find(
      (e) => String(e.to).includes(TUTOR.email) && new Date(e.created_at).getTime() >= desde - 60_000
    );
    if (!correo) continue;
    const detalle = await fetch(`https://api.resend.com/emails/${correo.id}`, {
      headers: { Authorization: `Bearer ${key}` },
    }).then((r) => r.json());
    enlace = (String(detalle.text ?? '').match(/https:\/\/\S*\/auth\/confirm\?\S*token_hash=[^\s\]]+/) ?? [])[0] ?? null;
  }
  record('T0b-correo-de-confirmacion', Boolean(enlace), enlace ? enlace.slice(0, 92) + '…' : 'no llegó el correo');
  if (!enlace) throw new Error('Sin enlace de confirmación.');

  await page.goto(enlace, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const destino = new URL(page.url()).pathname;
  record('T0c-enlace-de-confirmacion', destino !== '/login', `el enlace aterriza en ${destino}`);
  await context.close();
}

async function main() {
  const browser = await chromium.launch();

  if (process.argv.includes('--signup')) {
    paso('0/4 alta de la cuenta de tutor (registro real + confirmación de correo)');
    await altaDeTutor(browser);
  }

  // ─────────────────── 1) el alumno genera su código ───────────────────
  paso('1/4 alumno: generar código de vinculación');
  const alumno = await nuevaSesion(browser);
  await login(alumno.page, STUDENT, '/app');
  await alumno.page.goto(`${BASE}/app/perfil`, { waitUntil: 'domcontentloaded' });
  await alumno.page.getByRole('button', { name: /generar código/i }).click();

  // El código son 6 dígitos; se espera a que aparezca en la tarjeta.
  const codigo = await alumno.page
    .waitForFunction(
      () => {
        const m = document.body.innerText.match(/\b\d{6}\b/);
        return m ? m[0] : null;
      },
      undefined,
      { timeout: 30_000 }
    )
    .then((h) => h.jsonValue());
  record('T1-codigo-generado', /^\d{6}$/.test(codigo ?? ''), `código de 6 dígitos: ${codigo}`);
  await alumno.context.close();

  // ─────────────────── 2) el tutor lo canjea ───────────────────
  paso('2/4 tutor: canjear el código');
  const tutor = await nuevaSesion(browser);

  // La vigilancia empieza ANTES del login: cubre todo lo que el tutor recibe.
  const leaks = [];
  const vistas = { total: 0, conCuerpo: 0, bytes: 0 };
  const cuerpos = [];
  tutor.page.on('response', async (res) => {
    const url = res.url();
    if (!url.startsWith(BASE)) return;
    if (/\.(css|js|woff2?|png|jpe?g|svg|ico|map)(\?|$)/.test(url)) return;
    vistas.total++;
    let body;
    try {
      body = await res.text();
    } catch {
      return;
    }
    vistas.conCuerpo++;
    vistas.bytes += body.length;
    cuerpos.push({ url, body });
    for (const { nombre, re } of LEAK_PATTERNS) {
      if (re.test(body)) {
        leaks.push({ url, patron: nombre, muestra: body.slice(0, 240) });
        break;
      }
    }
  });

  await login(tutor.page, TUTOR, '/tutor');
  const campo = tutor.page.getByRole('textbox').first();
  await campo.fill(codigo);
  await tutor.page.getByRole('button', { name: /vincular|canjear|conectar/i }).first().click();
  await tutor.page.waitForTimeout(6000);

  // ─────────────────── 3) recorrer el panel entero ───────────────────
  paso('3/4 tutor: recorrer el panel vigilando cada respuesta');
  await tutor.page.goto(`${BASE}/tutor`, { waitUntil: 'networkidle' });
  await tutor.page.waitForTimeout(3000);
  const panelTexto = await tutor.page.innerText('body');

  record(
    'T2-sin-contenido-de-reactivos',
    leaks.length === 0,
    leaks.length === 0
      ? `${vistas.conCuerpo} respuestas de red inspeccionadas (${Math.round(vistas.bytes / 1024)} kB), 0 con contenido de reactivos`
      : `¡FUGA! ${leaks[0].patron} en ${leaks[0].url} — ${leaks[0].muestra}`
  );

  // Control positivo: el panel tiene que TRAER las métricas. Un panel vacío
  // no filtra nada, y sin esta comprobación pasaría por aprobado.
  const senalesDeMetricas = [
    /Entr[oó]metro|Predicci[oó]n de aciertos/i,
    /racha/i,
    /simulacro|pr[aá]ctica|actividad/i,
  ];
  const encontradas = senalesDeMetricas.filter((re) => re.test(panelTexto));
  record(
    'T3-el-panel-si-muestra-metricas',
    encontradas.length === senalesDeMetricas.length,
    `${encontradas.length}/${senalesDeMetricas.length} señales de métricas presentes en el panel`
  );

  // Y que no aparezca en PANTALLA nada que parezca un reactivo.
  const pistasDeReactivo = [/¿Cu[aá]l de las siguientes/i, /Respuesta correcta/i, /Ver explicaci[oó]n/i];
  const enPantalla = pistasDeReactivo.filter((re) => re.test(panelTexto));
  record(
    'T4-sin-reactivos-en-pantalla',
    enPantalla.length === 0,
    enPantalla.length === 0 ? 'ni un enunciado, opción o explicación en el panel' : `aparece ${enPantalla[0]}`
  );

  // ─────────────────── 4) el tutor no puede entrar a lo del alumno ───────────────────
  paso('4/4 tutor: intentar entrar a las rutas del alumno');
  const rutasDeAlumno = ['/app', '/practicar', '/simulador', '/app/progreso'];
  const bloqueadas = [];
  for (const ruta of rutasDeAlumno) {
    await tutor.page.goto(`${BASE}${ruta}`, { waitUntil: 'domcontentloaded' });
    await tutor.page.waitForTimeout(1500);
    const final = new URL(tutor.page.url()).pathname;
    bloqueadas.push({ ruta, final, ok: final !== ruta });
  }
  record(
    'T5-rutas-de-alumno-cerradas-al-tutor',
    bloqueadas.every((b) => b.ok),
    bloqueadas.map((b) => `${b.ruta}→${b.final}`).join('  ')
  );

  await tutor.context.close();
  await browser.close();

  console.log('\nG71 — privacidad del panel del tutor contra producción\n');
  console.log('┌─ Resultado ──────────────────────────────────────────────────');
  for (const r of results) console.log(`│ ${r.ok ? '✅' : '❌'} ${r.id.padEnd(36)} ${r.detalle}`);
  console.log('└──────────────────────────────────────────────────────────────');
  console.log(`\nCódigo usado: ${codigo}`);
  console.log('\n─ Lo que el tutor SÍ ve (texto literal del panel) ─────────────');
  console.log(panelTexto.trim());
  console.log('──────────────────────────────────────────────────────────────');
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
