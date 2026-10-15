/**
 * scripts/g100/session-probe.ts — G100, verificación POR EFECTO de la sesión
 * «sin rastro» y de la distinción del administrador maestro.
 *
 *   G100_PROBE_PASSWORD=… G100_BASE=http://localhost:3100 pnpm verify:session-no-trace
 *
 * Contra un servidor real (build de producción local o el dominio), con el
 * Auth real de Supabase y navegadores reales de Playwright. Cada contexto de
 * Playwright es un dispositivo distinto: no comparten cookies ni almacenamiento.
 *
 * Variables:
 *   G100_PROBE_PASSWORD   contraseña TEMPORAL de las cuentas fixture (obligatoria)
 *   G100_BASE             URL del servidor (default http://localhost:3100)
 *   G100_EXPECT_MASTER    '1' si el servidor tiene a la cuenta admin fixture en
 *                         MASTER_ADMIN_EMAILS; '0' si no. Sin ella se omiten las
 *                         comprobaciones de maestro.
 *   G100_CAP_SECS         si el servidor corre con EPHEMERAL_SESSION_MAX_AGE_SECS
 *                         corto, ese valor: activa la prueba del tope de vida.
 *   G100_ONLY             lista de bloques a correr (p. ej. 'S2' o 'S,A').
 *
 * Solo cuentas fixture `@acierta-test.mx`. La cuenta que se promueve a ADMIN
 * vuelve a su rol y paso de onboarding originales en un `finally`, pase lo que
 * pase: una sonda que deja una cuenta con rol ADMIN es un defecto propio
 * (G71 §6 D6).
 */
import '../g71/env';
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { COOKIE_NAME, freshSession, injectSession, sessionCookies } from './lib';

const BASE = (process.env.G100_BASE ?? 'http://localhost:3100').replace(/\/$/, '');
const PASSWORD = process.env.G100_PROBE_PASSWORD ?? '';
const EXPECT_MASTER = process.env.G100_EXPECT_MASTER;
const CAP_SECS = process.env.G100_CAP_SECS ? Number(process.env.G100_CAP_SECS) : null;
const ONLY = (process.env.G100_ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean);

const STUDENT = 'rlsprobe.alumnoa@acierta-test.mx';
const ADMIN_FIXTURE = 'rlsprobe.alumnob@acierta-test.mx';
const PARENT = 'rlsprobe.tutor@acierta-test.mx';


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
const runs = (block: string): boolean =>
  ONLY.length === 0 || ONLY.some((o) => block === o || block.startsWith(o));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function readSessionFromContext(ctx: BrowserContext): Promise<Record<string, unknown> | null> {
  const cookies = (await ctx.cookies()).filter(
    (c) => c.name === COOKIE_NAME || c.name.startsWith(`${COOKIE_NAME}.`)
  );
  if (cookies.length === 0) return null;
  const sorted = cookies.sort((a, b) => {
    const ia = a.name === COOKIE_NAME ? -1 : Number(a.name.split('.').pop());
    const ib = b.name === COOKIE_NAME ? -1 : Number(b.name.split('.').pop());
    return ia - ib;
  });
  const joined = sorted.map((c) => c.value).join('');
  if (!joined.startsWith('base64-')) return null;
  return JSON.parse(Buffer.from(joined.slice(7), 'base64url').toString('utf8'));
}

async function authCookies(ctx: BrowserContext) {
  return (await ctx.cookies()).filter((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'));
}

async function newDevice(browser: Browser): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  return { ctx, page };
}

/** Entra por el formulario REAL. Hasta 4 clics: antes de hidratar, el botón no
 *  hace nada (G99, lección de `admin:vault-headers`). */
async function uiLogin(page: Page, email: string): Promise<void> {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel(/correo/i).fill(email);
  await page.getByLabel(/contraseña/i).fill(PASSWORD);
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    try {
      await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15_000 });
      return;
    } catch {
      const body = await page.textContent('body');
      if (body && /demasiados intentos/i.test(body)) {
        throw new Error('Límite de tasa de login agotado (G65): esperar 10 min o limpiar el contador.');
      }
    }
  }
  throw new Error(`El login de ${email} no salió de /login`);
}

