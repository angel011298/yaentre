import { expect, type Page } from '@playwright/test';

/**
 * Utilidades compartidas por la suite E2E (F19).
 *
 * Las credenciales vienen de env (`E2E_EMAIL` / `E2E_PASSWORD`) porque un E2E
 * real necesita una cuenta con onboarding hecho y contenido servible en su
 * área — eso depende del entorno, no del repositorio. Los specs se auto-omiten
 * si no están definidas, así la suite nunca falla en falso.
 */

export const E2E_EMAIL = process.env.E2E_EMAIL;
export const E2E_PASSWORD = process.env.E2E_PASSWORD;
export const hasCredentials = Boolean(E2E_EMAIL && E2E_PASSWORD);

export async function login(page: Page, email = E2E_EMAIL!, password = E2E_PASSWORD!) {
  await page.goto('/login');
  await page.getByLabel(/correo/i).fill(email);
  await page.getByLabel(/contraseña/i).fill(password);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await page.waitForURL(/\/app|\/onboarding|\/diagnostico|\/tutor/, { timeout: 30_000 });
}

/**
 * Vigilante de FUGA DE RESPUESTAS (guardrail de CLAUDE.md). Intercepta el
 * tráfico REAL y guarda cualquier respuesta del servidor que revele la
 * correctitud mientras el examen sigue abierto.
 *
 * Se inspecciona todo el tráfico de la app (no solo `/api`): en Next.js las
 * Server Actions y el payload RSC viajan por POST/GET a la propia ruta, así
 * que filtrar por `/api` dejaría fuera justo el canal por donde podría
 * escaparse la respuesta correcta.
 */
export function watchForAnswerLeaks(page: Page) {
  const leaks: Array<{ url: string; hit: string }> = [];
  let armed = true;

  const patterns = [/"isCorrect"/, /correctOption/, /\bisCorrect\\?":/];

  page.on('response', async (res) => {
    if (!armed) return;
    const url = res.url();
    // Solo el tráfico de nuestra propia app; se ignoran assets estáticos.
    if (!url.includes('localhost')) return;
    if (/\.(css|js|woff2?|png|jpe?g|svg|ico|map)(\?|$)/.test(url)) return;

    let body: string;
    try {
      body = await res.text();
    } catch {
      return; // respuestas sin cuerpo legible (redirects, 204, etc.)
    }

    for (const pattern of patterns) {
      if (pattern.test(body)) {
        leaks.push({ url, hit: pattern.source });
        return;
      }
    }
  });

  return {
    leaks,
    /** Deja de vigilar (tras finalizar, revelar la correctitud SÍ es legítimo). */
    disarm() {
      armed = false;
    },
    assertNoLeaks() {
      expect(
        leaks,
        `El servidor reveló la correctitud antes de tiempo en:\n${leaks
          .map((l) => `  - ${l.url} (coincidió ${l.hit})`)
          .join('\n')}`
      ).toEqual([]);
    },
  };
}

/**
 * Cierra el aviso de reanudación si está presente.
 *
 * Al retomar una sesión, el simulador muestra una capa a pantalla completa
 * ("Retomando tu simulacro") que invita a volver a pantalla completa. Es
 * intencional en producto —el examen real es en pantalla completa— pero
 * bloquea la interacción, así que el E2E la descarta explícitamente por la
 * salida honesta que la propia UI ofrece.
 */
export async function dismissResumeOverlay(page: Page) {
  const skip = page.getByRole('button', { name: /continuar sin pantalla completa/i });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
    await expect(skip).toBeHidden();
  }
}

/**
 * Deja la cuenta sin simulacro en curso, para que el siguiente spec arranque
 * desde el pre-flight de verdad.
 *
 * Un simulacro abierto sobrevive a la sesión del navegador a propósito (es la
 * resiliencia que prueba el escenario 5), así que la suite tiene que cerrarlo
 * explícitamente o el orden de ejecución la volvería frágil. Se cierra por el
 * mismo camino que usaría un alumno: avanzar hasta la última y terminar.
 */
export async function ensureNoActiveSimulation(page: Page) {
  await page.goto('/simulador');
  const timer = page.getByLabel('Tiempo restante');
  if (!(await timer.isVisible().catch(() => false))) return; // ya está limpio

  await dismissResumeOverlay(page);
  const progress = await page.getByText(/pregunta \d+ de \d+/i).textContent();
  const [, current, total] = progress!.match(/pregunta (\d+) de (\d+)/i)!;

  const next = page.getByRole('button', { name: /siguiente/i });
  for (let i = Number(current); i < Number(total); i++) {
    await next.click();
  }
  await page.getByRole('button', { name: /terminar examen/i }).click();
  await page.getByRole('button', { name: /sí, terminar/i }).click();
  await page.waitForURL(/view=result/, { timeout: 60_000 });
}

/** Responde la pregunta visible eligiendo la primera opción disponible. */
export async function answerCurrentQuestion(page: Page) {
  const option = page.getByRole('button', { name: /^[A-D]\b/ }).first();
  await option.waitFor({ state: 'visible', timeout: 15_000 });
  await option.click();
}

/** Lee el temporizador (HH:MM:SS) como segundos totales. */
export async function readTimerSeconds(page: Page): Promise<number> {
  const timer = page.getByLabel('Tiempo restante');
  await timer.waitFor({ state: 'visible', timeout: 15_000 });
  const text = (await timer.textContent())?.trim() ?? '';
  const match = text.match(/(\d{2}):(\d{2}):(\d{2})/);
  if (!match) throw new Error(`No se pudo leer el temporizador: "${text}"`);
  const [, h, m, s] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}
