/**
 * G65 — Verificación en NAVEGADOR REAL de los flujos que la fase tocó.
 *
 * Playwright contra el build de producción en http://localhost:3000. Comprueba
 * lo que solo se ve ejecutando la app de verdad:
 *   1. la cookie de sesión ya NO es legible por JavaScript (`httpOnly`) y aun
 *      así el login funciona — el cambio de G65 con más superficie de rotura;
 *   2. cambiar la contraseña con la ACTUAL equivocada se rechaza;
 *   3. y con la correcta, funciona (y luego se restaura);
 *   4. el límite de tasa del login corta de verdad tras 8 intentos fallidos.
 *
 * Uso:
 *   node scripts/security/ui-probe.mjs
 * Variables: G65_UI_EMAIL, G65_UI_PASSWORD, G65_BASE_URL.
 */
import { chromium } from '@playwright/test';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';

// `.env.local` PRIMERO (dotenv no sobreescribe lo ya definido), igual que hace
// Next.js en runtime y `scripts/lib/env.ts` en los scripts offline.
for (const file of ['.env.local', '.env']) if (existsSync(file)) config({ path: file, quiet: true });

const BASE = process.env.G65_BASE_URL ?? 'http://localhost:3000';
const EMAIL = process.env.G65_UI_EMAIL;
const PASSWORD = process.env.G65_UI_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Faltan G65_UI_EMAIL / G65_UI_PASSWORD.');
  process.exit(1);
}

/**
 * La sonda empieza limpiando SUS cubos de límite de tasa. No es hacer trampa:
 * el límite ya se prueba de forma aislada en `pnpm security:ratelimit`, y aquí
 * se necesita partir de cero para poder medir EN QUÉ INTENTO corta. Sin esto,
 * una segunda corrida se bloquea a sí misma en el primer login.
 */
async function limpiarCubos() {
  // Import DINÁMICO a propósito: `@prisma/client` carga `.env` por su cuenta al
  // importarse, y en ESM los imports se evalúan ANTES del cuerpo del módulo —
  // así que un import estático dejaría ganar al `DATABASE_URL` de `.env`
  // (localhost, valor de desarrollo temprano) sobre el de `.env.local`.
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  try {
    await prisma.$executeRawUnsafe(
      "DELETE FROM app_security.rate_limit_hits WHERE bucket_key LIKE 'SIGN_IN:%' OR bucket_key LIKE 'PASSWORD_CHANGE:%'"
    );
  } finally {
    await prisma.$disconnect();
  }
}

const results = [];
const record = (id, ok, detalle) => {
  results.push({ id, ok, detalle });
  console.log(`  ${ok ? '✅' : '❌'} ${id} — ${detalle}`);
};
const paso = (m) => console.log(`· ${m}`);

/**
 * Junta el texto de los `[role=alert]` CON contenido.
 *
 * Ojo: la página siempre trae un `<div role="alert">` VACÍO (la región del
 * toaster). Esperar a que "haya un alert" se cumple al instante con ése y se
 * lee antes de que el servidor conteste — por eso se espera a que alguno tenga
 * texto, no a que exista.
 */
