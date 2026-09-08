import '../g71/env';

/**
 * scripts/g73b/live-controls-probe.ts — G73b.  `pnpm security:live`
 *
 * ── RE-VERIFICACIÓN DE LOS CONTROLES DE G65 POR SU EFECTO, NO POR SU CÓDIGO ──
 *
 * G65 declaró funcionando el limitador de tasa distribuido. G73 descubrió que
 * NUNCA había funcionado en producción. La auditoría no mintió: comprobó lo
 * que podía comprobar —el código, y el comportamiento contra la base con el
 * rol LOCAL `acierta_ci`— y ninguna de las dos cosas dice nada sobre el rol
 * `acierta_prod`, que es el que corre el producto real.
 *
 * Esta sonda cierra ese hueco de la única forma que lo cierra de verdad:
 * ATACANDO https://yaentre.com con un navegador real, por la misma puerta por
 * la que entraría un atacante, y exigiendo VER el bloqueo en pantalla.
 *
 *   C1 — Fuerza bruta en LOGIN (8 por 10 min, por cuenta y por IP). Sin esto,
 *        adivinar la contraseña de un alumno es dejar un script corriendo.
 *
 *   C2 — Fuerza bruta en RECUPERACIÓN DE CONTRASEÑA (4/hora). Sin esto el
 *        formulario es un cañón de correo hacia la bandeja de cualquiera cuyo
 *        correo se conozca. Se usa una dirección INEXISTENTE a propósito:
 *        Supabase no manda nada, pero el límite se consume igual — una sonda
 *        no debe generar rebotes que dañen la reputación del dominio.
 *
 *   C3 — Fuerza bruta en el CANJE DEL CÓDIGO DE VINCULACIÓN PARENTAL (6 por
 *        10 min). EL MÁS GRAVE: son 6 dígitos con 10 minutos de vida, y
 *        acertarlos entrega el tablero completo de un MENOR a un desconocido.
 *
 *   C4 — AISLAMIENTO entre cuentas por el CUERPO de la respuesta de red: con
 *        el JWT real de un alumno contra `/rest/v1` —la misma API que alcanza
 *        cualquier navegador con la anon key, que es pública por diseño.
 *
 * ── ORDEN Y HIGIENE DE CUBOS ────────────────────────────────────────────────
 *
 * El orden NO es arbitrario: C1 agota a propósito el presupuesto de login POR
 * IP, así que cualquier prueba que necesite iniciar sesión (C3, C4) tiene que
 * correr ANTES. Y al empezar se borran los cubos que esta misma sonda va a
 * usar —solo los suyos, por clave exacta— porque si no, dos corridas seguidas
 * darían un falso verde (bloqueo heredado de la corrida anterior) o un falso
 * rojo. Los cubos de usuarios reales no se tocan.
 *
 * ── EL ROJO ES ALCANZABLE ───────────────────────────────────────────────────
 *
 *   REVOKE USAGE ON SCHEMA app_security FROM acierta_app, acierta_prod;
 *   → C1, C2 y C3 en rojo: el limitador falla abierto y nunca bloquea. Es
 *   literalmente el estado en que estuvo producción de G65 a G73.
 *
 * ── USO ─────────────────────────────────────────────────────────────────────
 *
 *   G73B_PROBE_PASSWORD=… DATABASE_URL=<prod> pnpm security:live
 *
 * Variables: G73B_PROBE_PASSWORD (contraseña temporal de las cuentas
 * `rlsprobe.*@acierta-test.mx`), G73B_BASE_URL (default producción).
 */
import { chromium, type Browser, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const BASE = process.env.G73B_BASE_URL ?? 'https://yaentre.com';
const PASSWORD = process.env.G73B_PROBE_PASSWORD ?? '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const ALUMNO_A = 'rlsprobe.alumnoa@acierta-test.mx';
const ALUMNO_B = 'rlsprobe.alumnob@acierta-test.mx';
const TUTOR = 'rlsprobe.tutor@acierta-test.mx';
const TUTOR_PROFILE_ID = 'rlsprobe_tutor';

/** Presupuestos declarados en `src/lib/rate-limit/store.ts`. */
const LIMITE_LOGIN = 8;
const LIMITE_RESET = 4;
const LIMITE_CANJE = 6;

const CORREO_RESET = `g73b.inexistente.${Date.now()}@acierta-test.mx`;

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

const esBloqueo = (t: string): boolean => /Demasiados intentos/i.test(t ?? '');

async function ipPublica(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const { ip } = (await res.json()) as { ip: string };
    return ip;
  } catch {
    return '';
  }
}

