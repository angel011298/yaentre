import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PERSONAS, passwordOf, type PersonaName } from './personas';
import { LOCAL, readStackFile } from './stack-env';

/**
 * G103 — sesiones de la pila local. Un inicio de sesión REAL por la pantalla
 * de /login (contra el Auth local) por persona y corrida; las cookies se
 * reutilizan después para no gastar el limitador de G65 (8 cada 10 min).
 */
const cookieJar = new Map<PersonaName, Awaited<ReturnType<BrowserContext['cookies']>>>();

export async function loginAs(page: Page, name: PersonaName): Promise<void> {
  const saved = cookieJar.get(name);
  if (saved) {
    await page.context().addCookies(saved);
    return;
  }
  // Si un test falla, Playwright reinicia el worker y estas cookies se pierden;
  // los inicios de sesión de una corrida larga agotarían el límite REAL de G65
  // (8 cada 10 min por IP). Se vacía el contador de la base LOCAL: aquí se
  // prueban los flujos, el limitador tiene sus propias sondas.
  await db().$executeRawUnsafe('TRUNCATE app_security.rate_limit_hits');
  await page.goto('/login');
  await page.getByLabel(/correo/i).fill(PERSONAS[name].email);
  await page.getByLabel(/contraseña/i).fill(passwordOf(name));
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 });
  cookieJar.set(name, await page.context().cookies());
}

export async function contextAs(browser: Browser, name: PersonaName, opts: Parameters<Browser['newContext']>[0] = {}) {
  const context = await browser.newContext({ locale: 'es-MX', timezoneId: 'America/Mexico_City', ...opts });
  const page = await context.newPage();
  await loginAs(page, name);
  return { context, page };
}

/** Errores de consola / de página: la consola debe quedar limpia en cada flujo. */
export function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    // Recursos que el entorno local no sirve a propósito (sin PostHog/Sentry).
    if (/favicon|ERR_BLOCKED_BY_CLIENT/.test(text)) return;
    problems.push(`console: ${text}`);
  });
  return {
    problems,
    expectClean: () => expect(problems, problems.join('\n')).toEqual([]),
  };
}

let prisma: PrismaClient | null = null;
/** Cliente de la base LOCAL (URL explícita) para preparar o verificar estado. */
export function db(): PrismaClient {
  prisma ??= new PrismaClient({ datasources: { db: { url: readStackFile().DB_URL } } });
  return prisma;
}

export function profileId(name: PersonaName): string {
  const ids = JSON.parse(process.env.E2E_PROFILE_IDS ?? '{}') as Record<string, string>;
  if (!ids[name]) throw new Error(`Sin perfil para ${name}`);
  return ids[name];
}

export const FAKE_STRIPE = `http://127.0.0.1:${LOCAL.fakeStripePort}`;
