import { devices, expect, test } from '@playwright/test';
import { contextAs, db, profileId, watchConsole } from './support/session';

/**
 * Flujo 1 — el profesor define su disponibilidad (escritorio arrastrando, y
 * celular tocando celdas) y bloquea una fecha. Se verifica POR EFECTO en la
 * base local y en los horarios que ve un alumno.
 *
 * Cuadrícula: 07:00–22:00 en celdas de 30 min (celda 4 = 09:00). Días:
 * 1 = lunes … 6 = sábado, 0 = domingo.
 */
test.describe.configure({ mode: 'serial' });

test('escritorio: arrastrar lunes a viernes de 9:00 a 13:00 y guardar', async ({ browser }) => {
  const { context, page } = await contextAs(browser, 'profe', { viewport: { width: 1440, height: 900 } });
  const consola = watchConsole(page);
  await page.goto('/profesor/disponibilidad');
  await expect(page.getByRole('grid', { name: 'Disponibilidad semanal' })).toBeVisible();

  const from = page.getByTestId('d-cell-1-4'); // lunes 09:00
  const to = page.getByTestId('d-cell-5-11'); // viernes 12:30–13:00
  await from.hover();
  await page.mouse.down();
  await page.getByTestId('d-cell-3-8').hover();
  await to.hover();
  await page.mouse.up();
  await expect(page.getByTestId('d-cell-3-8')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Tienes cambios sin guardar.')).toBeVisible();

  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Disponibilidad guardada: 5 bloques.')).toBeVisible();

  const teacher = await db().teacher.findUniqueOrThrow({ where: { userProfileId: profileId('profe') }, include: { availability: true } });
  expect(teacher.availability.map((b) => `${b.dayOfWeek} ${b.startTime}-${b.endTime}`).sort()).toEqual(
    ['1 09:00-13:00', '2 09:00-13:00', '3 09:00-13:00', '4 09:00-13:00', '5 09:00-13:00']
  );

  // Recargar muestra lo guardado (no solo el estado local del componente).
  await page.reload();
  await expect(page.getByTestId('d-cell-5-11')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('d-cell-6-4')).toHaveAttribute('aria-selected', 'false');
  consola.expectClean();
  await context.close();
});

test('celular: marcar el sábado de 9:00 a 10:00 tocando celdas', async ({ browser }) => {
  const { context, page } = await contextAs(browser, 'profe', { ...devices['Pixel 7'] });
  const consola = watchConsole(page);
  await page.goto('/profesor/disponibilidad');
  // En el celular la semana se ve un día a la vez.
  await expect(page.getByRole('grid', { name: 'Disponibilidad semanal' })).toBeHidden();
  await page.getByRole('tab', { name: /^Sáb/ }).tap();
  await page.getByTestId('m-cell-6-4').tap();
  await page.getByTestId('m-cell-6-5').tap();
  await expect(page.getByTestId('m-cell-6-5')).toHaveAttribute('aria-selected', 'true');

  // Sin desbordamiento horizontal en 412 px.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  await page.getByRole('button', { name: 'Guardar cambios' }).tap();
  await expect(page.getByText('Disponibilidad guardada: 6 bloques.')).toBeVisible();
  const sat = await db().teacherAvailability.findMany({ where: { teacher: { userProfileId: profileId('profe') }, dayOfWeek: 6 } });
  expect(sat.map((b) => `${b.startTime}-${b.endTime}`)).toEqual(['09:00-10:00']);
  consola.expectClean();
  await context.close();
});

test('bloquear una fecha la quita de los horarios que ve el alumno', async ({ browser }) => {
  const { context, page } = await contextAs(browser, 'profe', { viewport: { width: 1440, height: 900 } });
  const consola = watchConsole(page);
  await page.goto('/profesor/disponibilidad');

  // El próximo martes a más de 2 días (siempre dentro de los 30 días de reserva).
  const date = await page.evaluate(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
  });
  await page.getByLabel('Fecha', { exact: true }).fill(date);
  await page.getByLabel('Motivo (solo lo ves tú)').fill('Congreso');
  await page.getByRole('button', { name: 'Bloquear fecha' }).click();
  await expect(page.getByText(/^Bloqueaste el /)).toBeVisible();

  const teacher = await db().teacher.findUniqueOrThrow({ where: { userProfileId: profileId('profe') }, include: { dateBlocks: true } });
  expect(teacher.dateBlocks.map((b) => b.blockedDate.toISOString().slice(0, 10))).toEqual([date]);

  // Por efecto: la API de horarios no ofrece nada ese día (sí el martes siguiente).
  const student = await contextAs(browser, 'premium');
  const slots = async (d: string) => {
    const r = await student.page.request.get(`/api/classes/teachers/${teacher.id}/slots?from=${d}&days=1&duration=50&track=ADMISION&subject=matematicas`);
    expect(r.status(), await r.text()).toBe(200);
    return ((await r.json()) as { slots: Array<{ date: string }> }).slots.filter((s) => s.date === d);
  };
  expect(await slots(date)).toEqual([]);
  const nextWeek = new Date(`${date}T12:00:00Z`);
  nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);
  expect((await slots(nextWeek.toISOString().slice(0, 10))).length).toBeGreaterThan(0);
  consola.expectClean();
  await student.context.close();
  await context.close();
});