/** Borra SOLO los cubos que esta sonda va a consumir, por clave exacta. */
async function limpiarCubos(ip: string): Promise<string[]> {
  const claves = [
    `SIGN_IN:${ALUMNO_A}`,
    `SIGN_IN:${TUTOR}`,
    `PASSWORD_RESET:${CORREO_RESET}`,
    `PARENT_LINK_REDEEM:${TUTOR_PROFILE_ID}`,
    ...(ip
      ? [
          `SIGN_IN:ip:${ip}`,
          `PASSWORD_RESET:ip:${ip}`,
          `PARENT_LINK_REDEEM_IP:ip:${ip}`,
        ]
      : []),
  ];
  try {
    await prisma.$executeRaw`
      DELETE FROM app_security.rate_limit_hits WHERE bucket_key = ANY(${claves}::text[])
    `;
  } catch (err) {
    // Que la higiene falle NO puede impedir el ataque: si el rol perdió el
    // acceso al almacén del limitador, eso es precisamente el defecto de G73 y
    // la sonda tiene que llegar a C1/C2/C3 para demostrarlo en pantalla, no
    // reventar antes con un stack de Prisma.
    const detalle = err instanceof Error ? err.message.replace(/\s+/g, ' ').slice(-90) : String(err);
    console.log(`  ⚠️  No se pudieron limpiar los cubos: ${detalle}`);
    console.log('      Eso YA es una señal: el rol de la app no alcanza app_security.');
    console.log('      La sonda sigue: los ataques de abajo dirán si el limitador vive.');
  }
  return claves;
}

/**
 * Página lista para INTERACTUAR. `domcontentloaded` no basta: los formularios
 * usan `useActionState`, y si se hace clic antes de que React hidrate, el
 * envío se va por el camino nativo y el mensaje de error no aterriza donde la
 * sonda lo busca. La primera versión de esta sonda daba "(sin mensaje)" en los
 * 9 intentos por exactamente eso — un falso ROJO, que es tan malo como un
 * falso verde.
 */
async function abrir(page: Page, ruta: string): Promise<void> {
  await page.goto(`${BASE}${ruta}`, { waitUntil: 'networkidle' });
}

async function nuevaSesion(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    try {
      localStorage.setItem('yaentre-cookies-consent', 'true');
    } catch {
      /* almacenamiento bloqueado: da igual para la sonda */
    }
  });
  return { context, page };
}

/**
 * Espera a que aparezca UNO de los desenlaces esperados y devuelve su texto.
 *
 * ⚠️ NO vale esperar a `[role="alert"]`. Next.js inyecta en cada página un
 * `<div id="__next-route-announcer__" role="alert">` con el TÍTULO de la ruta
 * para lectores de pantalla. Está siempre presente y visible, así que
 * `locator('[role="alert"]').first()` se satisface al instante —antes de que
 * la Server Action responda— y devuelve "Panel del tutor — YaEntre" o cadena
 * vacía. La primera versión de esta sonda hacía justo eso y reportó los tres
 * limitadores en ROJO estando los tres vivos: un falso rojo, que es tan
 * inservible como un falso verde (G71 §6 D6).
 *
 * Por eso se espera por el CONTENIDO concreto que el control debe producir.
 * `patron` tiene que cubrir tanto el desenlace normal como el bloqueo: si solo
 * cubriera el bloqueo, un producto que no responde nada se vería igual que uno
 * que no bloquea.
 */
async function esperarMensaje(page: Page, patron: RegExp): Promise<string> {
  try {
    const loc = page.getByText(patron).first();
    await loc.waitFor({ state: 'visible', timeout: 25000 });
    return (await loc.innerText()).replace(/\s+/g, ' ').trim();
  } catch {
    return '(sin respuesta reconocible en 25 s)';
  }
}

