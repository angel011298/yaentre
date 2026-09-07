import { expect, type BrowserContext, type Page } from '@playwright/test';

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

/**
 * Sesiones ya abiertas, reutilizadas dentro del mismo proceso de worker (G71).
 *
 * `loginAction` gasta DOS presupuestos del limitador distribuido de G65 en cada
 * intento —`SIGN_IN` por cuenta y `SIGN_IN` por IP, 8 cada 10 minutos— y la
 * suite entraba con usuario y contraseña en CADA prueba. Con `fullyParallel`
 * eso agotaba el cubo por IP a media corrida: dos specs morían con un timeout
 * en `waitForURL` que parecía un fallo del producto y era el control de
 * seguridad haciendo exactamente su trabajo. Reutilizar las cookies baja el
 * gasto a un login por cuenta y por worker.
 */
type CookiesGuardadas = Awaited<ReturnType<BrowserContext['cookies']>>;
const sesionesAbiertas = new Map<string, CookiesGuardadas>();

export async function login(page: Page, email = E2E_EMAIL!, password = E2E_PASSWORD!) {
  const guardadas = sesionesAbiertas.get(email);
  if (guardadas) {
    await page.context().addCookies(guardadas);
    await page.goto('/app');
    // Si la sesión guardada seguía viva, el guard ya no manda a /login.
    if (!/\/login/.test(page.url())) return;
    sesionesAbiertas.delete(email);
  }

  await page.goto('/login');
  await page.getByLabel(/correo/i).fill(email);
  await page.getByLabel(/contraseña/i).fill(password);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();

  // Si el limitador corta, la página se queda quieta y `waitForURL` moría por
  // timeout — un fallo mudo que se lee como si el producto estuviera roto.
  // Se gana la carrera contra el `alert` del formulario para poder decir qué
  // pasó de verdad (G71).
  const alerta = page.getByRole('alert');
  const destino = page
    .waitForURL(/\/app|\/onboarding|\/diagnostico|\/tutor/, { timeout: 30_000 })
    .then(() => 'ok' as const);
  const rechazo = alerta
    .filter({ hasText: /demasiad|intenta de nuevo|no coinciden|incorrect/i })
    .first()
    .waitFor({ state: 'visible', timeout: 30_000 })
    .then(() => 'rechazo' as const);

  const cual = await Promise.race([destino, rechazo]).catch(() => 'timeout' as const);
  if (cual !== 'ok') {
    const motivo = (await alerta.first().textContent().catch(() => null))?.trim();
    throw new Error(
      `El login de ${email} no llegó a ninguna ruta de la app. ` +
        (motivo
          ? `La app respondió: "${motivo}". Si es el límite de intentos, es el control de G65 ` +
            '(SIGN_IN: 8 cada 10 min, por cuenta y por IP) — espera la ventana o corre menos specs a la vez.'
          : 'Sin mensaje en pantalla: revisa que el servidor de pruebas esté arriba.')
    );
  }
  sesionesAbiertas.set(email, await page.context().cookies());
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

/**
 * Enlace de confirmación de correo de un registro REAL, sin buzón (G71).
 *
 * La API de Resend devuelve el HTML ya renderizado de cada correo que salió
 * por su SMTP — incluidos los que origina Supabase Auth, porque el proyecto
 * usa Resend como SMTP (patrón de G70b, `docs/CORREOS_AUTH.md` §6). Sin esto
 * el recorrido del usuario NUEVO no se puede probar de punta a punta: el
 * registro exige confirmar el correo antes de dejar entrar.
 *
 * LANZA con un motivo concreto en vez de devolver `null` a secas: sin llave,
 * correo que no llega, o correo que llega sin el enlace esperado son tres
 * fallos distintos y el que lo lea tiene que poder distinguirlos sin abrir el
 * panel de Resend.
 *
 * El filtro es por DESTINATARIO, no por fecha: la dirección lleva un
 * `Date.now()` incrustado, así que ya es única por corrida. Un filtro temporal
 * añadía una ventana frágil (la lista de Resend tarda en reflejar el envío) sin
 * descartar nada que el destinatario no descarte ya.
 */
export async function esperarEnlaceDeConfirmacion(
  email: string,
  { intentos = 18, esperaMs = 5000 }: { intentos?: number; esperaMs?: number } = {}
): Promise<string> {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.includes('placeholder')) {
    throw new Error('RESEND_API_KEY ausente o placeholder: sin ella no se puede leer el correo real.');
  }

  let ultimoAsunto: string | null = null;
  for (let i = 0; i < intentos; i++) {
    await new Promise((r) => setTimeout(r, esperaMs));
    const lista = await fetch('https://api.resend.com/emails?limit=25', {
      headers: { Authorization: `Bearer ${key}` },
    })
      .then((r) => r.json() as Promise<{ data?: Array<Record<string, unknown>> }>)
      .catch(() => ({ data: [] }));

    const correo = (lista.data ?? []).find((e) => String(e.to).includes(email));
    if (!correo) continue;
    ultimoAsunto = String(correo.subject ?? '');

    const detalle: { text?: string } = await fetch(`https://api.resend.com/emails/${correo.id}`, {
      headers: { Authorization: `Bearer ${key}` },
    })
      .then((r) => r.json() as Promise<{ text?: string }>)
      .catch(() => ({}) as { text?: string });

    const enlace = /https:\/\/\S*\/auth\/confirm\?\S*token_hash=[^\s\]]+/.exec(detalle.text ?? '');
    if (enlace) return enlace[0];
  }

  throw new Error(
    ultimoAsunto === null
      ? `Resend no reporta ningún correo para ${email} tras ${(intentos * esperaMs) / 1000}s (¿tope de altas por hora de Supabase Auth?).`
      : `Llegó un correo a ${email} ("${ultimoAsunto}") pero sin un enlace a /auth/confirm con token_hash.\n` +
        'Causa típica al correr fuera de producción: el `emailRedirectTo` que manda la app ' +
        '(`http://localhost:3000/auth/confirm?next=…`) no está en la lista de Redirect URLs de ' +
        'Supabase Auth, así que GoTrue degrada `{{ .RedirectTo }}` al Site URL PELADO y la plantilla ' +
        'produce `https://yaentre.com&token_hash=…`, que ni siquiera es una URL válida. ' +
        'Remedio: añadir el origen desde el que se corre a Authentication → URL Configuration → ' +
        'Redirect URLs (ver docs/CORREOS_AUTH.md §7).'
  );
}