async function leerAlertas(page, timeoutMs = 12_000) {
  const hasta = Date.now() + timeoutMs;
  while (Date.now() < hasta) {
    const textos = (await page.locator('[role="alert"]').allTextContents())
      .map((t) => t.trim())
      .filter(Boolean);
    if (textos.length > 0) return textos.join(' · ');
    await page.waitForTimeout(250);
  }
  return null;
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await limpiarCubos();

  // ── 1. Sesión httpOnly ────────────────────────────────────────────────────
  paso('1/4 login');
  await login(page, EMAIL, PASSWORD);
  await page.waitForURL(/\/app/, { timeout: 30_000 });

  const desdeJs = await page.evaluate(() => document.cookie);
  const cookies = await context.cookies();
  const authCookies = cookies.filter((c) => c.name.includes('auth-token'));
  record(
    'U1-login-funciona',
    page.url().includes('/app'),
    `login con cookie httpOnly → ${page.url()}`
  );
  record(
    'U2-cookie-httponly',
    authCookies.length > 0 && authCookies.every((c) => c.httpOnly),
    `${authCookies.length} cookies de sesión, httpOnly=${authCookies.map((c) => c.httpOnly).join('/')}, ` +
      `sameSite=${authCookies.map((c) => c.sameSite).join('/')}`
  );
  record(
    'U3-invisible-a-js',
    !desdeJs.includes('auth-token'),
    `document.cookie ${desdeJs === '' ? 'vacío' : `= "${desdeJs.slice(0, 60)}"`}`
  );

  // ── 2. Cambio de contraseña con la ACTUAL equivocada ───────────────────────
  paso('2/4 contraseña actual equivocada');
  await page.goto(`${BASE}/app/perfil`);
  await page.getByLabel('Contraseña actual').fill('clave-que-no-es');
  await page.getByLabel('Nueva contraseña').fill('ClaveTemporalG65x');
  await page.getByRole('button', { name: /^Cambiar$/ }).click();
  const errorTexto = await leerAlertas(page);
  record(
    'U4-rechaza-actual-mala',
    Boolean(errorTexto && /no coincide/i.test(errorTexto)),
    `mensaje mostrado: "${errorTexto ?? '(ninguno)'}"`
  );

  // La sesión debe seguir viva: verificar la contraseña NO puede tumbarla.
  await page.goto(`${BASE}/app`);
  record(
    'U5-sesion-intacta',
    page.url().includes('/app') && !page.url().includes('/login'),
    `tras el intento fallido sigue en ${page.url()}`
  );

  // ── 3. Cambio con la contraseña correcta, y vuelta atrás ──────────────────
  paso('3/4 contraseña actual correcta');
  // Temporal ALEATORIA: si fuera fija y una corrida anterior murió a medias,
  // coincidiría con la contraseña vigente y Supabase la rechaza por "igual a la
  // anterior" — un falso negativo que ya nos pasó.
  const TEMPORAL = `G65tmp-${Math.random().toString(36).slice(2, 10)}-Aa1`;
  await page.goto(`${BASE}/app/perfil`);
  await page.getByLabel('Contraseña actual').fill(PASSWORD);
  await page.getByLabel('Nueva contraseña').fill(TEMPORAL);
  await page.getByRole('button', { name: /^Cambiar$/ }).click();
  const okTexto = await page
    .locator('[role="status"]')
    .first()
    .textContent({ timeout: 20_000 })
    .catch(() => null);
  record(
    'U6-acepta-actual-buena',
    Boolean(okTexto && /actualiz/i.test(okTexto)),
    `mensaje mostrado: "${okTexto ?? '(ninguno)'}"`
  );

  if (okTexto) {
    await page.goto(`${BASE}/app/perfil`);
    await page.getByLabel('Contraseña actual').fill(TEMPORAL);
    await page.getByLabel('Nueva contraseña').fill(PASSWORD);
    await page.getByRole('button', { name: /^Cambiar$/ }).click();
    const restaurado = await page
      .locator('[role="status"]')
      .first()
      .textContent({ timeout: 20_000 })
      .catch(() => null);
    record('U7-restaura-contrasena', Boolean(restaurado), `restauración: "${restaurado ?? '(falló)'}"`);
  }

  // ── 4. Límite de tasa del login ───────────────────────────────────────────
  // Cuenta INEXISTENTE a propósito: se mide el cubo por IP sin gastar el
  // presupuesto de una cuenta real ni arriesgar un bloqueo de Supabase.
  paso('4/4 límite de tasa del login');
  const victima = `g65-inexistente-${Date.now()}@acierta-test.mx`;
  // Los pasos 1-3 ya gastaron parte del cubo por IP; se vacía otra vez para
  // que el conteo del bloqueo empiece limpio.
  await limpiarCubos();

  const fresh = await browser.newContext();
  const p2 = await fresh.newPage();
  let bloqueadoEn = null;
  const vistos = [];
  for (let i = 1; i <= 12; i++) {
    paso(`   intento ${i}`);
    await login(p2, victima, `contrasena-mala-${i}`);
    const alerta = (await leerAlertas(p2)) ?? '';
    vistos.push(`${i}:${alerta.slice(0, 40)}`);
    if (/demasiados intentos/i.test(alerta)) {
      bloqueadoEn = i;
      break;
    }
  }
  if (!bloqueadoEn) console.log('  mensajes observados:', vistos.join(' | '));
  record(
    'U8-limite-login',
    bloqueadoEn !== null && bloqueadoEn <= 10,
    bloqueadoEn
      ? `bloqueado en el intento ${bloqueadoEn} (presupuesto 8)`
      : '12 intentos fallidos SIN bloqueo'
  );
  await fresh.close();

  await browser.close();

  console.log('G65 — verificación en navegador real\n');
  console.log('┌─ Resultado ──────────────────────────────────────────────────');
  for (const r of results) console.log(`│ ${r.ok ? '✅' : '❌'} ${r.id.padEnd(24)} ${r.detalle}`);
  console.log('└──────────────────────────────────────────────────────────────');
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
