import { expect, test, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { payOnFakeCheckout } from './support/fixtures';
import { passwordOf, PERSONAS, type PersonaName } from './support/personas';
import { contextAs, db, profileId, watchConsole } from './support/session';
import { readStackFile } from './support/stack-env';

/**
 * Flujo 3 — un curso de punta a punta. El profesor lo crea, sube portada y
 * video, arma módulos y lecciones y lo envía; el admin maestro lo publica; un
 * alumno lo compra (simulador de Stripe + webhook), ve el contenido, avanza y
 * califica. Un alumno NO inscrito no puede sacar el video de Storage aunque
 * conozca la ruta: se prueba POR EFECTO contra el Storage local con su propia
 * sesión, con control positivo (el inscrito sí puede).
 *
 * Única concesión: la regla «≥ 5 min de video» (probada en unidad) se cumple
 * ajustando la duración en la base local, para no grabar 5 minutos aquí.
 */
test.describe.configure({ mode: 'serial' });

const TITLE = 'Álgebra desde cero para regularizar';
let courseId = '';
let slug = '';
let videoPath = '';

/** Un WebM real de ~1.5 s y una portada PNG, generados por el propio navegador. */
async function makeMedia(page: Page) {
  return page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext('2d')!;
    const stream = canvas.captureStream(15);
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    const done = new Promise<void>((r) => (rec.onstop = () => r()));
    rec.start();
    let f = 0;
    const timer = setInterval(() => {
      ctx.fillStyle = `hsl(${(f++ * 12) % 360} 70% 50%)`;
      ctx.fillRect(0, 0, 320, 180);
    }, 60);
    await new Promise((r) => setTimeout(r, 1500));
    clearInterval(timer);
    rec.stop();
    await done;
    const toB64 = async (b: Blob) => {
      const bytes = new Uint8Array(await b.arrayBuffer());
      let s = '';
      for (const x of bytes) s += String.fromCharCode(x);
      return btoa(s);
    };
    ctx.fillStyle = '#7C3AED';
    ctx.fillRect(0, 0, 320, 180);
    const png = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/png'));
    return { webm: await toB64(new Blob(chunks, { type: 'video/webm' })), png: await toB64(png) };
  });
}

/** Sesión de Storage del alumno, contra el Auth LOCAL, para probar la política por efecto. */
async function storageAs(name: PersonaName) {
  const stack = readStackFile();
  const sb = createClient(stack.API_URL, stack.ANON_KEY, { auth: { persistSession: false } });
  const { error } = await sb.auth.signInWithPassword({ email: PERSONAS[name].email, password: passwordOf(name) });
  if (error) throw error;
  return sb.storage.from('course-videos');
}

test('el profesor crea el curso, sube portada y video, arma el contenido y lo envía', async ({ browser }) => {
  const { context, page } = await contextAs(browser, 'profe', { viewport: { width: 1440, height: 900 } });
  const consola = watchConsole(page);
  await page.goto('/profesor/cursos');
  await page.getByLabel('Título').fill(TITLE);
  await page.getByLabel('Descripción corta (para la tarjeta del catálogo)').fill('Álgebra paso a paso para pasar la materia.');
  await page.getByLabel('Descripción completa').fill('Un curso completo de álgebra para regularizar la materia: ecuaciones, factorización y problemas resueltos paso a paso.');
  await page.getByLabel('Lo que aprenderán (uno por renglón, máx. 10)').fill('Resolver ecuaciones lineales\nFactorizar trinomios');
  await page.getByLabel('Categoría').selectOption('REGULARIZACION');
  await page.getByLabel('Materia (ej. matematicas)').fill('matematicas');
  await page.getByLabel('Precio en pesos (99 a 9,999)').fill('299');
  await page.getByRole('checkbox', { name: /Acepto las condiciones de contenido/ }).check();
  await page.getByRole('button', { name: 'Crear curso' }).click();
  await page.waitForURL(/\/profesor\/cursos\/c[a-z0-9]+$/);
  courseId = page.url().split('/').pop()!;

  const media = await makeMedia(page);
  await page.getByLabel(/^Imagen de portada/).setInputFiles({ name: 'portada.png', mimeType: 'image/png', buffer: Buffer.from(media.png, 'base64') });
  await page.getByRole('button', { name: 'Subir' }).first().click();
  await expect(page.getByText('Archivo guardado.')).toBeVisible();

  await page.getByLabel('Nuevo módulo').fill('Módulo 1: Ecuaciones');
  await page.getByRole('button', { name: 'Agregar módulo' }).click();
  const mod = page.getByRole('region', { name: 'Módulo: Módulo 1: Ecuaciones' });
  await expect(mod).toBeVisible();

  await mod.getByLabel('Nueva lección').fill('1.1 Qué es una ecuación');
  await mod.getByRole('button', { name: 'Agregar lección' }).click();
  await mod.locator('button[aria-expanded]', { hasText: '1.1 Qué es una ecuación' }).click();
  await mod.getByLabel('Video de la lección').setInputFiles({ name: 'clase.webm', mimeType: 'video/webm', buffer: Buffer.from(media.webm, 'base64') });
  await mod.getByRole('button', { name: 'Subir', exact: true }).last().click();
  await expect(mod.getByText('Archivo guardado.')).toBeVisible();

  await mod.getByLabel('Nueva lección').fill('1.2 Lectura: despejes');
  await mod.getByLabel('Tipo').selectOption('TEXT');
  await mod.getByRole('button', { name: 'Agregar lección' }).click();
  await mod.locator('button[aria-expanded]', { hasText: '1.2 Lectura: despejes' }).click();
  await mod.getByLabel('Texto de la lección (se muestra tal cual)').fill('Para despejar x, aplica la operación inversa en ambos lados.\n<script>alert(1)</script>');
  await mod.getByRole('button', { name: 'Guardar texto' }).click();
  await expect(mod.getByRole('button', { name: 'Guardar texto' })).toBeDisabled();

  const video = await db().courseLesson.findFirstOrThrow({ where: { module: { courseId }, type: 'VIDEO' } });
  expect(video.videoPath).toMatch(new RegExp(`^courses/${courseId}/lessons/[0-9a-f-]{36}\\.webm$`));
  expect(video.videoDurationSeconds ?? 0).toBeGreaterThan(0); // la duración real del WebM (Infinity en la cabecera)
  videoPath = video.videoPath!;
  await db().courseLesson.update({ where: { id: video.id }, data: { videoDurationSeconds: 600 } });

  await page.reload();
  await page.getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect.poll(async () => (await db().course.findUniqueOrThrow({ where: { id: courseId } })).status).toBe('IN_REVIEW');
  consola.expectClean();
  await context.close();
});

