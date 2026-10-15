/**
 * scripts/g100/route-sweep.ts — G100, auditoría funcional: TODAS las pantallas
 * en los cuatro perfiles (anónimo, alumno, tutor, administrador).
 *
 *   G100_PROBE_PASSWORD=… G100_BASE=http://localhost:3101 pnpm verify:routes
 *
 * Por cada ruta: el código HTTP del documento, a dónde terminó (redirecciones
 * de rol incluidas), los errores de JavaScript en la página y en la consola, y
 * si se pintó la pantalla de error de Next. Una ruta pasa solo si aterriza
 * donde la matriz dice y sin un solo error.
 *
 * Solo lee. Las páginas con efectos al abrirse se eligieron a propósito: la
 * cuenta de alumno ya terminó su diagnóstico (abrir /diagnostico no crea
 * sesión) y /simulador solo muestra la entrada (empezar es una Server Action).
 * La ficha de un archivo de la bóveda NO se abre: son archivos reales del
 * dueño y verlos deja fila en su bitácora; se comprueba solo que un id
 * inexistente responde 404 y no 500.
 *
 * El perfil de administrador es una cuenta fixture promovida a ADMIN durante
 * la corrida y devuelta a su rol en un `finally`.
 */
import '../g71/env';
import { chromium, type Browser, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { freshSession, injectSession, sessionCookies } from './lib';

const BASE = (process.env.G100_BASE ?? 'http://localhost:3101').replace(/\/$/, '');

/**
 * El navegador SIEMPRE en hora de México, sin importar la zona de la máquina
 * que corre la sonda. Vercel renderiza en UTC: un componente que formatee o
 * calcule fechas con la zona local pinta en el navegador otra cosa que en el
 * servidor (G100: el calendario del tablero daba el error de hidratación #418
 * solo en producción). Contra un build local, levantarlo con `TZ=UTC`
 * (configuración `g100-utc` de `.claude/launch.json`) para reproducirlo.
 */
const CONTEXT = { timezoneId: 'America/Mexico_City', locale: 'es-MX' } as const;
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

type Expect = string | RegExp;
interface Row {
  perfil: string;
  ruta: string;
  ok: boolean;
  detalle: string;
}
const rows: Row[] = [];

/** Ruido conocido que no es un defecto de la app en un build local. */
const BENIGN = [
  /Failed to load resource: the server responded with a status of 404/, // la prueba de 404 lo provoca
  /posthog/i,
];

async function visit(page: Page, perfil: string, ruta: string, expected: Expect): Promise<void> {
  const errors: string[] = [];
  const onConsole = (m: { type(): string; text(): string }) => {
    if (m.type() === 'error' && !BENIGN.some((b) => b.test(m.text()))) errors.push(m.text().slice(0, 140));
  };
  const onPageError = (e: Error) => errors.push(`pageerror: ${e.message.slice(0, 140)}`);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  let status = 0;
  try {
    const res = await page.goto(`${BASE}${ruta}`, { waitUntil: 'networkidle', timeout: 45_000 });
    status = res?.status() ?? 0;
    await page.waitForTimeout(300);
  } catch (err) {
    errors.push(`navegación: ${err instanceof Error ? err.message.slice(0, 120) : String(err)}`);
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
  }
  const u = new URL(page.url());
  const landed = u.pathname;
  const errorScreen = await page
    .getByText(/Application error|algo salió mal|Internal Server Error/i)
    .count()
    .catch(() => 0);
  const landedOk = typeof expected === 'string' ? landed === expected : expected.test(landed);
  const statusOk = expected === '404' ? status === 404 : status > 0 && status < 400;
  const ok = (expected === '404' ? statusOk : landedOk && statusOk) && errors.length === 0 && errorScreen === 0;
  const detalle = `${status} → ${landed}${u.search}${errors.length ? ` · errores: ${errors.join(' | ')}` : ''}${errorScreen ? ' · PANTALLA DE ERROR' : ''}`;
  rows.push({ perfil, ruta, ok, detalle });
  console.log(`  ${ok ? '✅' : '❌'} [${perfil}] ${ruta} — ${detalle}`);
}

async function firstHref(page: Page, prefix: string): Promise<string | null> {
  const hrefs = await page.locator(`a[href^="${prefix}"]`).evaluateAll((as) =>
    as.map((a) => a.getAttribute('href') ?? '')
  );
  return hrefs.find((h) => h.length > prefix.length) ?? null;
}

async function anon(browser: Browser): Promise<void> {
  console.log('\n· anónimo');
  const ctx = await browser.newContext(CONTEXT);
  const page = await ctx.newPage();
  for (const [ruta, exp] of [
    ['/', '/'],
    ['/precios', '/precios'],
    ['/login', '/login'],
    ['/login?sesion=cerrada', '/login'],
    ['/login?sesion=expirada', '/login'],
    ['/registro', '/registro'],
    ['/registro?role=tutor', '/registro'],
    ['/recuperar-password', '/recuperar-password'],
    ['/legal/privacidad', '/legal/privacidad'],
    ['/legal/terminos', '/legal/terminos'],
    ['/app', '/login'],
    ['/practicar', '/login'],
    ['/simulador', '/login'],
    ['/onboarding', '/login'],
    ['/tutor', '/login'],
    ['/admin', '/login'],
    ['/admin/usuarios', '/login'],
    ['/ruta-que-no-existe', '404'],
  ] as const) {
    await visit(page, 'anónimo', ruta, exp);
  }
  // El cierre de sesión solo acepta POST: un GET no puede cerrar nada.
  const get = await fetch(`${BASE}/auth/salir`, { redirect: 'manual' });
  const ok = get.status === 405;
  rows.push({ perfil: 'anónimo', ruta: 'GET /auth/salir', ok, detalle: `${get.status}` });
  console.log(`  ${ok ? '✅' : '❌'} [anónimo] GET /auth/salir — ${get.status} (se espera 405)`);
  await ctx.close();
}

async function student(browser: Browser): Promise<void> {
  console.log('\n· alumno (onboarding y diagnóstico completos, sin plan)');
  const ctx = await browser.newContext(CONTEXT);
  await injectSession(ctx, await freshSession('rlsprobe.alumnoa@acierta-test.mx'), BASE);
  const page = await ctx.newPage();
  for (const [ruta, exp] of [
    ['/app', '/app'],
    ['/app/perfil', '/app/perfil'],
    ['/app/progreso', '/app/progreso'],
    ['/app/examen-oficial', '/app/examen-oficial'],
    ['/practicar', '/practicar'],
    ['/simulador', '/simulador'],
    ['/diagnostico', '/diagnostico'],
    ['/paywall', '/paywall'],
    ['/onboarding', /^\/(app|onboarding)$/],
    ['/tutor', /^\/(app|tutor)$/],
    ['/admin', '/app'],
    ['/admin/usuarios', '/app'],
    ['/login', /^\/(login|app)$/],
    ['/', '/'],
  ] as const) {
    await visit(page, 'alumno', ruta, exp);
  }
  await page.goto(`${BASE}/app/examen-oficial`, { waitUntil: 'domcontentloaded' });
  const exam = await firstHref(page, '/app/examen-oficial/');
  if (exam) await visit(page, 'alumno', exam, exam);
  await visit(page, 'alumno', '/app/examen-oficial/no-existe-g100', '404');

  // G100 🔴 — EL CUERPO DE LA REDIRECCIÓN. El navegador sigue el 307 y nunca
  // lo enseña, así que la fuga solo se ve con una petición cruda: hasta G100,
  // el 307 de /admin/bitacora a una sesión de ALUMNO traía 25 correos de
  // cuentas reales. Se buscan correos ajenos (cualquiera que no sea el propio
  // ni el de contacto del sitio) y las marcas de cada pantalla del panel.
  const cookie = (await ctx.cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
  const own = 'rlsprobe.alumnoa@acierta-test.mx';
  // Las marcas son textos del CUERPO de cada pantalla, nunca su título: el
  // `<title>` de la página viaja en la redirección aunque no haya fuga (la
  // primera versión de esta comprobación marcaba /admin/boveda por eso).
  for (const [ruta, marca] of [
    ['/admin', /Solo tú puedes|Reservado al administrador/],
    ['/admin/usuarios', /Busca por correo o por nombre/],
    ['/admin/bitacora', /de administración\. No se puede/],
    ['/admin/questions/queue', /pipeline adversarial \(F2\) no auto-aprobó/],
    ['/admin/reports', /o más reportes sin resolver/],
    ['/admin/coverage', /salud del pipeline adversarial/],
    ['/admin/boveda', /Archivos privados del administrador/],
    ['/admin/usuarios/rlsprobe_alumnob', /Correo verificado|Planes y pagos/],
  ] as const) {
    const res = await fetch(`${BASE}${ruta}`, { headers: { Cookie: cookie }, redirect: 'manual' });
    const body = await res.text();
    const foreign = [...new Set(body.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? [])].filter(
      (e) => e !== own && !e.endsWith('@yaentre.com')
    );
    const marker = marca.test(body);
    const ok = res.status === 307 && foreign.length === 0 && !marker;
    rows.push({ perfil: 'alumno', ruta: `cuerpo de ${ruta}`, ok, detalle: `${res.status}` });
    console.log(
      `  ${ok ? '✅' : '❌'} [alumno] cuerpo crudo de ${ruta} — ${res.status} → ${res.headers.get('location') ?? ''} · ${body.length} bytes · correos ajenos: ${foreign.length} · contenido del panel: ${marker ? 'SÍ' : 'no'}`
    );
  }
  await ctx.close();
}

async function parent(browser: Browser): Promise<void> {
  console.log('\n· tutor');
  const ctx = await browser.newContext(CONTEXT);
  await injectSession(ctx, await freshSession('rlsprobe.tutor@acierta-test.mx'), BASE);
  const page = await ctx.newPage();
  for (const [ruta, exp] of [
    ['/tutor', '/tutor'],
    ['/app', '/tutor'],
    ['/simulador', '/tutor'],
    ['/admin', /^\/(app|tutor)$/],
  ] as const) {
    await visit(page, 'tutor', ruta, exp);
  }
  await ctx.close();
}

async function admin(browser: Browser): Promise<void> {
  const fixtureId = 'rlsprobe_alumnob';
  const original = await prisma.userProfile.findUniqueOrThrow({
    where: { id: fixtureId },
    select: { role: true, onboardingStep: true },
  });
  console.log('\n· administrador (cuenta fixture promovida; onboarding DONE como la cuenta real)');
  try {
    await prisma.userProfile.update({ where: { id: fixtureId }, data: { role: 'ADMIN', onboardingStep: 3 } });
    const ctx = await browser.newContext(CONTEXT);
    await injectSession(ctx, await freshSession('rlsprobe.alumnob@acierta-test.mx'), BASE);
    const page = await ctx.newPage();
    for (const [ruta, exp] of [
      ['/admin', '/admin'],
      ['/admin/questions/queue', '/admin/questions/queue'],
      ['/admin/reports', '/admin/reports'],
      ['/admin/coverage', '/admin/coverage'],
      ['/admin/usuarios', '/admin/usuarios'],
      ['/admin/usuarios/rlsprobe_alumnoa', '/admin/usuarios/rlsprobe_alumnoa'],
      ['/admin/bitacora', '/admin/bitacora'],
      ['/admin/boveda', '/admin/boveda'],
      ['/app', '/app'],
      ['/app/perfil', '/app/perfil'],
    ] as const) {
      await visit(page, 'admin', ruta, exp);
    }
    await page.goto(`${BASE}/admin/questions/queue`, { waitUntil: 'domcontentloaded' });
    const q = await firstHref(page, '/admin/questions/');
    if (q && !q.startsWith('/admin/questions/queue')) await visit(page, 'admin', q, q.split('?')[0]);
    await visit(page, 'admin', '/admin/usuarios/cku0000000000000000000000', '404');
    await visit(page, 'admin', '/admin/boveda/cku0000000000000000000000', '404');

    // G100 — NAVEGACIÓN PARCIAL. En una navegación del lado del cliente Next
    // NO vuelve a ejecutar el layout (el cliente avisa con
    // `Next-Router-State-Tree` qué segmentos ya tiene montados): si la página
    // dependiera del guard del layout, esa petición se lo saltaría. Se
    // capturan peticiones RSC REALES del admin navegando por el panel y se
    // repiten con la sesión de un ALUMNO.
    const captured: Array<{ url: string; headers: Record<string, string> }> = [];
    page.on('request', (r) => {
      const h = r.headers();
      if (h['rsc'] === '1' && !h['next-router-prefetch'] && /\/admin\/(usuarios|bitacora)/.test(r.url())) {
        captured.push({ url: r.url(), headers: h });
      }
    });
    await page.goto(`${BASE}/admin/coverage`, { waitUntil: 'networkidle' });
    for (const [label, path] of [
      ['Usuarios', '/admin/usuarios'],
      ['Bitácora', '/admin/bitacora'],
    ] as const) {
      await page.getByRole('navigation').getByRole('link', { name: label }).click();
      await page.waitForURL((u) => u.pathname === path);
      await page.waitForLoadState('networkidle');
    }
    const studentCookie = sessionCookies(await freshSession('rlsprobe.alumnoa@acierta-test.mx'))
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');
    for (const cap of captured) {
      const headers: Record<string, string> = { Cookie: studentCookie };
      for (const k of ['rsc', 'next-router-state-tree', 'next-url']) if (cap.headers[k]) headers[k] = cap.headers[k];
      const res = await fetch(cap.url, { headers, redirect: 'manual' });
      const body = await res.text();
      const foreign = [...new Set(body.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? [])].filter(
        (e) => e !== 'rlsprobe.alumnoa@acierta-test.mx' && !e.endsWith('@yaentre.com')
      );
      const content = /Busca por correo o por nombre|de administración\. No se puede/.test(body);
      const ok = foreign.length === 0 && !content;
      const ruta = `RSC parcial ${new URL(cap.url).pathname}`;
      rows.push({ perfil: 'alumno', ruta, ok, detalle: `${res.status}` });
      console.log(
        `  ${ok ? '✅' : '❌'} [alumno] ${ruta} con el árbol real del admin — ${res.status} · ${body.length} bytes · correos ajenos: ${foreign.length} · contenido del panel: ${content ? 'SÍ' : 'no'}`
      );
    }
    const enough = captured.length >= 2;
    rows.push({ perfil: 'admin', ruta: '(captura RSC)', ok: enough, detalle: `${captured.length}` });
    if (!enough) console.log(`  ❌ solo se capturaron ${captured.length} peticiones RSC: la prueba parcial no corrió`);
    await ctx.close();
  } finally {
    await prisma.userProfile.update({ where: { id: fixtureId }, data: original });
    const back = await prisma.userProfile.findUniqueOrThrow({
      where: { id: fixtureId },
      select: { role: true, onboardingStep: true },
    });
    const ok = back.role === original.role && back.onboardingStep === original.onboardingStep;
    rows.push({ perfil: 'admin', ruta: '(restaurar fixture)', ok, detalle: `${back.role}/${back.onboardingStep}` });
    console.log(`  ${ok ? '✅' : '❌'} fixture restaurada a ${back.role}/${back.onboardingStep}`);
  }
}

async function main(): Promise<void> {
  if (!process.env.G100_PROBE_PASSWORD) {
    console.error('Falta G100_PROBE_PASSWORD.');
    process.exitCode = 1;
    return;
  }
  console.log(`G100 — barrido de pantallas contra ${BASE}`);
  const browser = await chromium.launch();
  try {
    await anon(browser);
    await student(browser);
    await parent(browser);
    await admin(browser);
  } catch (err) {
    rows.push({ perfil: '-', ruta: 'excepción', ok: false, detalle: String(err) });
    console.log(`  ❌ excepción — ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
  const bad = rows.filter((r) => !r.ok);
  console.log(`\n${rows.length - bad.length}/${rows.length} pantallas en verde.`);
  if (bad.length) process.exitCode = 1;
}

void main();
