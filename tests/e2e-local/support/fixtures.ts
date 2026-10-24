import { expect, type Page } from '@playwright/test';
import { db, profileId } from './session';

/** Disponibilidad mínima del profesor de prueba (lunes a viernes, 9 a 13 h), si no la hay. */
export async function ensureTeacherAvailability(): Promise<string> {
  const teacher = await db().teacher.findUniqueOrThrow({ where: { userProfileId: profileId('profe') }, include: { availability: true } });
  if (teacher.availability.length === 0) {
    await db().teacherAvailability.createMany({
      data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ teacherId: teacher.id, dayOfWeek, startTime: '09:00', endTime: '13:00' })),
    });
  }
  return teacher.id;
}

/** Elige el primer día con horarios del calendario (avanza de mes si hace falta). */
export async function pickFirstDay(page: Page): Promise<void> {
  const days = page.getByRole('group', { name: 'Días del mes' }).getByRole('button', { name: /: \d+ horarios$/ });
  await expect(page.getByRole('group', { name: 'Días del mes' })).toBeVisible();
  if ((await days.count()) === 0) await page.getByRole('button', { name: 'Mes siguiente' }).click();
  await days.first().click();
}

/** Paga en la página del simulador de Stripe y espera a volver a la app. */
export async function payOnFakeCheckout(page: Page): Promise<void> {
  await page.waitForURL(/127\.0\.0\.1:12111\/__checkout\//);
  await page.getByRole('button', { name: 'Pagar' }).click();
  await page.waitForURL((u) => u.host === 'localhost:3000');
}
