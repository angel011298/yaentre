import { expect, test, type Page } from '@playwright/test';
import { addDaysToKey } from '../../src/lib/teachers/slot-calculator';
import { lastClosedWeekStart, payoutWeek } from '../../src/lib/teachers/payout-calculator';
import { payoutReference } from '../../src/lib/teachers/payout-sheet';
import { contextAs, db, FAKE_STRIPE, profileId } from './support/session';

/**
 * Liquidaciones contra Postgres REAL (la prueba unitaria del libro de ajustes
 * usa una base en memoria, sin los CHECK ni el índice único parcial). Usa lo
 * que dejaron los flujos 2 y 3: la clase de regularización de «libre» y la
 * inscripción de «premium» al curso. Semana: dos antes de la última cerrada
 * (la última la usa el generador de capturas).
 *
 * 1. Se liquida la semana; un reembolso de la clase YA liquidada, que llega
 *    por el webhook (simulador de Stripe), asienta un ajuste negativo.
 * 2. Cancelar la liquidación devuelve las partidas a la bolsa y anula el
 *    ajuste que no se había aplicado; la misma semana se puede recalcular.
 * 3. Un ajuste POSITIVO (devolución por cancelación) se aplica en una
 *    liquidación real: la restricción de la base lo permite.
 */
test.describe.configure({ mode: 'serial' });

const weekKey = addDaysToKey(lastClosedWeekStart(new Date()), -14);
const week = payoutWeek(weekKey)!;
const inWeek = new Date(week.periodStart.getTime() + 86_400_000 + 3_600_000);

async function computeWeek(page: Page): Promise<string> {
  await page.goto('/admin/liquidaciones');
  await page.getByLabel('Lunes de la semana (AAAA-MM-DD)').fill(weekKey);
  await page.getByRole('button', { name: 'Calcular la semana' }).click();
  const msg = page.getByText(/^Creadas: \d+\./);
  await expect(msg).toBeVisible();
  return (await msg.textContent()) ?? '';
}

async function decide(page: Page, payoutId: string, label: string, reason: string) {
  const card = page.locator('li', { hasText: payoutReference(payoutId) });
  await card.getByRole('button', { name: label, exact: true }).first().click();
  await card.getByLabel('Motivo (queda en la bitácora)').fill(reason);
  await card.getByRole('button', { name: 'Confirmar' }).click();
  // El panel se refresca y la tarjeta cambia de sección: se espera el EFECTO
  // en la base (en cada prueba), no un mensaje que puede desmontarse.
  await expect(page.getByRole('button', { name: 'Confirmar' })).toHaveCount(0);
}

test('reembolso posterior a la liquidación → ajuste; cancelar → todo vuelve a la bolsa; recalcular la semana', async ({ browser }) => {
  const teacher = await db().teacher.findUniqueOrThrow({ where: { userProfileId: profileId('profe') } });
  const cls = await db().classSession.findFirstOrThrow({ where: { studentProfileId: profileId('libre'), status: 'BOOKED' } });
  const enr = await db().courseEnrollment.findFirstOrThrow({ where: { userProfileId: profileId('premium'), status: { in: ['ACTIVE', 'COMPLETED'] } } });
  await db().classSession.update({ where: { id: cls.id }, data: { status: 'COMPLETED', completedAt: inWeek } });
  await db().courseEnrollment.update({ where: { id: enr.id }, data: { paidAt: inWeek } });

  const { context, page } = await contextAs(browser, 'admin', { viewport: { width: 1440, height: 900 } });
  expect(await computeWeek(page)).toMatch(/^Creadas: 1\./);
  const payout = await db().teacherPayout.findFirstOrThrow({ where: { teacherId: teacher.id, periodStart: week.periodStart, status: 'PENDING' } });
  expect(payout.grossCents).toBe(cls.teacherPayCents + enr.teacherPayCents);
  await decide(page, payout.id, 'Aprobar', 'Revisada contra las clases impartidas');
  await expect.poll(async () => (await db().teacherPayout.findUniqueOrThrow({ where: { id: payout.id } })).status).toBe('APPROVED');

  // El reembolso llega por Stripe (como si se hiciera desde su panel).
  const r = await page.request.post(`${FAKE_STRIPE}/v1/refunds`, { form: { payment_intent: cls.stripePaymentId! } });
  expect(r.ok()).toBe(true);
  await expect
    .poll(async () => (await db().teacherPayoutAdjustment.findMany({ where: { sourceId: cls.id } })).map((a) => [a.kind, a.amountCents, a.sourcePayoutId]))
    .toEqual([['REFUND', -cls.teacherPayCents, payout.id]]);

  // Cancelar (aún no se transfería): partidas a la bolsa, ajuste anulado.
  await page.goto('/admin/liquidaciones');
  await decide(page, payout.id, 'Cancelar', 'El alumno reclamó; se recalcula la semana');
  await expect.poll(async () => (await db().teacherPayout.findUniqueOrThrow({ where: { id: payout.id } })).status).toBe('CANCELLED');
  expect((await db().classSession.findUniqueOrThrow({ where: { id: cls.id } })).payoutId).toBeNull();
  expect((await db().courseEnrollment.findUniqueOrThrow({ where: { id: enr.id } })).payoutId).toBeNull();
  expect((await db().teacherPayoutAdjustment.findFirstOrThrow({ where: { sourceId: cls.id } })).voidedAt).not.toBeNull();

  // Recalcular la MISMA semana (índice único parcial): la clase reembolsada ya
  // no aporta y lo demás no llega al mínimo → se acumula.
  expect(await computeWeek(page)).toMatch(/^Creadas: 0\. Bajo el mínimo \(se acumulan\): 1\./);
  await context.close();
});

test('un ajuste POSITIVO se aplica en una liquidación real', async ({ browser }) => {
  const teacher = await db().teacher.findUniqueOrThrow({ where: { userProfileId: profileId('profe') } });
  const cancelled = await db().teacherPayout.findFirstOrThrow({ where: { teacherId: teacher.id, status: 'CANCELLED' } });
  await db().teacherPayoutAdjustment.create({
    data: {
      teacherId: teacher.id,
      kind: 'CANCEL_REVERSAL',
      sourceKind: 'CLASS',
      sourceId: 'e2e-reversa',
      sourcePayoutId: cancelled.id,
      amountCents: 15_000,
      note: 'e2e: devolución por cancelación',
      createdAt: inWeek,
    },
  });
  const { context, page } = await contextAs(browser, 'admin', { viewport: { width: 1440, height: 900 } });
  expect(await computeWeek(page)).toMatch(/^Creadas: 1\./);
  const p = await db().teacherPayout.findFirstOrThrow({ where: { teacherId: teacher.id, periodStart: week.periodStart, status: 'PENDING' } });
  expect(p.adjustmentCents).toBe(15_000);
  expect(p.netCents).toBe(p.grossCents - p.retentionCents + 15_000);
  await context.close();
});
