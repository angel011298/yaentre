import { mkdirSync } from 'node:fs';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { lastClosedWeekStart, payoutWeek } from '../../src/lib/teachers/payout-calculator';
import { type PersonaName } from './support/personas';
import { contextAs, db, profileId } from './support/session';

/**
 * Capturas de las pantallas nuevas para `docs/screenshots/horarios-cursos/`
 * (390 y 1440 px; las del alumno en tema oscuro y claro). Corre DESPUÉS de los
 * flujos (usa sus datos) y solo con `E2E_CAPTURAS=1`: genera documentación,
 * no verifica. De paso calcula una semana de liquidaciones desde el panel.
 */
test.skip(process.env.E2E_CAPTURAS !== '1', 'Generador de capturas: E2E_CAPTURAS=1');
test.describe.configure({ mode: 'serial' });
test.setTimeout(600_000);

const OUT = 'docs/screenshots/horarios-cursos';
const WIDTHS = [
  { name: '390', viewport: { width: 390, height: 844 } },
  { name: '1440', viewport: { width: 1440, height: 900 } },
];

async function shoot(browser: Browser, persona: PersonaName | null, shots: Array<[string, string]>, suffix = '') {
  mkdirSync(OUT, { recursive: true });
  for (const w of WIDTHS) {
    const { context, page } = persona
      ? await contextAs(browser, persona, { viewport: w.viewport })
      : await (async () => {
          const context = await browser.newContext({ viewport: w.viewport, locale: 'es-MX', timezoneId: 'America/Mexico_City' });
          return { context, page: await context.newPage() };
        })();
    // El aviso de cookies queda fuera de las capturas (ya elegido).
    await context.addInitScript(() => {
      try {
        localStorage.setItem('yaentre-cookies-consent', 'false');
      } catch {
        /* sin almacenamiento */
      }
      document.documentElement.setAttribute('data-cookie-consent', 'set');
    });
    for (const [file, path] of shots) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await noHorizontalScroll(page, `${file} @${w.name}`);
      await page.screenshot({ path: `${OUT}/${file}${suffix}-${w.name}.jpg`, fullPage: true, type: 'jpeg', quality: 70 });
    }
    await context.close();
  }
}

async function noHorizontalScroll(page: Page, label: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `desbordamiento horizontal en ${label}`).toBeLessThanOrEqual(0);
}

test('liquidación de una semana cerrada desde el panel (datos de la corrida)', async ({ browser }) => {
  const week = payoutWeek(lastClosedWeekStart(new Date()))!;
  const classes = await db().classSession.findMany({ where: { studentProfileId: profileId('premium'), status: 'BOOKED' } });
  for (const c of classes) {
    await db().classSession.update({ where: { id: c.id }, data: { status: 'COMPLETED', completedAt: new Date(week.periodStart.getTime() + 2 * 86_400_000) } });
  }
  const { context, page } = await contextAs(browser, 'admin', { viewport: { width: 1440, height: 900 } });
  await page.goto('/admin/liquidaciones');
  await page.getByRole('button', { name: 'Calcular la semana' }).click();
  await expect(page.getByText(/^Creadas: 1\./)).toBeVisible();
  await context.close();
});

test('alumno (oscuro y claro)', async ({ browser }) => {
  const teacher = await db().teacher.findUniqueOrThrow({ where: { userProfileId: profileId('profe') } });
  const course = await db().course.findFirstOrThrow({ where: { status: 'PUBLISHED' } });
  const sub = await db().subscription.findFirstOrThrow({ where: { userProfileId: profileId('vence') } });
  await db().subscription.update({ where: { id: sub.id }, data: { expiresAt: new Date(Date.now() - 86_400_000), graceEndsAt: new Date(Date.now() + 6 * 86_400_000) } });
  for (const theme of ['dark', 'light']) {
    await db().userProfile.updateMany({ where: { id: { in: [profileId('premium'), profileId('vence')] } }, data: { themePref: theme } });
    await shoot(
      browser,
      'premium',
      [
        ['alumno-directorio-clases', '/clases'],
        ['alumno-reservar', `/clases/profesor/${teacher.id}?pista=admision`],
        ['alumno-mis-clases', '/clases/mis-clases'],
        ['alumno-mis-cursos', '/mis-cursos'],
        ['alumno-reproductor', `/aprender/${course.slug}`],
      ],
      `-${theme}`
    );
    await shoot(browser, 'vence', [['alumno-gracia', '/app'], ['alumno-extender', '/app/extender']], `-${theme}`);
  }
});

test('público, profesor y admin', async ({ browser }) => {
  const course = await db().course.findFirstOrThrow({ where: { status: 'PUBLISHED' } });
  await shoot(browser, null, [
    ['publico-catalogo', '/cursos'],
    ['publico-curso', `/cursos/${course.slug}`],
    ['publico-regularizacion', '/regularizacion'],
  ]);
  await shoot(browser, 'profe', [
    ['profesor-inicio', '/profesor'],
    ['profesor-disponibilidad', '/profesor/disponibilidad'],
    ['profesor-clases', '/profesor/clases'],
    ['profesor-curso', `/profesor/cursos/${course.id}`],
    ['profesor-liquidaciones', '/profesor/liquidaciones'],
  ]);
  await shoot(browser, 'admin', [
    ['admin-profesores', '/admin/profesores'],
    ['admin-cursos', '/admin/cursos'],
    ['admin-liquidaciones', '/admin/liquidaciones'],
    ['admin-resico', '/admin/resico'],
    ['admin-vigencias', '/admin/vigencias'],
  ]);
});
