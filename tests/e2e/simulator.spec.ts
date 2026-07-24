import { expect, test, type Page } from '@playwright/test';

/**
 * E2E del simulador (F12 tareas 9 y 10). Cubre dos criterios de aceptación:
 *   (10) Flujo feliz de extremo a extremo: entrar → pre-flight → responder
 *        varias preguntas → terminar → ver resultados.
 *   (9)  Intercepta la comunicación de RED REAL y verifica que la respuesta
 *        correcta nunca viaja mientras la sesión sigue abierta.
 *
 * Requiere un usuario de prueba ya onboardeado (examen+carrera elegidos) y con
 * su simulacro gratuito disponible, más contenido servible en su área. Como eso
 * depende del entorno, el test se auto-omite si no se configuran credenciales
 * (E2E_EMAIL / E2E_PASSWORD). La red de seguridad determinista de no-filtración
 * vive además en tests/simulator/no-leak.test.ts (corre siempre en unit).
 */

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test.describe('Simulador — flujo feliz y no-filtración de red', () => {
  test.skip(!EMAIL || !PASSWORD, 'Define E2E_EMAIL y E2E_PASSWORD para correr el E2E del simulador.');

  async function login(page: Page) {
    await page.goto('/login');
    await page.getByLabel(/correo/i).fill(EMAIL!);
    await page.getByLabel(/contraseña/i).fill(PASSWORD!);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await page.waitForURL(/\/app|\/onboarding|\/diagnostico/);
  }

  test('responde varias preguntas, termina y ve resultados sin filtrar la respuesta', async ({
    page,
  }) => {
    // Intercepta TODAS las respuestas de red: ninguna debe contener isCorrect
    // mientras el simulacro está en curso (antes de finalizar).
    const leaks: string[] = [];
    let finished = false;
    page.on('response', async (res) => {
      if (finished) return;
      const url = res.url();
      if (!url.includes('/simulador') && !url.includes('/api/simulator')) return;
      try {
        const body = await res.text();
        if (body.includes('"isCorrect"') || body.includes('correctOption')) {
          leaks.push(url);
        }
      } catch {
        /* respuestas sin cuerpo legible se ignoran */
      }
    });

    await login(page);

    await page.goto('/simulador');
    // Pre-flight → iniciar examen.
    await page.getByRole('button', { name: /iniciar examen/i }).click();

    // Responde las primeras preguntas y avanza (sin posibilidad de regresar).
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /^[A-D]$/ }).first().waitFor();
      await page.getByRole('button', { name: /^[A-D]$/ }).first().click();
      const next = page.getByRole('button', { name: /siguiente/i });
      if (await next.isVisible().catch(() => false)) {
        await next.click();
      }
    }

    // No debe existir ningún control para regresar.
    await expect(page.getByRole('button', { name: /anterior/i })).toHaveCount(0);

    // Termina (puede requerir avanzar hasta la última; forzamos vía terminar si aparece).
    const finish = page.getByRole('button', { name: /terminar examen/i });
    if (await finish.isVisible().catch(() => false)) {
      await finish.click();
      await page.getByRole('button', { name: /sí, terminar/i }).click();
    }

    finished = true;
    await page.waitForURL(/view=result/);
    await expect(page.getByText(/terminaste tu simulacro/i)).toBeVisible();

    expect(leaks, `Respuestas que filtraron correctitud: ${leaks.join(', ')}`).toHaveLength(0);
  });
});
