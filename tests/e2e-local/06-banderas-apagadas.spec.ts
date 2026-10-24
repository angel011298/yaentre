import { expect, test } from '@playwright/test';
import { LOCAL } from './support/stack-env';
import { loginAs } from './support/session';

/**
 * Con las tres banderas de G103 APAGADAS (como producción hoy), nada nuevo
 * existe para el público ni para un alumno: rutas con 404 REAL (no un «404
 * suave» con estado 200), API 404, y la app no enlaza a clases ni cursos.
 * Mismo build que el resto de la suite, en :3001.
 *
 * La PORTADA no se verifica aquí: es estática (ISR) y este servidor reutiliza
 * un build compilado con las banderas encendidas, así que serviría ese HTML.
 * En producción build y ejecución usan el mismo entorno; el texto según las
 * banderas lo fija `tests/marketing/forbidden-copy.test.ts`.
 */
test.use({ baseURL: LOCAL.flagsOffUrl });

const PAGES = ['/cursos', '/cursos/algebra-desde-cero', '/regularizacion', '/clases', '/profesor', '/mis-cursos', '/aprender/algebra'];

test('las páginas nuevas responden 404 real, sin sesión y con sesión', async ({ page, request }) => {
  for (const path of PAGES) {
    const r = await request.get(path, { maxRedirects: 0 });
    expect(r.status(), path).toBe(404);
  }
  await loginAs(page, 'premium');
  for (const path of PAGES) {
    const r = await page.goto(path);
    expect(r?.status(), path).toBe(404);
  }
});

test('las API nuevas responden 404', async ({ page }) => {
  await loginAs(page, 'profe');
  for (const path of [
    '/api/teachers/me/availability',
    '/api/teachers/me/payouts',
    '/api/teachers/me/date-blocks',
    '/api/classes/teachers/ckteacher00000000000000001/slots?duration=50&subject=matematicas',
  ]) {
    const r = await page.request.get(path);
    expect(r.status(), path).toBe(404);
  }
});

test('las pantallas del alumno no enlazan a clases ni cursos', async ({ page }) => {
  await loginAs(page, 'premium');
  for (const path of ['/app', '/app/perfil', '/app/progreso']) {
    await page.goto(path);
    await expect(page.locator('a[href^="/cursos"], a[href^="/clases"], a[href^="/regularizacion"], a[href^="/mis-cursos"]'), path).toHaveCount(0);
  }
});