async function clickSignOut(page: Page): Promise<{ status: number; clearSiteData: string | null }> {
  const responsePromise = page.waitForResponse(
    (r) => r.url().endsWith('/auth/salir') && r.request().method() === 'POST',
    { timeout: 20_000 }
  );
  await page.getByRole('button', { name: /cerrar sesión/i }).first().click();
  const res = await responsePromise;
  await page.waitForURL((u) => u.pathname === '/login', { timeout: 20_000 });
  // Igual que Set-Cookie: `headers()` no trae Clear-Site-Data.
  return { status: res.status(), clearSiteData: await res.headerValue('clear-site-data') };
}

async function landsOn(page: Page, path: string): Promise<string> {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  const u = new URL(page.url());
  return `${u.pathname}${u.search}`;
}

// ── Bloques ─────────────────────────────────────────────────────────────────

async function blockS(browser: Browser): Promise<void> {
  paso('S1 — login real de alumno: aterriza en /app y la cookie muere con el navegador');
  const a = await newDevice(browser);
  await uiLogin(a.page, STUDENT);
  record('S1-destino', new URL(a.page.url()).pathname === '/app', `aterrizó en ${new URL(a.page.url()).pathname}`);
  const cookies = await authCookies(a.ctx);
  const allSession = cookies.length > 0 && cookies.every((c) => c.expires === -1);
  record(
    'S1-cookie-de-sesion',
    allSession,
    `${cookies.length} cookie(s) de Auth; expires=${cookies.map((c) => c.expires).join(',')} (-1 = muere al cerrar el navegador)`
  );
  record('S1-httponly', cookies.length > 0 && cookies.every((c) => c.httpOnly), 'httpOnly en todas (G65)');

  paso('S2 — el refresco de sesión del middleware LLEGA al navegador');
  const before = await readSessionFromContext(a.ctx);
  if (!before) {
    record('S2-refresco', false, 'no se pudo leer la sesión de la cookie');
  } else {
    // Se fuerza el refresco: `expires_at` en el pasado hace que supabase-js
    // rote el par de tokens en la siguiente petición, como pasa cada hora.
    const forced = { ...before, expires_at: Math.floor(Date.now() / 1000) - 120 };
    // La cabecera se mira con HTTP crudo: Playwright NO expone el Set-Cookie
    // de una navegación (ni `headers()`, ni `headersArray()`, ni
    // `headerValues()` lo trajeron en Chromium) — la primera versión de esta
    // sonda daba rojo con el refresco funcionando, y la cookie rotada en el
    // navegador era la prueba de que el rojo era falso.
    const raw = await fetch(`${BASE}/app/progreso`, {
      redirect: 'manual',
      headers: { Cookie: sessionCookies(forced).map((c) => `${c.name}=${c.value}`).join('; ') },
    });
    const setCookies = raw.headers.getSetCookie().filter((v) => v.includes('-auth-token'));
    const wroteNew = setCookies.some((v) => /-auth-token(\.\d+)?=base64-/.test(v));
    const persistentAttr = setCookies.some((v) => /;\s*(max-age=[1-9]|expires=)/i.test(v));
    record(
      'S2-set-cookie',
      wroteNew,
      wroteNew
        ? `la respuesta trae ${setCookies.length} Set-Cookie con el token nuevo`
        : 'la respuesta NO trae el token refrescado (el defecto de la respuesta obsoleta del middleware)'
    );
    record(
      'S2-sin-caducidad',
      wroteNew && !persistentAttr,
      persistentAttr
        ? 'el token refrescado volvió con Max-Age/Expires'
        : `el token refrescado sigue siendo cookie de sesión (${setCookies[0]?.split(';').slice(1).map((x) => x.trim().split('=')[0]).join(',') ?? '—'})`
    );
    // Y en un navegador real: el refresh token ROTADO tiene que quedarse en él.
    await a.ctx.clearCookies();
    await injectSession(a.ctx, forced, BASE);
    await a.page.goto(`${BASE}/app/progreso`, { waitUntil: 'domcontentloaded' });
    const after = await readSessionFromContext(a.ctx);
    record(
      'S2-rotado',
      !!after && after.refresh_token !== before.refresh_token,
      'el navegador guarda el refresh token NUEVO'
    );
    // Pasado el intervalo de reuso de Supabase (10 s), un refresh token ya
    // usado se rechaza: si el navegador se hubiera quedado con el viejo, aquí
    // la sesión caería a /login.
    await sleep(12_000);
    const stay = await landsOn(a.page, '/app');
    record('S2-sigue-viva', stay === '/app', `tras 12 s: ${stay}`);
  }

  paso('S3 — cerrar sesión borra TODO lo del sitio y revoca la sesión en el servidor');
  await a.page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
  await a.page.evaluate(async () => {
    localStorage.setItem('g100-marca', '1');
    sessionStorage.setItem('g100-marca', '1');
    await caches.open('g100-marca');
  });
  const replay = await a.ctx.cookies();
  const out = await clickSignOut(a.page);
  record('S3-303', out.status === 303, `POST /auth/salir → ${out.status}`);
  record(
    'S3-clear-site-data',
    out.clearSiteData === '"cache", "cookies", "storage"',
    `Clear-Site-Data: ${out.clearSiteData ?? '(ausente)'}`
  );
  const landed = new URL(a.page.url());
  record('S3-aviso', landed.searchParams.get('sesion') === 'cerrada', `aterrizó en ${landed.pathname}${landed.search}`);
  record('S3-sin-cookies', (await authCookies(a.ctx)).length === 0, 'sin cookies de Auth en el navegador');
  const leftovers = await a.page.evaluate(async () => ({
    local: localStorage.getItem('g100-marca'),
    caches: (await caches.keys()).filter((k) => k === 'g100-marca').length,
    sw: (await navigator.serviceWorker?.getRegistrations?.())?.length ?? 0,
  }));
  record('S3-localstorage', leftovers.local === null, `localStorage: ${leftovers.local ?? 'vacío'}`);
  record('S3-cache-storage', leftovers.caches === 0, `Cache Storage de prueba: ${leftovers.caches ? 'sigue' : 'borrada'}`);
  await a.ctx.close();

  const thief = await newDevice(browser);
  await thief.ctx.addCookies(replay);
  const thiefLanded = await landsOn(thief.page, '/app');
  record(
    'S3-revocada',
    thiefLanded.startsWith('/login'),
    `reusar las cookies copiadas ANTES de salir → ${thiefLanded}`
  );
  await thief.ctx.close();

  paso('S4 — salir en un dispositivo NO cierra los demás (signOut local)');
  const d1 = await newDevice(browser);
  const d2 = await newDevice(browser);
  await injectSession(d1.ctx, await freshSession(STUDENT), BASE);
  await injectSession(d2.ctx, await freshSession(STUDENT), BASE);
  const d1in = await landsOn(d1.page, '/app');
  const d2in = await landsOn(d2.page, '/app');
  record('S4-ambos-dentro', d1in === '/app' && d2in === '/app', `d1=${d1in} d2=${d2in}`);
  await d1.page.waitForLoadState('networkidle');
  await clickSignOut(d1.page);
  const d2after = await landsOn(d2.page, '/app/progreso');
  record('S4-el-otro-sigue', d2after === '/app/progreso', `tras salir en d1, d2 → ${d2after}`);
  const d1after = await landsOn(d1.page, '/app');
  record('S4-el-que-salio-no', d1after.startsWith('/login'), `d1 → ${d1after}`);
  await d1.ctx.close();

  paso('S5 — un sitio ajeno NO puede cerrar la sesión (CSRF)');
  const victim = await readSessionFromContext(d2.ctx);
  const cookieHeader = (await d2.ctx.cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
  const csrf = await fetch(`${BASE}/auth/salir`, {
    method: 'POST',
    redirect: 'manual',
    headers: { Cookie: cookieHeader, Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' },
  });
  record('S5-403', csrf.status === 403, `POST cross-site → ${csrf.status}`);
  const stillIn = await landsOn(d2.page, '/app');
  record('S5-sesion-intacta', stillIn === '/app' && !!victim, `la víctima sigue en ${stillIn}`);
  await d2.ctx.close();

  paso('S6 — tutor: aterriza en /tutor y sale desde su panel');
  const t = await newDevice(browser);
  await uiLogin(t.page, PARENT);
  record('S6-destino', new URL(t.page.url()).pathname === '/tutor', `aterrizó en ${new URL(t.page.url()).pathname}`);
  await t.page.waitForLoadState('networkidle');
  const tout = await clickSignOut(t.page);
  record('S6-salida', tout.status === 303 && (await authCookies(t.ctx)).length === 0, `303 y sin cookies`);
  await t.ctx.close();
}

async function blockA(browser: Browser): Promise<void> {
  const fixture = await prisma.userProfile.findFirst({
    where: { id: 'rlsprobe_alumnob' },
    select: { id: true, role: true, onboardingStep: true },
  });
  const target = await prisma.userProfile.findFirst({ where: { id: 'rlsprobe_alumnoa' }, select: { id: true } });
  if (!fixture || !target) {
    record('A-setup', false, 'no existen las cuentas fixture rlsprobe_alumnob / rlsprobe_alumnoa');
    return;
  }

  try {
    paso('A1 — ADMIN sin onboarding de alumno: el login lo lleva a SU panel, no al asistente');
    // Paso 0 = nunca empezó el asistente (`OnboardingStep.EXAM`); 3 = DONE.
    await prisma.userProfile.update({ where: { id: fixture.id }, data: { role: 'ADMIN', onboardingStep: 0 } });
    const a = await newDevice(browser);
    await uiLogin(a.page, ADMIN_FIXTURE);
    record('A1-destino', new URL(a.page.url()).pathname === '/admin', `aterrizó en ${new URL(a.page.url()).pathname}`);
    const badge = (await a.page.getByTestId('admin-role-badge').textContent())?.trim() ?? '';
    if (EXPECT_MASTER !== undefined) {
      const wantMaster = EXPECT_MASTER === '1';
      record(
        'A1-insignia',
        wantMaster ? /maestro/i.test(badge) : badge === 'Administrador',
        `insignia: «${badge}» (se esperaba ${wantMaster ? 'maestro' : 'admin a secas'})`
      );
      const heading = (await a.page.locator('h1').first().textContent())?.trim() ?? '';
      record(
        'A1-titulo',
        wantMaster ? /maestro/i.test(heading) : !/maestro/i.test(heading),
        `título: «${heading}»`
      );
    }
    const viaApp = await landsOn(a.page, '/app');
    record('A1-app-devuelve-al-panel', viaApp === '/admin', `/app → ${viaApp}`);
    const viaSim = await landsOn(a.page, '/simulador');
    record('A1-simulador-devuelve-al-panel', viaSim === '/admin', `/simulador → ${viaSim}`);
    await a.page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
    const sessionCard = (await a.page.getByTestId('admin-session-card').textContent()) ?? '';
    record(
      'A1-tarjeta-sesion',
      /no se guarda en el dispositivo/i.test(sessionCard),
      'el panel explica que la sesión no se guarda'
    );

    if (EXPECT_MASTER !== undefined) {
      paso('A2 — componentes de maestro en la ficha de una cuenta');
      await a.page.goto(`${BASE}/admin/usuarios/${target.id}`, { waitUntil: 'domcontentloaded' });
      const hasActions = (await a.page.getByRole('button', { name: /cambiar rol/i }).count()) > 0;
      const reserved = (await a.page.getByText(/reservadas al administrador maestro/i).count()) > 0;
      const wantMaster = EXPECT_MASTER === '1';
      record(
        'A2-acciones',
        wantMaster ? hasActions && !reserved : !hasActions && reserved,
        `botones de maestro: ${hasActions ? 'visibles' : 'ocultos'}; aviso de reservado: ${reserved ? 'sí' : 'no'}`
      );
    }

    paso('A3 — ADMIN que SÍ terminó el onboarding (como la cuenta real del dueño): la app del alumno ofrece volver al panel');
    await prisma.userProfile.update({ where: { id: fixture.id }, data: { onboardingStep: 3 } });
    const inApp = await landsOn(a.page, '/app');
    const link = await a.page.getByRole('link', { name: /panel admin/i }).count();
    record('A3-enlace-panel', inApp === '/app' && link > 0, `/app → ${inApp}; enlace «Panel admin»: ${link}`);
    await a.page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
    const studentLink = await a.page.getByRole('link', { name: /app del alumno/i }).count();
    record('A3-enlace-app', studentLink > 0, `el panel ofrece «App del alumno»: ${studentLink}`);

    paso('A4 — el panel ya tiene «Cerrar sesión»');
    const out = await clickSignOut(a.page);
    record('A4-salida', out.status === 303 && (await authCookies(a.ctx)).length === 0, `${out.status} y sin cookies`);
    await a.ctx.close();

    paso('A5 — un STUDENT no entra al panel');
    const s = await newDevice(browser);
    await injectSession(s.ctx, await freshSession(STUDENT), BASE);
    const st = await landsOn(s.page, '/admin');
    record('A5-student-fuera', st === '/app', `STUDENT en /admin → ${st}`);
    await s.ctx.close();
  } finally {
    await prisma.userProfile.update({
      where: { id: fixture.id },
      data: { role: fixture.role, onboardingStep: fixture.onboardingStep },
    });
    const back = await prisma.userProfile.findUnique({
      where: { id: fixture.id },
      select: { role: true, onboardingStep: true },
    });
    record(
      'A-restaurada',
      back?.role === fixture.role && back?.onboardingStep === fixture.onboardingStep,
      `la cuenta fixture volvió a ${back?.role}/${back?.onboardingStep}`
    );
  }
}

async function blockT(browser: Browser): Promise<void> {
  if (!CAP_SECS) return;
  paso(`T1 — tope de vida: el servidor corre con EPHEMERAL_SESSION_MAX_AGE_SECS=${CAP_SECS}`);
  const d = await newDevice(browser);
  const session = await freshSession(STUDENT);
  await injectSession(d.ctx, session, BASE);
  const first = await landsOn(d.page, '/app');
  record('T1-dentro', first === '/app', `recién autenticada → ${first}`);
  await sleep((CAP_SECS + 5) * 1000);
  const replay = await d.ctx.cookies();
  const after = await landsOn(d.page, '/app/progreso');
  const u = new URL(`${BASE}${after}`);
  record(
    'T1-cerrada',
    u.pathname === '/login' && u.searchParams.get('sesion') === 'expirada',
    `pasado el tope → ${after}`
  );
  record('T1-sin-cookies', (await authCookies(d.ctx)).length === 0, 'el middleware borró las cookies');
  await d.ctx.close();
  const thief = await newDevice(browser);
  await thief.ctx.addCookies(replay);
  const t = await landsOn(thief.page, '/app');
  record('T1-revocada', t.startsWith('/login'), `reusar la cookie caducada → ${t}`);
  await thief.ctx.close();
}

async function main(): Promise<void> {
  if (!PASSWORD) {
    console.error('Falta G100_PROBE_PASSWORD (contraseña temporal de las cuentas fixture).');
    process.exitCode = 1;
    return;
  }
  console.log(`G100 — sesión sin rastro y admin maestro contra ${BASE}`);
  const browser = await chromium.launch();
  try {
    if (runs('S')) await blockS(browser);
    if (runs('A')) await blockA(browser);
    if (runs('T')) await blockT(browser);
  } catch (err) {
    record('excepcion', false, err instanceof Error ? err.message : String(err));
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} comprobaciones en verde.`);
  if (failed.length > 0) process.exitCode = 1;
}

void main();