test('el admin maestro revisa y publica el curso (queda en la bitácora)', async ({ browser }) => {
  const { context, page } = await contextAs(browser, 'admin', { viewport: { width: 1440, height: 900 } });
  const consola = watchConsole(page);
  await page.goto('/admin/cursos');
  await page.getByRole('link', { name: new RegExp(TITLE) }).click();
  await page.getByRole('button', { name: 'Publicar' }).click();
  await page.getByLabel('Motivo (queda en la bitácora)').fill('Contenido original, audio y video correctos');
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Listo.')).toBeVisible();
  const course = await db().course.findUniqueOrThrow({ where: { id: courseId } });
  expect(course.status).toBe('PUBLISHED');
  slug = course.slug;
  const audit = await db().adminAuditLog.findFirst({ where: { action: 'course.reviewed' }, orderBy: { createdAt: 'desc' } });
  expect(audit?.metadata).toMatchObject({ outcome: 'applied', to: 'PUBLISHED' });
  consola.expectClean();
  await context.close();
});

test('un alumno NO inscrito no obtiene el video: ni en la pantalla ni directo de Storage', async ({ browser }) => {
  const { context, page } = await contextAs(browser, 'libre', { viewport: { width: 1440, height: 900 } });
  await page.goto(`/aprender/${slug}`);
  await expect(page.locator('video[src]')).toHaveCount(0);
  const storage = await storageAs('libre');
  const { data, error } = await storage.download(videoPath);
  expect(data).toBeNull();
  expect(error).not.toBeNull();
  // Tampoco por la URL pública: el bucket es privado.
  const pub = await page.request.get(`${readStackFile().API_URL}/storage/v1/object/public/course-videos/${videoPath}`);
  expect(pub.ok()).toBe(false);
  await context.close();
});

test('un alumno lo compra, lo ve, avanza y lo califica', async ({ browser }) => {
  const { context, page } = await contextAs(browser, 'premium', { viewport: { width: 1440, height: 900 } });
  const consola = watchConsole(page);
  // Un curso inexistente es un 404 REAL (no «no encontrado» con estado 200).
  expect((await page.request.get('/cursos/no-existe-este-curso')).status()).toBe(404);
  await page.goto(`/cursos/${slug}`);
  await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();
  // Sin la casilla del art. 56 no se abre el pago.
  await page.getByRole('button', { name: 'Comprar curso — $299' }).click();
  await expect(page).toHaveURL(new RegExp(`/cursos/${slug}`));
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Comprar curso — $299' }).click();
  await payOnFakeCheckout(page);
  await expect(page.getByText('¡Listo! Ya tienes el curso')).toBeVisible();

  const enrollment = await db().courseEnrollment.findFirstOrThrow({ where: { courseId, userProfileId: profileId('premium') } });
  expect(enrollment).toMatchObject({ status: 'ACTIVE', pricePaidCents: 29_900, teacherPayCents: 22_425, commissionCents: 7_475 });
  expect(enrollment.consentAt).not.toBeNull();

  // Control positivo de la política de Storage: el inscrito sí puede.
  const { data } = await (await storageAs('premium')).download(videoPath);
  expect(data?.size ?? 0).toBeGreaterThan(1000);

  await page.goto(`/aprender/${slug}`);
  const v = page.locator('video[src]');
  await expect(v).toHaveCount(1);
  await v.evaluate(async (el: HTMLVideoElement) => {
    el.muted = true;
    await new Promise<void>((resolve) => {
      el.addEventListener('ended', () => resolve(), { once: true });
      void el.play();
    });
  });
  await expect.poll(async () => (await db().courseLessonProgress.count({ where: { enrollmentId: enrollment.id, completed: true } }))).toBe(1);

  await page.getByRole('button', { name: 'Siguiente lección' }).click();
  // El texto se pinta tal cual: el <script> es texto, no se ejecuta.
  await expect(page.getByText('<script>alert(1)</script>')).toBeVisible();
  await page.getByRole('button', { name: 'Marcar como completada' }).click();
  await expect.poll(async () => (await db().courseEnrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).progressPercent).toBe(100);

  await page.getByLabel('5 de 5').click();
  await page.getByPlaceholder('¿Qué te pareció? (opcional)').fill('Muy claro, me ayudó con los despejes.');
  await page.getByRole('button', { name: 'Enviar calificación' }).click();
  await expect(page.getByText('Gracias por tu opinión.')).toBeVisible();
  expect((await db().courseEnrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).rating).toBe(5);
  consola.expectClean();
  await context.close();
});
