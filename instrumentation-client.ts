import {
  SENTRY_DENY_URLS,
  SENTRY_ENVIRONMENT,
  SENTRY_IGNORE_ERRORS,
  SENTRY_TRACES_SAMPLE_RATE,
  isFromBrowserExtension,
  isSentryConfigured,
} from '@/lib/observability/sentry-shared';

/**
 * Monitoreo de errores del CLIENTE (F20 tarea 1). Convención de archivo de
 * Next.js 15.3+: se carga automáticamente antes de que la app hidrate, sin
 * necesidad de importarlo a mano en `app/layout.tsx`.
 *
 * G62 (rendimiento): `@sentry/nextjs` en el navegador pesa ~40KB gzip y hasta
 * ahora viajaba en el bundle inicial de CADA página aunque el DSN sea todavía
 * un placeholder (`Sentry.init({ dsn: undefined })` quedaba inerte pero el SDK
 * ya se había descargado y parseado). Ahora el SDK se importa de forma
 * DINÁMICA y solo si hay un DSN real — mientras Sentry no esté activado, el
 * costo en el cliente es cero. En cuanto `NEXT_PUBLIC_SENTRY_DSN` tenga un
 * valor real (el único cambio de env que anticipa docs/ESTADO.md), el import
 * se dispara solo y el comportamiento vuelve a ser idéntico al de F20.
 *
 * Sin Session Replay a propósito: capturaría pantalla del alumno (reactivos,
 * datos de perfil) — no forma parte de esta fase para no arriesgar exponer
 * contenido sensible sin un flujo de consentimiento explícito.
 */

type SentryModule = typeof import('@sentry/nextjs');

let sentryPromise: Promise<SentryModule> | null = null;

function loadSentry(): Promise<SentryModule> | null {
  if (!isSentryConfigured()) return null;
  sentryPromise ??= import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: SENTRY_ENVIRONMENT,
      tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
      // Nunca adjuntar IP/cookies/headers automáticamente (CLAUDE.md: nunca PII
      // de más). `Sentry.setUser` en los layouts solo manda el id interno.
      sendDefaultPii: false,
      ignoreErrors: SENTRY_IGNORE_ERRORS,
      denyUrls: SENTRY_DENY_URLS,
      beforeSend(event) {
        if (isFromBrowserExtension(event)) return null;
        return event;
      },
    });
    return Sentry;
  });
  return sentryPromise;
}

loadSentry();

// Requerido por el SDK para instrumentar navegaciones del App Router (spans de
// transición entre rutas). Sin DSN real es un no-op puro; con DSN el módulo ya
// está resuelto (lo cargó `loadSentry()` arriba) así que el `then` corre en el
// mismo microtask.
export function onRouterTransitionStart(
  ...args: Parameters<SentryModule['captureRouterTransitionStart']>
): void {
  void loadSentry()?.then((Sentry) => Sentry.captureRouterTransitionStart(...args));
}
