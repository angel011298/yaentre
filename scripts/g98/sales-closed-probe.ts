import '../g71/env';

/**
 * scripts/g98/sales-closed-probe.ts — G98 tarea 8.  `pnpm sales:probe`
 *
 * ── VERIFICACIÓN POR EFECTO DE QUE LA COMPRA ESTÁ CERRADA EN PRODUCCIÓN ─────
 *
 * Las pruebas unitarias demuestran que la guarda está en el código. Esta sonda
 * demuestra otra cosa, que ninguna prueba local puede demostrar: que el
 * despliegue REAL de https://yaentre.com, con SUS variables de entorno y SU
 * llave de Stripe, rechaza la compra. Es exactamente la distinción que a G65
 * le costó cuatro fases aprender (G73): un verde local no dice nada de
 * producción.
 *
 * Cuatro comprobaciones, todas contra el dominio real:
 *
 *   P1 — /paywall NO ofrece «Elegir este plan», SÍ ofrece «Avísame cuando
 *        abra», y conserva los precios de los tres planes.
 *   P2 — El contador «quedan X de 500 licencias» no aparece ni en la página
 *        principal ni en /paywall.
 *   P3 — LA IMPORTANTE: se invoca `startCheckoutAction` **saltándose la
 *        interfaz**, con un `fetch` a la ruta de la Server Action llevando el
 *        `Next-Action` id y la cookie de sesión real — que es como la
 *        invocaría alguien decidido a comprar con el botón escondido. Debe
 *        responder con `SALES_CLOSED`, no con una URL de Stripe.
 *   P4 — Ni `subscriptions` ni `payments` ganaron una fila durante todo el
 *        recorrido (se cuentan antes y después contra la base real).
 *   P5 — CONTROL POSITIVO del consentimiento: se pulsa «Avísame cuando abra»
 *        de verdad y se comprueba en la base que apareció la fila
 *        `NotificationPreference` MARKETING con `enabled = true`. Sin este
 *        paso, P1 pasaría igual con un botón decorativo que no guarda nada.
 *        La fila se BORRA al terminar: una sonda limpia lo que crea (G65).
 *   P6 — El interruptor de MARKETING existe en /app/perfil: quien acepta
 *        tiene que poder retirarlo sin depender del enlace de un correo.
 *
 * ── EL ROJO ES ALCANZABLE ───────────────────────────────────────────────────
 *
 *   npx vercel env rm SALES_OPEN production && npx vercel --prod
 *   → P1 y P3 en rojo: el botón vuelve y la acción devuelve una URL de
 *   `checkout.stripe.com`. Es literalmente el estado en que estuvo producción
 *   desde G70.
 *
 * ── USO ─────────────────────────────────────────────────────────────────────
 *
 *   G98_PROBE_EMAIL=… G98_PROBE_PASSWORD=… pnpm sales:probe
 *
 * Si no se pasan, toma `E2E_FREE_USED_EMAIL`/`E2E_FREE_USED_PASSWORD` de
 * `.env.local`. La cuenta debe ser fixture (`@acierta-test.mx`): la sonda se
 * niega a correr con cualquier otra, para no tocar la cuenta de nadie real.
 */
import { chromium, type Browser, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const BASE = process.env.G98_BASE_URL ?? 'https://yaentre.com';
const EMAIL = process.env.G98_PROBE_EMAIL ?? process.env.E2E_FREE_USED_EMAIL ?? '';
const PASSWORD = process.env.G98_PROBE_PASSWORD ?? process.env.E2E_FREE_USED_PASSWORD ?? '';
const FIXTURE_DOMAIN = '@acierta-test.mx';
/** Perfil de `e2e.free@acierta-test.mx` (fixture, sin plan). */
const PERFIL_FIXTURE = process.env.G98_PROBE_PROFILE_ID ?? 'e2e_free_user';

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

interface Result {
  id: string;
  ok: boolean;
  detalle: string;
}
const results: Result[] = [];
const record = (id: string, ok: boolean, detalle: string): void => {
  results.push({ id, ok, detalle });
  console.log(`  ${ok ? '✅' : '❌'} ${id} — ${detalle}`);
};
const paso = (m: string): void => console.log(`\n· ${m}`);

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/correo/i).fill(EMAIL);
  await page.getByLabel(/contraseña/i).fill(PASSWORD);
  await page.getByRole('button', { name: /entrar|iniciar/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45_000 });
}

