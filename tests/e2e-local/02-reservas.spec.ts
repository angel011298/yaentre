import { expect, test, type Page } from '@playwright/test';
import { ensureTeacherAvailability, payOnFakeCheckout, pickFirstDay } from './support/fixtures';
import { contextAs, db, profileId, watchConsole } from './support/session';

/**
 * Flujo 2 — reservas. Premium agenda una clase de ADMISIÓN (la primera por
 * Checkout, que guarda la tarjeta; la segunda en UN clic con esa tarjeta).
 * Un alumno SIN Premium es rechazado en admisión —en la pantalla y en la API—
 * pero SÍ puede agendar regularización, y nunca se le ofrece un horario ya
 * ocupado. El acceso a la clase lo confirma el webhook, no la redirección.
 */
test.describe.configure({ mode: 'serial' });

let teacherId: string;
test.beforeAll(async () => {
  teacherId = await ensureTeacherAvailability();
});

async function chooseSlot(page: Page, index: number) {
  await pickFirstDay(page);
  const slots = page.getByRole('region').getByRole('button');
  await expect(slots.first()).toBeVisible();
  await slots.nth(index).click();
  await page.getByRole('checkbox').check();
}

test('Premium: primera reserva por Checkout; queda confirmada por el webhook', async ({ browser }) => {
  const { context, page } = await contextAs(browser, 'premium', { viewport: { width: 1440, height: 900 } });
  const consola = watchConsole(page);
  await page.goto(`/clases/profesor/${teacherId}?pista=admision`);
  await expect(page.getByRole('heading', { level: 1, name: /Agendar clase con/ })).toBeVisible();
  // Nunca se muestra la fórmula ni los multiplicadores: solo el precio final.
  await expect(page.locator('body')).not.toContainText(/multiplicador|× ?1\.\d|tabulador/i);
  await chooseSlot(page, 0);
  await expect(page.getByText(/Pagas con tarjeta en la página segura de Stripe/)).toBeVisible();
  await page.getByRole('button', { name: /^Agendar clase — / }).click();
  await payOnFakeCheckout(page);
  await expect(page).toHaveURL(/\/clases\/reserva\//);
  await expect(page.getByText('¡Clase reservada!')).toBeVisible();

  const classes = await db().classSession.findMany({ where: { studentProfileId: profileId('premium') } });
  expect(classes).toHaveLength(1);
  expect(classes[0]).toMatchObject({ status: 'BOOKED', track: 'ADMISION' });
  expect(classes[0].paidAt).not.toBeNull();
  expect(classes[0].teacherPayCents + classes[0].commissionCents).toBe(classes[0].finalTariffCents);
  consola.expectClean();
  await context.close();
});

test('Premium: segunda reserva en un clic con la tarjeta guardada', async ({ browser }) => {
  const { context, page } = await contextAs(browser, 'premium', { viewport: { width: 390, height: 844 } });
  const consola = watchConsole(page);
  await page.goto(`/clases/profesor/${teacherId}?pista=admision`);
  await chooseSlot(page, 1);
  await expect(page.getByText('Se cobra a tu tarjeta VISA ****4242.')).toBeVisible();
  await page.getByRole('button', { name: /^Agendar clase — / }).click();
  // Sin salir de la app: el cargo se confirma aquí y el webhook lo activa.
  await page.waitForURL(/\/clases\/reserva\//);
  await expect(page.getByText('¡Clase reservada!')).toBeVisible({ timeout: 30_000 });

  const classes = await db().classSession.findMany({ where: { studentProfileId: profileId('premium') }, orderBy: { createdAt: 'asc' } });
  expect(classes.map((c) => c.status)).toEqual(['BOOKED', 'BOOKED']);
  expect(classes[1].stripeCheckoutSessionId).toBeNull();
  expect(classes[1].stripePaymentId).toMatch(/^pi_/);
  consola.expectClean();
  await context.close();
});

test('sin Premium: admisión rechazada en la pantalla Y en la API; regularización sí', async ({ browser }) => {
  const { context, page } = await contextAs(browser, 'libre', { viewport: { width: 1440, height: 900 } });
  const consola = watchConsole(page);

  await page.goto(`/clases/profesor/${teacherId}?pista=admision`);
  await expect(page.getByRole('heading', { name: 'Disponible con Premium' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Días del mes' })).toHaveCount(0);

  const api = await page.request.get(`/api/classes/teachers/${teacherId}/slots?duration=50&track=ADMISION&subject=matematicas`);
  expect(api.status()).toBe(403);
  expect(await api.json()).toMatchObject({ code: 'PREMIUM_REQUIRED' });

  // Los horarios ya ocupados por las reservas de Premium no se ofrecen.
  const taken = (await db().classSession.findMany({ where: { teacherId, status: 'BOOKED' } })).map((c) => c.scheduledAt.toISOString());
  expect(taken.length).toBe(2);
  const reg = await page.request.get(`/api/classes/teachers/${teacherId}/slots?duration=50&track=REGULARIZACION&subject=reg_matematicas`);
  expect(reg.status()).toBe(200);
  const offered = ((await reg.json()) as { slots: Array<{ startsAt: string }> }).slots.map((s) => new Date(s.startsAt).toISOString());
  expect(offered.length).toBeGreaterThan(0);
  for (const t of taken) expect(offered).not.toContain(t);

  await page.goto(`/clases/profesor/${teacherId}?pista=regularizacion`);
  await expect(page.getByRole('heading', { level: 1, name: /Agendar clase con/ })).toBeVisible();
  await chooseSlot(page, 0);
  await page.getByRole('button', { name: /^Agendar clase — / }).click();
  await payOnFakeCheckout(page);
  await expect(page.getByText('¡Clase reservada!')).toBeVisible();
  const mine = await db().classSession.findMany({ where: { studentProfileId: profileId('libre') } });
  expect(mine).toEqual([expect.objectContaining({ status: 'BOOKED', track: 'REGULARIZACION' })]);
  consola.expectClean();
  await context.close();
});
