/**
 * Service worker mínimo (F17 tarea 1). Dos estrategias, nada más:
 *  - Navegaciones (HTML): network-first con respaldo a caché — el tablero
 *    principal (y cualquier otra pantalla de la app) queda disponible sin
 *    conexión mostrando la ÚLTIMA versión que sí cargó. `/simulador` es la
 *    EXCEPCIÓN explícita: nunca se sirve desde caché, nunca se cachea — sin
 *    conexión responde con una página de aviso, nunca con contenido viejo
 *    del examen (regla de negocio, no un descuido).
 *  - Assets estáticos de Next (`/_next/static`, `/_next/image`): cache-first
 *    (el nombre de archivo ya lleva el hash del contenido, así que cachear
 *    agresivo es seguro) — sin esto, el HTML cacheado de una navegación
 *    offline se vería sin estilos ni JS de hidratación.
 *
 * Nada de precaching, nada de Workbox: "capacidad MÍNIMA" es literal.
 */

const SHELL_CACHE = 'yaentre-shell-v2';

const OFFLINE_FALLBACK_HTML = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Sin conexión · YaEntre</title></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px;margin:96px auto;text-align:center;background:#0F0F14;color:#fff;padding:0 24px;">
  <h1 style="color:#7C3AED;">YaEntre</h1>
  <p>Estás sin conexión y todavía no guardamos una versión de esta pantalla en tu celular.</p>
  <p>Conéctate una vez para que quede disponible sin internet la próxima vez.</p>
</body>
</html>`;

const SIMULATOR_OFFLINE_HTML = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Sin conexión · YaEntre</title></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px;margin:96px auto;text-align:center;background:#0F0F14;color:#fff;padding:0 24px;">
  <h1 style="color:#7C3AED;">YaEntre</h1>
  <p><strong>El simulador necesita conexión a internet.</strong></p>
  <p>Es intencional: así como en el examen real, tus respuestas se guardan en el servidor al momento. Conéctate para empezar o continuar tu simulacro.</p>
</body>
</html>`;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isSimulatorPath(pathname) {
  return pathname === '/simulador' || pathname.startsWith('/simulador/') || pathname.startsWith('/simulador?');
}

/**
 * G99 — NADA DE /admin NI DE LA BÓVEDA SE GUARDA EN CACHÉ. NUNCA.
 *
 * El manejador de navegación de abajo metía en `SHELL_CACHE` la respuesta de
 * CUALQUIER navegación, `/admin/*` incluido. Eso escribía en el disco del
 * navegador el listado de usuarios, la bitácora y los nombres de los archivos
 * de la bóveda — y la Cache Storage SOBREVIVE al cierre de sesión, así que en
 * una computadora compartida el siguiente en usarla podía recuperarlos sin
 * credenciales.
 *
 * Peor aún: el botón «Descargar» es un `<a href>`, o sea `mode === 'navigate'`,
 * así que la respuesta de `/api/admin/vault/<id>` —el archivo entero— también
 * acababa cacheada, tirando por la borda las cabeceras `no-store` que el Route
 * Handler se toma el trabajo de mandar.
 *
 * `return` sin `respondWith`: la petición sigue su curso normal hacia la red.
 * No se intercepta, no se guarda, no hay respaldo sin conexión — que es lo
 * correcto: un panel de administración sin conexión no tiene sentido.
 */
function isPrivateAdminPath(pathname) {
  return (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname.startsWith('/api/admin/')
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // G99 — el panel de administración y la bóveda salen del service worker
  // ANTES de cualquier otra rama: ni se sirven desde caché ni se guardan en
  // ella. Va primero a propósito, para que ninguna rama posterior pueda
  // reintroducirlos por descuido.
  if (isPrivateAdminPath(url.pathname)) return;

  if (request.mode === 'navigate') {
    if (isSimulatorPath(url.pathname)) {
      event.respondWith(
        fetch(request).catch(
          () =>
            new Response(SIMULATOR_OFFLINE_HTML, {
              status: 503,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
        )
      );
      return;
    }

    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return (
            cached ||
            new Response(OFFLINE_FALLBACK_HTML, {
              status: 503,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
          );
        })
    );
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/_next/image')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
  }
});
