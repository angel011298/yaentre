import { randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { answerCurrentQuestion, dismissResumeOverlay, watchForAnswerLeaks } from '../e2e/helpers';
import { payOnFakeCheckout } from './support/fixtures';
import { LOCAL } from './support/stack-env';
import { contextAs, db, profileId, watchConsole } from './support/session';

/**
 * Flujo 5 — regresión de lo que ya existía, con todas las banderas de G103
 * ENCENDIDAS: registro → onboarding → diagnóstico → tablero; simulacro sin
 * fuga de la respuesta; compra del Pase de Temporada (12 meses) activada por
 * webhook; y el panel parental vinculado con un código.
 */
test.describe.configure({ mode: 'serial' });

test('registro → onboarding → diagnóstico → tablero', async ({ page }) => {
  test.setTimeout(240_000);
  const consola = watchConsole(page);
  const email = `nuevo-${Date.now()}@${LOCAL.emailDomain}`;
  await page.goto('/registro');
  await page.getByLabel(/correo/i).fill(email);
  await page.getByLabel(/contraseña/i).fill(randomBytes(12).toString('base64url'));
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /crear cuenta/i }).click();
  await page.waitForURL(/\/onboarding/, { timeout: 60_000 });

  await expect(page.getByRole('heading', { name: /qué examen vas a presentar/i })).toBeVisible();
  await page.getByRole('button', { name: /UNAM|Universidad Nacional/i }).first().click();
  await expect(page.getByRole('heading', { name: /área o rama/i })).toBeVisible();
  await page.getByRole('button', { name: /Físico-Matemáticas|Ingenierías/i }).first().click();
  await expect(page.getByRole('heading', { name: /a qué carrera quieres entrar/i })).toBeVisible();
  await page.getByRole('button', { name: /Ingeniería|Arquitectura|Física|Actuaría/i }).first().click();
  await page.getByRole('button', { name: /empezar diagnóstico/i }).first().click();

  await page.waitForURL(/\/diagnostico/, { timeout: 60_000 });
  await expect(page.getByText(/pregunta 1/i)).toBeVisible({ timeout: 30_000 });
  for (let i = 0; i < 3; i++) {
    await answerCurrentQuestion(page);
    const next = page.getByRole('button', { name: /siguiente/i });
    if (await next.isVisible().catch(() => false)) await next.click();
  }
  await page.getByRole('button', { name: /terminar/i }).first().click();
  const confirm = page.getByRole('button', { name: /sí, terminar/i });
  if (await confirm.isVisible().catch(() => false)) await confirm.click();
  await expect(page.getByText(/aciert/i).first()).toBeVisible({ timeout: 60_000 });

  await page.goto('/app');
  await expect(page.getByRole('heading', { name: /hola/i })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/completa tu diagnóstico/i)).toHaveCount(0);
  consola.expectClean();
});

test('simulacro: sin regreso y sin filtrar la respuesta antes de terminar', async ({ browser }) => {
  test.setTimeout(240_000);
  const { context, page } = await contextAs(browser, 'libre', { viewport: { width: 1440, height: 900 } });
  const watcher = watchForAnswerLeaks(page);
  await page.goto('/simulador');
  await page.getByRole('button', { name: /iniciar examen/i }).click();
  await expect(page.getByLabel('Tiempo restante')).toBeVisible({ timeout: 30_000 });
  await dismissResumeOverlay(page);
  const progress = await page.getByText(/pregunta 1 de \d+/i).textContent();
  const total = Number(progress!.match(/de (\d+)/)![1]);
  expect(total).toBeGreaterThan(0);
  for (let i = 1; i <= 3; i++) {
    await answerCurrentQuestion(page);
    await page.getByRole('button', { name: /siguiente/i }).click();
  }
  await expect(page.getByRole('button', { name: /anterior/i })).toHaveCount(0);
  const next = page.getByRole('button', { name: /siguiente/i });
  for (let i = 4; i < total; i++) await next.click();
  await page.getByRole('button', { name: /terminar examen/i }).click();
  watcher.disarm();
  await page.getByRole('button', { name: /sí, terminar/i }).click();
  await page.waitForURL(/view=result/, { timeout: 60_000 });
  await expect(page.getByText(/aciertos/i).first()).toBeVisible({ timeout: 30_000 });
  watcher.assertNoLeaks();
  await context.close();
});

test('compra del Pase de Temporada: el webhook lo activa con 12 meses', async ({ browser }) => {
  const { context, page } = await contextAs(browser, 'libre', { viewport: { width: 390, height: 844 } });
  const consola = watchConsole(page);
  await page.goto('/paywall');
  const card = page.locator('div, article, section').filter({ hasText: '12 meses de acceso' }).filter({ has: page.getByRole('button', { name: 'Elegir este plan' }) }).last();
  await card.getByRole('button', { name: 'Elegir este plan' }).click();
  await payOnFakeCheckout(page);
  await expect(page.getByRole('heading', { name: '¡Gracias! Ya eres parte de YaEntre' })).toBeVisible();
  const sub = await db().subscription.findFirstOrThrow({ where: { userProfileId: profileId('libre'), plan: 'SEASON_PASS' } });
  expect(sub.status).toBe('ACTIVE');
  const months = (sub.expiresAt!.getTime() - sub.startedAt!.getTime()) / (30.44 * 86_400_000);
  expect(Math.round(months)).toBe(12);
  expect(sub.graceEndsAt!.getTime() - sub.expiresAt!.getTime()).toBe(7 * 86_400_000);
  consola.expectClean();
  await context.close();
});

test('panel parental: el tutor se registra, vincula con el código del alumno y ve su progreso', async ({ browser }) => {
  // El alumno genera el código desde su perfil.
  const student = await contextAs(browser, 'libre', { viewport: { width: 1440, height: 900 } });
  await student.page.goto('/app/perfil');
  await student.page.getByRole('button', { name: 'Generar código' }).click();
  const code = (await student.page.locator('p.font-mono').first().textContent())?.trim() ?? '';
  expect(code).toMatch(/^\d{6}$/);

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-MX', timezoneId: 'America/Mexico_City' });
  const page = await context.newPage();
  const consola = watchConsole(page);
  await page.goto('/registro?role=tutor');
  await page.getByLabel(/correo/i).fill(`tutor-${Date.now()}@${LOCAL.emailDomain}`);
  await page.getByLabel(/contraseña/i).fill(randomBytes(12).toString('base64url'));
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /crear cuenta/i }).click();
  await page.waitForURL(/\/tutor/, { timeout: 60_000 });
  await page.getByLabel('Código de 6 dígitos').fill(code);
  await page.getByRole('button', { name: 'Vincular' }).click();
  await expect.poll(async () => db().parentLink.count({ where: { studentProfileId: profileId('libre') } })).toBe(1);
  await page.reload();
  // El panel del tutor nunca trae reactivos ni respuestas.
  await expect(page.locator('body')).not.toContainText(/isCorrect|correctOption/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  consola.expectClean();
  await student.context.close();
  await context.close();
});