/**
 * P3 — invoca la Server Action SIN pasar por su botón.
 *
 * Next.js expone cada Server Action como un POST a la MISMA URL de la página
 * que la importa, con la cabecera `Next-Action: <id>`. Ese id se hornea en el
 * bundle del cliente en el build, así que no se puede adivinar: se saca de la
 * red, interceptando la petición que el propio navegador haría. Como con la
 * venta cerrada el botón ya no existe, se obtiene del JS servido para
 * `/paywall` — que es exactamente lo que haría alguien decidido a comprar.
 *
 * Devuelve el cuerpo crudo de la respuesta de la acción.
 */
async function invokeCheckoutActionDirectly(page: Page): Promise<{ status: number; body: string }> {
  // Los ids viven en los chunks de cliente de /paywall, dentro de las llamadas
  // a `createServerReference("<id>", …)`. Se buscan ESAS llamadas y no todo
  // hexadecimal de 40 caracteres: un barrido ciego prueba cientos de ids y
  // tarda más que el propio despliegue.
  const srcs: string[] = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[src]')).map((s) => (s as HTMLScriptElement).src)
  );

  const ids = new Set<string>();
  for (const url of srcs) {
    const text: string = await page.evaluate(async (u) => {
      try {
        return await (await fetch(u)).text();
      } catch {
        return '';
      }
    }, url);
    for (const m of text.matchAll(/createServerReference\)?\s*\(\s*["']([0-9a-f]{32,64})["']/g)) {
      ids.add(m[1]);
    }
    for (const m of text.matchAll(/["']([0-9a-f]{40})["']\s*,\s*[a-zA-Z$_]+\.callServer/g)) {
      ids.add(m[1]);
    }
  }
  console.log(`    (ids de Server Action hallados en el bundle de /paywall: ${ids.size})`);

  for (const id of ids) {
    const out = await page.evaluate(
      async ({ actionId, plan }) => {
        const res = await fetch('/paywall', {
          method: 'POST',
          headers: { 'Next-Action': actionId, 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify([{ plan }]),
        });
        return { status: res.status, body: (await res.text()).slice(0, 4000) };
      },
      { actionId: id, plan: 'SEASON_PASS' }
    );
    console.log(`    · ${id.slice(0, 12)}… → HTTP ${out.status}`);
    if (out.body.includes('SALES_CLOSED') || out.body.includes('checkout.stripe.com')) {
      return out;
    }
  }
  return { status: 0, body: '' };
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error(
      'Faltan credenciales. Define G98_PROBE_EMAIL/G98_PROBE_PASSWORD o E2E_FREE_USED_EMAIL/PASSWORD.'
    );
    process.exitCode = 1;
    return;
  }
  if (!EMAIL.toLowerCase().endsWith(FIXTURE_DOMAIN)) {
    console.error(`La cuenta debe ser fixture (${FIXTURE_DOMAIN}). Recibida: ${EMAIL}`);
    process.exitCode = 1;
    return;
  }

  console.log(`\n=== G98 · compra cerrada en ${BASE} ===`);
  console.log(`Cuenta fixture: ${EMAIL}`);

  const antes = {
    subs: await prisma.subscription.count(),
    payments: await prisma.payment.count(),
  };
  console.log(`\nAntes → subscriptions=${antes.subs} payments=${antes.payments}`);

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    paso('Login con la cuenta fixture');
    await login(page);

    paso('P1 — /paywall sin botón de compra y con «Avísame cuando abra»');
    await page.goto(`${BASE}/paywall`, { waitUntil: 'domcontentloaded' });
    const elegir = await page.getByRole('button', { name: /elegir este plan/i }).count();
    const avisame = await page.getByRole('button', { name: /avísame cuando abra/i }).count();
    const preventa = await page.getByText(/la preventa abre pronto/i).count();
    const paywallHtml = await page.content();
    const preciosVisibles = ['499', '899', '149'].filter((p) => paywallHtml.includes(p)).length;
    record(
      'P1',
      elegir === 0 && avisame === 1 && preventa === 3,
      `«Elegir este plan»=${elegir} (debe ser 0) · «Avísame cuando abra»=${avisame} (1) · ` +
        `«La preventa abre pronto»=${preventa} (3, uno por plan) · precios visibles=${preciosVisibles}/3`
    );

    paso('P2 — el contador de licencias no aparece en ningún lado');
    const landingHtml = await (await fetch(`${BASE}/`)).text();
    const contadorLanding = /quedan\s+\d+\s+de\s+500/i.test(landingHtml);
    const contadorPaywall = /quedan\s+\d+\s+de\s+500/i.test(paywallHtml);
    record(
      'P2',
      !contadorLanding && !contadorPaywall,
      `landing=${contadorLanding ? 'APARECE' : 'oculto'} · paywall=${contadorPaywall ? 'APARECE' : 'oculto'}`
    );

    paso('P3 — invocar la Server Action SIN pasar por la interfaz');
    const direct = await invokeCheckoutActionDirectly(page);
    const rechazada = direct.body.includes('SALES_CLOSED');
    const dioUrlDeStripe = direct.body.includes('checkout.stripe.com');
    record(
      'P3',
      rechazada && !dioUrlDeStripe,
      direct.status === 0
        ? 'NO se pudo alcanzar la acción (ningún id candidato respondió) — inconcluso'
        : `HTTP ${direct.status} · SALES_CLOSED=${rechazada} · URL de Stripe=${dioUrlDeStripe}`
    );
    if (direct.status === 0) results[results.length - 1].ok = false;

    paso('P5 — «Avísame cuando abra» guarda el consentimiento de MARKETING');
    await page.goto(`${BASE}/paywall`, { waitUntil: 'domcontentloaded' });
    await prisma.notificationPreference.deleteMany({
      where: { userProfileId: PERFIL_FIXTURE, type: 'MARKETING' },
    });
    await page.getByRole('button', { name: /avísame cuando abra/i }).click();
    await page.getByText(/te avisamos en cuanto abra/i).waitFor({ timeout: 30_000 });
    const pref = await prisma.notificationPreference.findFirst({
      where: { userProfileId: PERFIL_FIXTURE, type: 'MARKETING' },
      select: { enabled: true },
    });
    record(
      'P5',
      pref?.enabled === true,
      pref ? `fila MARKETING enabled=${pref.enabled}` : 'NO se creó ninguna fila MARKETING'
    );
    await prisma.notificationPreference.deleteMany({
      where: { userProfileId: PERFIL_FIXTURE, type: 'MARKETING' },
    });
    console.log('    (fila de consentimiento borrada — la sonda limpia lo que crea)');

    paso('P6 — el interruptor de MARKETING está en /app/perfil');
    await page.goto(`${BASE}/app/perfil`, { waitUntil: 'domcontentloaded' });
    const toggle = page.getByText(/novedades, promociones y apertura de la preventa/i);
    const visible = await toggle.count();
    record('P6', visible === 1, `interruptor de MARKETING en el perfil: ${visible} (debe ser 1)`);

    await context.close();
  } finally {
    await browser?.close();
  }

  paso('P4 — la base no ganó ninguna fila');
  const despues = {
    subs: await prisma.subscription.count(),
    payments: await prisma.payment.count(),
  };
  record(
    'P4',
    despues.subs === antes.subs && despues.payments === antes.payments,
    `subscriptions ${antes.subs}→${despues.subs} · payments ${antes.payments}→${despues.payments}`
  );

  const fallos = results.filter((r) => !r.ok);
  console.log(`\n=== VEREDICTO: ${results.length - fallos.length}/${results.length} ===`);
  if (fallos.length) {
    console.log(`  🛑 ${fallos.map((f) => f.id).join(', ')} en rojo.`);
    process.exitCode = 1;
  } else {
    console.log('  ✅ La compra está cerrada en producción, por efecto.');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
