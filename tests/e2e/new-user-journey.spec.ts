import { expect, test } from '@playwright/test';
import {
  answerCurrentQuestion,
  esperarEnlaceDeConfirmacion,
  hasCredentials,
  login,
} from './helpers';

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
    // G71: el correo de confirmación tarda segundos en salir y la sonda lo
    // reintenta hasta un minuto; con los 30 s por defecto de Playwright esta
    // prueba no podía terminar aunque todo funcionara.
    test.setTimeout(240_000);

    const email = `e2e.journey.${Date.now()}@mailinator.com`;
    const password = 'YaEntre!2027';

    // ── 1. Registro ──
    //
    // G71: esta prueba llevaba rota desde antes de G65 sin que nadie lo viera,
    // porque su `skip` por defecto la dejaba fuera de toda corrida. Tres cosas
    // habían cambiado en el producto y ninguna se reflejó aquí:
    //   · el formulario exige marcar términos y condiciones (si no, el envío
    //     no procede),
    //   · el registro NO aterriza en `/onboarding`: manda a `/login` a esperar
    //     la confirmación del correo — se confirma siguiendo el enlace real,
    //   · el onboarding no rotula «Paso 1/2/3/4» en texto (lleva una barra de
    //     progreso), y el navegador de preguntas del diagnóstico dejó de ser
    //     un `tablist` en G63 (era un patrón de pestañas roto) para ser un
    //     `group`.
    await page.goto('/registro');
    await page.getByLabel(/correo/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(password);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /crear cuenta/i }).click();

    // El registro pide confirmar el correo antes de entrar.
    await page.waitForURL(/\/login/, { timeout: 60_000 });
    await expect(page.getByText(/revisa tu correo/i)).toBeVisible({ timeout: 20_000 });

    // ── 1b. Confirmación del correo REAL, sin buzón ──
    // La API de Resend devuelve el HTML ya renderizado de lo que salió por su
    // SMTP, incluido lo que origina Supabase Auth (patrón de G70b,
    // docs/CORREOS_AUTH.md §6). El enlace se sigue en el navegador, que es lo
    // que hace un usuario de verdad.
    const enlace = await esperarEnlaceDeConfirmacion(email);
    await page.goto(enlace);

    // Ya confirmado y con sesión: aterriza en el onboarding.
    await page.waitForURL(/\/onboarding/, { timeout: 60_000 });

    // ── 2. Onboarding: examen → área → carrera → intro del diagnóstico ──
    await expect(page.getByText(/qué examen vas a presentar/i)).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /UNAM|Universidad Nacional/i }).first().click();

    await expect(page.getByText(/área o rama/i)).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /Físico-Matemáticas|Ingenierías/i }).first().click();

    await expect(page.getByText(/carrera meta/i)).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /Ingeniería|Arquitectura|Física/i }).first().click();

    // Último paso: Tino explica el diagnóstico.
    await page.getByRole('button', { name: /empezar diagnóstico/i }).first().click();

    // ── 3. Diagnóstico: responder y terminar ──
    await page.waitForURL(/\/diagnostico/, { timeout: 60_000 });
    await expect(page.getByText(/pregunta 1/i)).toBeVisible({ timeout: 30_000 });

    // A diferencia del simulador, el diagnóstico SÍ permite navegar entre
    // preguntas (F7) — se comprueba que el navegador de preguntas existe.
    // Es un `role="group"` desde G63; antes era un `tablist` mal formado.
    await expect(page.getByRole('group', { name: /navegación entre preguntas/i })).toBeVisible();

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
    // G71: esta prueba usa la cuenta GRATUITA, no `E2E_EMAIL`.
    //
    // Su afirmación final —«el acceso sigue sin activarse»— solo significa algo
    // en una cuenta sin plan. Corría con `E2E_EMAIL`, que el spec del simulador
    // necesita PAGADA para poder abrir simulacros de sobra: la misma variable
    // tenía que ser gratuita aquí y de pago allá. Con las dos cuentas fixture
    // configuradas fallaba siempre («plan gratuito» no aparece en un perfil con
    // Pase activo), y sin credenciales se saltaba entera — así que el fallo
    // llevaba escondido desde F19 detrás de un `skip`.
    const freeEmail = process.env.E2E_FREE_USED_EMAIL;
    const freePassword = process.env.E2E_FREE_USED_PASSWORD;
    test.skip(
      !freeEmail || !freePassword,
      'Define E2E_FREE_USED_EMAIL/PASSWORD (una cuenta SIN plan: la aserción final es que sigue sin acceso).'
    );
    test.skip(
      !process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'),
      'Requiere una llave de PRUEBA de Stripe (sk_test_...).'
    );

    await login(page, freeEmail!, freePassword!);
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
