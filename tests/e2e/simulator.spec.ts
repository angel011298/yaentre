import { expect, test } from '@playwright/test';
import {
  answerCurrentQuestion,
  dismissResumeOverlay,
  ensureNoActiveSimulation,
  hasCredentials,
  login,
  readTimerSeconds,
  watchForAnswerLeaks,
} from './helpers';

/**
 * E2E del simulador (F19 tarea 1) — la zona donde un error cuesta la confianza
 * del alumno el día que más importa. Cubre los 5 escenarios exigidos:
 *
 *   1. Flujo feliz completo: pre-flight → responder → terminar → resultados.
 *   2. Un usuario gratuito que ya gastó su simulacro ve el paywall al reintentar.
 *   3. Es IMPOSIBLE regresar a una pregunta anterior.
 *   4. El tráfico de red REAL nunca contiene la respuesta correcta antes de tiempo.
 *   5. Recargar a mitad de sesión retoma con el tiempo correcto (el del servidor).
 *
 * Requiere una cuenta con onboarding completo y contenido servible en su área
 * (`E2E_EMAIL` / `E2E_PASSWORD`). La red de seguridad determinista de
 * no-filtración vive además en `tests/simulator/no-leak.test.ts`, que corre
 * siempre en la suite unitaria.
 */

test.describe('Simulador', () => {
  test.skip(!hasCredentials, 'Define E2E_EMAIL y E2E_PASSWORD para correr el E2E del simulador.');

  // El flujo feliz recorre el examen COMPLETO (120/140 reactivos): "Terminar
  // examen" solo existe en la última pregunta, igual que en el examen real.
  test.setTimeout(300_000);

  test('escenarios 1, 3 y 4: flujo feliz, sin regreso y sin filtrar la respuesta', async ({
    page,
  }) => {
    // Escenario 4: se vigila el tráfico REAL desde antes de entrar al examen.
    const watcher = watchForAnswerLeaks(page);

    await login(page);
    // Un simulacro colgado de una corrida anterior haría que la app reanude en
    // vez de mostrar el pre-flight: la suite se cierra sola para ser idempotente.
    await ensureNoActiveSimulation(page);
    await page.goto('/simulador');

    // ── Pre-flight ──
    const start = page.getByRole('button', { name: /iniciar examen/i });
    await expect(start).toBeVisible({ timeout: 20_000 });
    await start.click();

    // ── Sesión activa ──
    await expect(page.getByLabel('Tiempo restante')).toBeVisible({ timeout: 30_000 });
    await dismissResumeOverlay(page);
    await expect(page.getByText(/pregunta 1 de/i)).toBeVisible();

    // Escenario 3: no existe NINGÚN control para volver atrás. Es una garantía
    // estructural (el store del simulador solo sabe avanzar), no un detalle
    // cosmético: el examen real tampoco permite regresar.
    await expect(page.getByRole('button', { name: /anterior/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /regresar|volver a la pregunta/i })).toHaveCount(0);

    // Cuántos reactivos sirvió el servidor realmente ("Pregunta 1 de N").
    const progress = await page.getByText(/pregunta 1 de \d+/i).textContent();
    const total = Number(progress!.match(/de (\d+)/)![1]);
    expect(total).toBeGreaterThan(0);

    // Responder las primeras 3; el contador debe ser monotónico creciente.
    for (let i = 1; i <= 3; i++) {
      await expect(page.getByText(new RegExp(`pregunta ${i} de`, 'i'))).toBeVisible();
      await answerCurrentQuestion(page);
      await page.getByRole('button', { name: /siguiente/i }).click();
    }
    await expect(page.getByText(/pregunta 4 de/i)).toBeVisible();

    // Tras avanzar sigue sin haber forma de retroceder.
    await expect(page.getByRole('button', { name: /anterior/i })).toHaveCount(0);

    // Avanzar hasta la última (omitir una respuesta es válido, como en el
    // examen real). "Terminar examen" solo aparece en la última pregunta.
    const next = page.getByRole('button', { name: /siguiente/i });
    for (let i = 4; i < total; i++) {
      await next.click();
    }
    await expect(page.getByText(new RegExp(`pregunta ${total} de ${total}`, 'i'))).toBeVisible();

    // Ni siquiera en la última pregunta existe forma de volver atrás.
    await expect(page.getByRole('button', { name: /anterior/i })).toHaveCount(0);

    // ── Escenario 1: terminar y ver resultados ──
    await page.getByRole('button', { name: /terminar examen/i }).click();
    await expect(page.getByText(/no podrás volver a este examen/i)).toBeVisible();

    // A partir de que se confirma el cierre, revelar la correctitud YA es
    // legítimo (es justo lo que muestra la pantalla de resultados).
    watcher.disarm();
    await page.getByRole('button', { name: /sí, terminar/i }).click();

    await page.waitForURL(/view=result/, { timeout: 60_000 });
    await expect(page.getByText(/aciertos/i).first()).toBeVisible({ timeout: 30_000 });

    // ── Escenario 4: veredicto ──
    watcher.assertNoLeaks();
  });

  test('escenario 5: recargar a mitad de sesión retoma con el tiempo del servidor', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/simulador');

    const start = page.getByRole('button', { name: /iniciar examen/i });
    if (await start.isVisible().catch(() => false)) {
      await start.click();
    }
    await expect(page.getByLabel('Tiempo restante')).toBeVisible({ timeout: 30_000 });
    await dismissResumeOverlay(page);

    const before = await readTimerSeconds(page);
    await answerCurrentQuestion(page);

    // Deja correr el reloj de verdad antes de recargar.
    await page.waitForTimeout(3_000);
    await page.reload();

    // Debe reanudar la MISMA sesión, no ofrecer empezar una nueva.
    await expect(page.getByLabel('Tiempo restante')).toBeVisible({ timeout: 30_000 });
    await dismissResumeOverlay(page);
    await expect(page.getByRole('button', { name: /iniciar examen/i })).toHaveCount(0);

    const after = await readTimerSeconds(page);

    // El tiempo lo manda el SERVIDOR (contra `startedAt`): recargar no puede
    // regalar tiempo. Debe haber avanzado, nunca reiniciarse.
    expect(after).toBeLessThan(before);
    // ...y tampoco puede saltar de forma absurda (margen amplio por latencia).
    expect(before - after).toBeLessThan(120);
  });

  test('escenario 2: el segundo simulacro de un usuario gratuito topa con el paywall', async ({
    page,
  }) => {
    // Este escenario exige una cuenta FREE que YA agotó su simulacro gratuito.
    const freeEmail = process.env.E2E_FREE_USED_EMAIL;
    const freePassword = process.env.E2E_FREE_USED_PASSWORD;
    test.skip(
      !freeEmail || !freePassword,
      'Define E2E_FREE_USED_EMAIL/PASSWORD (cuenta gratuita que ya terminó su simulacro).'
    );

    await login(page, freeEmail!, freePassword!);
    await page.goto('/simulador');

    // El muro suave se aplica ANTES de crear nada: el servidor redirige al
    // paywall con el disparador correcto, sin abrir una segunda sesión.
    await page.waitForURL(/\/paywall/, { timeout: 30_000 });
    expect(page.url()).toContain('trigger=FULL_SIMULATION_LIMIT');
    await expect(page.getByRole('button', { name: /elegir|desbloquear|ver planes/i }).first()).toBeVisible();
  });
});
