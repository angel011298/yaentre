/**
 * Configuración compartida de Sentry (F20) entre cliente, servidor y edge —
 * un solo lugar para el filtrado de ruido, así los 3 entrypoints
 * (`instrumentation-client.ts`, `instrumentation.ts`) nunca divergen.
 *
 * Si `NEXT_PUBLIC_SENTRY_DSN` no está configurado (placeholder o vacío),
 * `Sentry.init({ dsn: '' })` queda inerte sin lanzar — así esta fase deja
 * todo listo para activarse por variable de entorno en cuanto exista un DSN
 * real, sin bloquear el resto del trabajo (pendiente documentado en
 * docs/ESTADO.md).
 */

/**
 * Ruido típico que NO debe llenar Sentry de alertas falsas: errores
 * inyectados por extensiones del navegador del usuario (nunca son culpa de
 * la app), y un puñado de mensajes ampliamente documentados como benignos
 * en cualquier app web real.
 */
export const SENTRY_IGNORE_ERRORS: Array<string | RegExp> = [
  // Extensiones del navegador (adblockers, gestores de contraseñas, etc.)
  'top.GLOBALS',
  'originalCreateNotification',
  'canvas.contentDocument',
  'MyApp_RemoveAllHighlights',
  'atomicFindClose',
  /conduitPage/,
  'fb_xd_fragment',
  // Ruido de red típico de extensiones/adblockers, no de la app.
  'Non-Error promise rejection captured',
  // Benigno y ampliamente documentado (Chrome): no afecta al usuario.
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications',
  // Error genérico sin stack que lanzan navegadores ante scripts cross-origin
  // (casi siempre un script de terceros, nunca código propio con sourcemap).
  'Script error.',
  // Cancelaciones de navegación normales (el usuario cambió de página a
  // medio fetch) — no es un fallo real de la app.
  'AbortError',
  'The user aborted a request',
];

/** Nunca reportar excepciones cuyo origen sea una extensión instalada por el usuario. */
export const SENTRY_DENY_URLS: RegExp[] = [
  /^chrome-extension:\/\//i,
  /^moz-extension:\/\//i,
  /^safari-extension:\/\//i,
  /^safari-web-extension:\/\//i,
  /^extension:\/\//i,
];

/** ¿El evento viene íntegramente de una extensión del navegador? Defensa adicional
 *  a `denyUrls` (que depende de que el SDK detecte bien la URL "culpable"). */
export function isFromBrowserExtension(event: { exception?: { values?: Array<{ stacktrace?: { frames?: Array<{ filename?: string }> } }> } }): boolean {
  const frames = event.exception?.values?.[0]?.stacktrace?.frames;
  if (!frames || frames.length === 0) return false;
  return frames.every((f) => f.filename && SENTRY_DENY_URLS.some((re) => re.test(f.filename!)));
}

/**
 * ¿Hay un DSN de Sentry REAL configurado? (no vacío, no el placeholder de
 * `.env.example`). G62 (rendimiento): el cliente usa esto para NO importar
 * dinámicamente el SDK del navegador (~40KB gzip) cuando Sentry todavía no
 * está activado — hoy el DSN es placeholder, así que el SDK viajaba en cada
 * página sin capturar nada. En cuanto exista un DSN real (el único cambio de
 * env que anticipa docs/ESTADO.md) el import se dispara solo.
 */
export function isSentryConfigured(dsn: string | undefined = process.env.NEXT_PUBLIC_SENTRY_DSN): boolean {
  return Boolean(dsn) && !dsn!.startsWith('your-') && !dsn!.includes('placeholder');
}

export const SENTRY_ENVIRONMENT =
  process.env.VERCEL_ENV ?? (process.env.NODE_ENV === 'production' ? 'production' : 'development');

/** Muestreo de trazas de rendimiento — bajo en producción para no gastar cuota. */
export const SENTRY_TRACES_SAMPLE_RATE = SENTRY_ENVIRONMENT === 'production' ? 0.1 : 1.0;
