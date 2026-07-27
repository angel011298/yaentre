import * as Sentry from '@sentry/nextjs';
import {
  SENTRY_DENY_URLS,
  SENTRY_ENVIRONMENT,
  SENTRY_IGNORE_ERRORS,
  SENTRY_TRACES_SAMPLE_RATE,
  isFromBrowserExtension,
} from '@/lib/observability/sentry-shared';

/**
 * Monitoreo de errores del CLIENTE (F20 tarea 1). Convención de archivo de
 * Next.js 15.3+: se carga automáticamente antes de que la app hidrate, sin
 * necesidad de importarlo a mano en `app/layout.tsx`.
 *
 * `dsn` vacío/placeholder (sin credenciales reales todavía, ver
 * docs/ESTADO.md) deja el SDK inerte sin lanzar — se activa solo con poner
 * `NEXT_PUBLIC_SENTRY_DSN` real en las variables de entorno, sin tocar código.
 *
 * Sin Session Replay a propósito: capturaría pantalla del alumno (reactivos,
 * datos de perfil) — no forma parte de esta fase para no arriesgar exponer
 * contenido sensible sin un flujo de consentimiento explícito.
 */
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

// Requerido por el SDK para instrumentar navegaciones del App Router
// (spans de transición entre rutas) — sin esto, Sentry solo ve cargas de
// página completas, nunca la navegación cliente-a-cliente de Next.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