/** Login → o error genérico, o bloqueo. Nada más es un desenlace válido. */
const RESPUESTA_LOGIN = /Correo o contraseña incorrectos|Demasiados intentos/i;
/** Canje parental → o código inválido, o bloqueo. */
const RESPUESTA_CANJE = /Código inválido o expirado|Demasiados intentos/i;
/** Recuperación → o la respuesta genérica que no filtra, o bloqueo. */
const RESPUESTA_RESET = /Si el correo existe|Demasiados intentos/i;

// ═══════════════════════════════════════════════════════════════════════════
// C3 — CANJE DEL CÓDIGO PARENTAL (primero: necesita iniciar sesión)
// ═══════════════════════════════════════════════════════════════════════════
async function c3CanjeParental(browser: Browser): Promise<void> {
  paso(`C3: ${LIMITE_CANJE + 1} canjes de códigos inválidos como TUTOR`);
  const { context, page } = await nuevaSesion(browser);
  const mensajes: string[] = [];
  try {
    await abrir(page, '/login');
    await page.getByLabel(/correo/i).fill(TUTOR);
    await page.getByLabel(/contraseña/i).fill(PASSWORD);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await page.waitForURL(/\/tutor/, { timeout: 30000 });

    const campo = page.getByLabel(/código/i);
    await campo.waitFor({ state: 'visible', timeout: 20000 });
    const boton = page.getByRole('button', { name: /vincular/i }).first();

    for (let i = 1; i <= LIMITE_CANJE + 1; i++) {
      // 6 dígitos aleatorios: no hay ningún código vivo, así que acertar por
      // accidente es 1 entre 10^6 y el resultado esperado es "inválido".
      const codigo = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
      await campo.fill(codigo);
      await boton.click();
      const msg = await esperarMensaje(page, RESPUESTA_CANJE);
      mensajes.push(msg);
      console.log(`    canje ${i} (${codigo}) → ${msg}`);
      if (esBloqueo(msg)) break;
    }
  } finally {
    await context.close();
  }

  const bloqueo = mensajes.findIndex(esBloqueo);
  record(
    'C3-canje-parental-bloquea',
    bloqueo >= 0,
    bloqueo >= 0
      ? `bloqueado en el canje ${bloqueo + 1} (presupuesto ${LIMITE_CANJE}): "${mensajes[bloqueo]}"`
      : `${mensajes.length} canjes SIN bloqueo — un script barre los 10^6 códigos y se queda con el tablero de un MENOR`
  );
  // El control del control: si ningún canje devolvió "inválido", la sonda no
  // estaba ejercitando el canje y su verde no valdría nada (lección G71 §6 D6).
  const ejercitado = mensajes.some((m) => /inválido o expirado/i.test(m));
  record(
    'C3-el-canje-se-ejercita',
    ejercitado,
    ejercitado
      ? 'los canjes previos al bloqueo devolvieron "código inválido o expirado"'
      : 'ningún canje devolvió "código inválido": la prueba no estaba llegando al canje'
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// C4 — AISLAMIENTO ENTRE CUENTAS, POR EL CUERPO DE LA RED
// ═══════════════════════════════════════════════════════════════════════════
async function c4Aislamiento(): Promise<void> {
  paso('C4: con el JWT real de un alumno contra /rest/v1 (la API que alcanza el navegador)');

  const token = async (email: string): Promise<{ jwt: string; sub: string }> => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON, 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    const body = (await res.json()) as { access_token?: string; user?: { id: string } };
    if (!res.ok || !body.access_token || !body.user) {
      throw new Error(`login ${email}: HTTP ${res.status}`);
    }
    return { jwt: body.access_token, sub: body.user.id };
  };

  const a = await token(ALUMNO_A);
  const b = await token(ALUMNO_B);

  const pedir = async (jwt: string, path: string): Promise<unknown> => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: ANON, Authorization: `Bearer ${jwt}` },
    });
    return res.json();
  };

  const perfiles = (await pedir(a.jwt, 'user_profiles?select=id,userId')) as Array<{
    id: string;
    userId: string;
  }>;
  const ajenos = Array.isArray(perfiles) ? perfiles.filter((f) => f.userId !== a.sub) : [];
  record(
    'C4-perfiles-aislados',
    Array.isArray(perfiles) && ajenos.length === 0,
    Array.isArray(perfiles)
      ? `alumno A recibe ${perfiles.length} fila(s), ${ajenos.length} ajena(s) — cuerpo: ${JSON.stringify(perfiles).slice(0, 140)}`
      : `respuesta inesperada: ${JSON.stringify(perfiles).slice(0, 180)}`
  );
  // Que la API devuelva LO PROPIO: un verde por API muda no prueba aislamiento.
  record(
    'C4-la-api-no-esta-muda',
    Array.isArray(perfiles) && perfiles.some((f) => f.userId === a.sub),
    Array.isArray(perfiles) && perfiles.some((f) => f.userId === a.sub)
      ? 'el alumno A sí ve su propia fila: el verde de arriba es aislamiento real, no una API vacía'
      : 'el alumno A no ve ni su propia fila — el verde anterior no probaría nada'
  );

  // Escritura ajena: intentar cambiar el nombre del OTRO alumno.
  const escritura = await fetch(
    `${SUPABASE_URL}/rest/v1/user_profiles?id=eq.rlsprobe_alumnob`,
    {
      method: 'PATCH',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${a.jwt}`,
        'content-type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ displayName: 'INTRUSO G73B' }),
    }
  );
  const cuerpoEscritura = await escritura.text();
  const escrituraBloqueada = escritura.status >= 400 || cuerpoEscritura.trim() === '[]';
  record(
    'C4-escritura-ajena-bloqueada',
    escrituraBloqueada,
    `PATCH del perfil ajeno → HTTP ${escritura.status}, cuerpo ${cuerpoEscritura.slice(0, 90) || '(vacío)'}`
  );

  const respuestas = (await pedir(b.jwt, 'session_answers?select=id&limit=5')) as unknown[];
  record(
    'C4-respuestas-ajenas-invisibles',
    Array.isArray(respuestas) && respuestas.length === 0,
    `alumno B ve ${Array.isArray(respuestas) ? respuestas.length : '?'} respuesta(s) de examen ajenas`
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// C2 — RECUPERACIÓN DE CONTRASEÑA
// ═══════════════════════════════════════════════════════════════════════════
async function c2Recuperacion(browser: Browser): Promise<void> {
  paso(`C2: ${LIMITE_RESET + 1} solicitudes de recuperación (dirección inexistente: no sale ningún correo)`);
  const { context, page } = await nuevaSesion(browser);
  const textos: string[] = [];
  try {
    for (let i = 1; i <= LIMITE_RESET + 1; i++) {
      await abrir(page, '/recuperar-password');
      await page.getByLabel(/correo/i).fill(CORREO_RESET);
      await page.getByRole('button', { name: /enviar enlace/i }).click();
      // El éxito SUSTITUYE el formulario por un `role="status"`; el bloqueo
      // pinta un `role="alert"` dentro del formulario. Se espera por el TEXTO
      // de cualquiera de los dos, no por el rol (ver `esperarMensaje`).
      const texto = await esperarMensaje(page, RESPUESTA_RESET);
      textos.push(texto);
      console.log(`    solicitud ${i} → ${esBloqueo(texto) ? 'BLOQUEADA' : 'respuesta genérica'}`);
      if (esBloqueo(texto)) break;
    }
  } finally {
    await context.close();
  }

  const bloqueo = textos.findIndex(esBloqueo);
  record(
    'C2-recuperacion-bloquea',
    bloqueo >= 0,
    bloqueo >= 0
      ? `bloqueada en la solicitud ${bloqueo + 1} (presupuesto ${LIMITE_RESET})`
      : `${textos.length} solicitudes SIN bloqueo — el formulario sigue siendo un cañón de correo`
  );
  const genericaAntes = textos
    .slice(0, Math.max(bloqueo, 0))
    .some((t) => /Si el correo existe/i.test(t));
  record(
    'C2-no-filtra-si-el-correo-existe',
    genericaAntes,
    genericaAntes
      ? 'las solicitudes previas devuelven la respuesta genérica (no revela si la cuenta existe)'
      : 'no se observó la respuesta genérica antes del bloqueo'
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// C1 — LOGIN (al final: agota el presupuesto por IP)
// ═══════════════════════════════════════════════════════════════════════════
async function c1Login(browser: Browser): Promise<void> {
  paso(`C1: hasta ${LIMITE_LOGIN + 1} intentos de login con contraseña incorrecta`);
  const { context, page } = await nuevaSesion(browser);
  const mensajes: string[] = [];
  try {
    for (let i = 1; i <= LIMITE_LOGIN + 1; i++) {
      await abrir(page, '/login');
      await page.getByLabel(/correo/i).fill(ALUMNO_A);
      await page.getByLabel(/contraseña/i).fill(`g73b-incorrecta-${i}`);
      await page.getByRole('button', { name: /iniciar sesión/i }).click();
      const msg = await esperarMensaje(page, RESPUESTA_LOGIN);
      mensajes.push(msg);
      console.log(`    intento ${String(i).padStart(2)} → ${msg}`);
      if (esBloqueo(msg)) break;
    }
  } finally {
    await context.close();
  }

  const bloqueo = mensajes.findIndex(esBloqueo);
  record(
    'C1-login-bloquea',
    bloqueo >= 0,
    bloqueo >= 0
      ? `bloqueado en el intento ${bloqueo + 1} (presupuesto ${LIMITE_LOGIN}): "${mensajes[bloqueo]}"`
      : `${mensajes.length} intentos fallidos SIN bloqueo — la fuerza bruta de contraseñas no tiene freno`
  );
  record(
    'C1-el-legitimo-no-queda-fuera',
    bloqueo !== 0,
    bloqueo === 0
      ? 'bloqueó en el PRIMER intento: quien teclea mal una vez queda fuera'
      : 'los intentos previos reciben el error genérico "Correo o contraseña incorrectos"'
  );
  const generico = mensajes.some((m) => /Correo o contraseña incorrectos/i.test(m));
  record(
    'C1-no-revela-que-cuenta-existe',
    generico,
    generico
      ? 'el error previo al bloqueo es genérico (no dice si falló el correo o la contraseña)'
      : 'no se observó el error genérico: la prueba no estaba ejercitando el login'
  );
}

// ═══════════════════════════════════════════════════════════════════════════
async function main(): Promise<void> {
  if (!PASSWORD) {
    console.error('Falta G73B_PROBE_PASSWORD.');
    process.exitCode = 1;
    return;
  }

  const [{ rol }] = await prisma.$queryRaw<Array<{ rol: string }>>`SELECT current_user AS rol`;
  const ip = await ipPublica();
  console.log(`\nG73b — re-verificación de los controles de G65 contra ${BASE}`);
  console.log(`Rol de base de datos para la higiene de cubos: ${rol}`);
  console.log(`IP pública de esta máquina: ${ip || '(desconocida)'}\n`);

  const claves = await limpiarCubos(ip);
  console.log(`Cubos borrados antes de empezar (${claves.length}):`);
  for (const k of claves) console.log(`  · ${k}`);

  const browser = await chromium.launch();
  try {
    await c3CanjeParental(browser);
    await c4Aislamiento();
    await c2Recuperacion(browser);
    await c1Login(browser); // el último: agota el presupuesto de login por IP
  } finally {
    await browser.close();
  }

  console.log('\n┌─ Resultado ────────────────────────────────────────────────');
  for (const r of results) console.log(`│ ${r.ok ? '✅' : '❌'} ${r.id.padEnd(32)} ${r.detalle}`);
  console.log('└────────────────────────────────────────────────────────────');

  // Una sonda SIEMPRE borra lo que crea (regla de G65).
  await limpiarCubos(ip);
  console.log('\nCubos de la sonda borrados al terminar.');

  const rojos = results.filter((r) => !r.ok);
  if (rojos.length > 0) {
    console.error(`\n✗ ${rojos.length} control(es) en rojo contra producción real.`);
    process.exitCode = 1;
    return;
  }
  console.log('\n✓ Los controles de G65 bloquean de verdad en producción.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
