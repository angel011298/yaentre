import { expect, test } from '@playwright/test';
import { answerCurrentQuestion, hasCredentials, login } from './helpers';

/**
 * E2E del recorrido completo de un usuario nuevo (F19 tarea 2):
 *   1. Registro → onboarding (examen, área, carrera) → diagnóstico → tablero.
 *   2. El límite diario de práctica gratuita se aplica de verdad.
 *   3. El checkout llega hasta la redirección a la pasarela, SIN pagar nada real.
 *
 * El registro real depende de la configuración de correo de Supabase (y de su
 * límite de envíos en el plan gratuito), así que ese spec se activa con
 * `E2E_SIGNUP=1`. Los otros dos corren con la cuenta de prueba estándar.
 */

test.describe('Recorrido del usuario nuevo', () => {
  test('registro → onboarding → diagnóstico → tablero', async ({ page }) => {
    test.skip(
      process.env.E2E_SIGNUP !== '1',
      'Define E2E_SIGNUP=1 para ejercer el registro real (consume cupo de correos de Supabase).'
    );

    const email = `e2e.journey.${Date.now()}@yaentre-test.mx`;
    const password = 'YaEntre!2027';

    // ── 1. Registro ──
    await page.goto('/registro');
    await page.getByLabel(/correo/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(password);
    await page.getByRole('button', { name: /crear cuenta/i }).click();

    // Un usuario nuevo aterriza en el onboarding, no en el tablero.
    await page.waitForURL(/\/onboarding/, { timeout: 60_000 });

    // ── 2. Onboarding: examen → área → carrera → intro del diagnóstico ──
    await expect(page.getByText(/paso 1/i)).toBeVisible();
    await page.getByRole('button', { name: /UNAM|Concurso de Selección/i }).first().click();

    await expect(page.getByText(/paso 2/i)).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /Físico-Matemáticas|Ingenierías/i }).first().click();

    await expect(page.getByText(/paso 3/i)).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /Ingeniería|Arquitectura|Física/i }).first().click();

    // Paso 4: Tino explica el diagnóstico.
    await expect(page.getByText(/paso 4/i)).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /empezar/i }).first().click();

    // ── 3. Diagnóstico: responder y terminar ──
    await page.waitForURL(/\/diagnostico/, { timeout: 60_000 });
    await expect(page.getByText(/pregunta 1/i)).toBeVisible({ timeout: 30_000 });

    // A diferencia del simulador, el diagnóstico SÍ permite navegar entre
    // preguntas (F7) — se comprueba que el navegador de preguntas existe.
    await expect(page.getByRole('tablist')).toBeVisible();

    for (let i = 0; i < 3; i++) {
      await answerCurrentQuestion(page);
      const next = page.getByRole('button', { name: /siguiente/i });
      if (await next.isVisible().catch(() => false)) await next.click();
    }

    await page.getByRole('button', { name: /terminar/i }).first().click();
    const confirm = page.getByRole('button', { name: /sí, terminar/i });
    if (await confirm.isVisible().catch(() => false)) await confirm.click();

    // ── 4. Resultados con Entrómetro y salida al tablero ──
    await expect(page.getByText(/aciert/i).first()).toBeVisible({ timeout: 60_000 });

    await page.goto('/app');
    // El tablero ya no pide el diagnóstico: el recorrido quedó cerrado.
    await expect(page.getByRole('heading', { name: /hola/i })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/completa tu diagnóstico/i)).toHaveCount(0);
  });

  test('el límite diario de práctica gratuita se aplica de verdad', async ({ page }) => {
    test.skip(!hasCredentials, 'Define E2E_EMAIL y E2E_PASSWORD.');
    await login(page);

    // El límite se decide SIEMPRE server-side. Se consulta el endpoint real
    // (mismo que usa el drill) en vez de inferirlo de la UI.
    const first = await page.request.post('/api/adaptive/next-questions', {
      data: { count: 50 },
    });

    // Un plan de pago responde 200 con remainingToday null (ilimitado);
    // uno gratuito, o bien 200 con un tope, o bien 402 si ya lo agotó.
    expect([200, 402, 409]).toContain(first.status());

    if (first.status() === 402) {
      // Ya sin cupo hoy: debe venir el disparador correcto del paywall.
      const body = await first.json();
      expect(body.trigger).toBe('DRILL_DAILY_LIMIT');
      return;
    }

    if (first.status() === 409) return; // cuenta sin área (sin onboarding)

    const body = await first.json();
    if (body.remainingToday === null) return; // cuenta de pago: sin límite, correcto

    // Cuenta gratuita con cupo: el servidor NUNCA entrega más de lo que queda,
    // aunque el cliente pida 50. Es la garantía real del muro suave.
    expect(body.remainingToday).toBeLessThanOrEqual(10);
    expect(body.questionIds.length).toBeLessThanOrEqual(body.remainingToday);
  });

  test('el checkout llega hasta la pasarela sin completar ningún pago real', async ({ page }) => {
    test.skip(!hasCredentials, 'Define E2E_EMAIL y E2E_PASSWORD.');
    test.skip(
      !process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'),
      'Requiere una llave de PRUEBA de Stripe (sk_test_...).'
    );

    await login(page);
    await page.goto('/paywall');

    const cta = page.getByRole('button', { name: /pase de temporada|elegir|desbloquear/i }).first();
    await expect(cta).toBeVisible({ timeout: 20_000 });
    await cta.click();

    // Basta con llegar al dominio de Stripe: ahí termina nuestra
    // responsabilidad y empieza la de la pasarela. NO se introduce ninguna
    // tarjeta ni se completa ningún cobro.
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });
    expect(page.url()).toContain('checkout.stripe.com');

    // Y el acceso sigue SIN activarse: solo el webhook puede activarlo.
    await page.goto('/app/perfil');
    await expect(page.getByText(/plan gratuito/i)).toBeVisible({ timeout: 30_000 });
  });
});
