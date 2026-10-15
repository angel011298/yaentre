/**
 * G100 — ¿La petición viene de una página de este mismo sitio?
 *
 * Lo usa el cierre de sesión (`app/auth/salir/route.ts`), que es un Route
 * Handler y no una Server Action: las acciones traen la validación de `Origin`
 * de Next, los Route Handlers no. Sin esto, cualquier página de terceros
 * podría cerrar la sesión de un alumno con un formulario oculto — y, en modo
 * efímero, además borrarle todo lo que el sitio guardó en su navegador.
 *
 * `Sec-Fetch-Site` lo pone el NAVEGADOR y una página no lo puede falsear; es
 * la señal preferida. Sin ella (navegadores viejos), se compara `Origin` con
 * el host de la petición. Sin ninguna de las dos se rechaza: un formulario
 * real de un navegador real siempre manda al menos una.
 */
export function isSameOriginRequest(headers: { get(name: string): string | null }): boolean {
  const site = headers.get('sec-fetch-site');
  if (site) return site === 'same-origin';

  const origin = headers.get('origin');
  const host = headers.get('x-forwarded-host') ?? headers.get('host');
  if (!origin || !host || origin === 'null') return false;
  try {
    return new URL(origin).host === host.split(',')[0].trim();
  } catch {
    return false;
  }
}
