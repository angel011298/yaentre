import { expect, test } from '@playwright/test';
import { FAKE_STRIPE, loginAs, watchConsole } from './support/session';

/** Humo de la pila local: la app, el Auth local y el simulador de Stripe responden. */
test('la pila local responde: portada, login real y simulador de Stripe', async ({ page, request }) => {
  const consola = watchConsole(page);
  expect((await request.get(`${FAKE_STRIPE}/__health`)).ok()).toBe(true);
  await page.goto('/');
  await expect(page.locator('h1').first()).toBeVisible();
  await loginAs(page, 'profe');
  await page.goto('/profesor');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  consola.expectClean();
});
