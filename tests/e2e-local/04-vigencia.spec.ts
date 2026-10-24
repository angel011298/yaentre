import { expect, test } from '@playwright/test';
import { addMonths } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { ensureTeacherAvailability, payOnFakeCheckout } from './support/fixtures';
import { contextAs, db, profileId, watchConsole } from './support/session';

/**
 * Flujo 4 — temporalidad del acceso (Premium de 12 meses). El alumno ve el
 * aviso antes de que expire, entra en gracia (sigue con acceso), extiende 6
 * meses pagando (webhook), y —en el escenario sin pago— pierde lo de Premium
 * pero conserva su progreso. Las fechas se mueven en la base local.
 */
test.describe.configure({ mode: 'serial' });

const DAY = 86_400_000;
const TZ = 'America/Mexico_City';
let teacherId = '';

async function setDates(expiresInDays: number, graceInDays: number) {
  const sub = await db().subscription.findFirstOrThrow({ where: { userProfileId: profileId('vence') } });
  await db().subscription.update({
    where: { id: sub.id },
    data: { expiresAt: new Date(Date.now() + expiresInDays * DAY), graceEndsAt: new Date(Date.now() + graceInDays * DAY), expiryNoticesSent: [] },
  });
  return sub.id;
}

test.beforeAll(async () => {
  teacherId = await ensureTeacherAvailability();
});

test('faltan 5 días: el tablero avisa y ofrece extender por $899', async ({ browser }) => {
  await setDates(5, 12);
  const { context, page } = await contextAs(browser, 'vence', { viewport: { width: 390, height: 844 } });
  const consola = watchConsole(page);
  await page.goto('/app');
  await expect(page.getByText(/^Tu acceso a YaEntre expira el /)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Extender acceso — $899' })).toBeVisible();
  consola.expectClean();
  await context.close();
});

test('en gracia: alerta con la fecha límite y el acceso de Premium sigue', async ({ browser }) => {
  await setDates(-1, 6);
  const { context, page } = await contextAs(browser, 'vence', { viewport: { width: 1440, height: 900 } });
  const consola = watchConsole(page);
  await page.goto('/app');
  await expect(page.getByRole('alert').filter({ hasText: /Tu acceso expiró el/ })).toContainText(/Tienes hasta el .* para extender/);
  // La gracia DA acceso: la pista de admisión (solo Premium) sigue abierta.
  await page.goto(`/clases/profesor/${teacherId}?pista=admision`);
  await expect(page.getByRole('heading', { level: 1, name: /Agendar clase con/ })).toBeVisible();
  consola.expectClean();
  await context.close();
});

test('extiende 6 meses: el webhook mueve la vigencia desde la fecha vencida', async ({ browser }) => {
  const subId = await setDates(-1, 6);
  const before = (await db().subscription.findUniqueOrThrow({ where: { id: subId } })).expiresAt!;
  const { context, page } = await contextAs(browser, 'vence', { viewport: { width: 1440, height: 900 } });
  const consola = watchConsole(page);
  await page.goto('/app/extender');
  await page.getByRole('button', { name: 'Extender 6 meses — $899' }).click();
  // Sin la casilla de aceptación no se abre el pago.
  await expect(page).toHaveURL(/\/app\/extender$/);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Extender 6 meses — $899' }).click();
  await payOnFakeCheckout(page);
  await expect(page).toHaveURL(/\/app\/extender\/resultado/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('¡Listo! Extendimos tu acceso');

  const after = await db().subscription.findUniqueOrThrow({ where: { id: subId } });
  const expected = fromZonedTime(addMonths(toZonedTime(before, TZ), 6), TZ);
  expect(after.expiresAt?.toISOString()).toBe(expected.toISOString());
  expect(after.graceEndsAt?.getTime()).toBe(expected.getTime() + 7 * DAY);
  expect(after.extendedAt).not.toBeNull();
  expect(after.originalExpiresAt?.toISOString()).toBe(before.toISOString());
  const payment = await db().payment.findFirst({ where: { subscriptionId: subId, status: 'SUCCEEDED' } });
  expect(payment?.amountMxn).toBe(89_900);

  await page.goto('/app');
  await expect(page.getByText(/Tu acceso expiró el/)).toHaveCount(0);
  consola.expectClean();
  await context.close();
});

test('sin pagar, pasada la gracia: pierde Premium y conserva su progreso', async ({ browser }) => {
  await setDates(-10, -3);
  const { context, page } = await contextAs(browser, 'vence', { viewport: { width: 1440, height: 900 } });
  const consola = watchConsole(page);
  await page.goto('/app');
  await expect(page.getByText('Tu acceso de pago terminó. Tu progreso, tu historial y tu Entrómetro siguen guardados.')).toBeVisible();
  await page.goto(`/clases/profesor/${teacherId}?pista=admision`);
  await expect(page.getByRole('heading', { name: 'Disponible con Premium' })).toBeVisible();
  // El progreso sigue ahí y se puede consultar.
  const streak = await db().streakRecord.findUniqueOrThrow({ where: { userProfileId: profileId('vence') } });
  expect(streak).toMatchObject({ longestStreak: 9, totalActiveDays: 12 });
  await page.goto('/app/progreso');
  await expect(page).toHaveURL(/\/app\/progreso/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  consola.expectClean();
  await context.close();
});
