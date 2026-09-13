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
 * entonces viajaba en el bundle inicial de CADA página aunque el DSN fuera un
 * placeholder. Se pasó a import DINÁMICO y solo con DSN real.
 *
 * ── G74: el import dinámico no bastó una vez que el DSN fue REAL ────────────
 *
 * G70 cargó el DSN de verdad, así que desde entonces `loadSentry()` se
 * ejecutaba en la evaluación del módulo — es decir, **antes del primer pintado
 * con contenido**. Medido con Lighthouse móvil contra `https://yaentre.com`
 * (G74): el chunk de Sentry son 172 KB transferidos, 132 KB de ellos sin usar,
 * y 227 ms de CPU que competían con la hidratación justo en la ventana en la
 * que el navegador tenía que pintar. El síntoma era un LCP **bimodal**: cuando
 * la red iba rápida y el JS llegaba ANTES de que el navegador alcanzara a
 * pintar, el primer pintado con contenido se iba de ~940 ms a ~1 560 ms y el
 * puntaje del dashboard caía de 95 a 83. Cuando la red iba lenta, el navegador
 * pintaba primero y el puntaje salía alto. Un cuello de botella que mejora al
 * empeorar la red es, casi siempre, JS en el camino crítico.
 *
 * La corrección NO es cargar menos Sentry: es cargarlo cuando el navegador ya
 * no tiene nada mejor que hacer (`requestIdleCallback`). Y como eso abre una
 * ventana de unos cientos de milisegundos en la que el SDK aún no existe, esa
 * ventana **no queda sin vigilancia**: se instalan de inmediato dos escuchas
 * mínimas (`error` y `unhandledrejection`) que guardan lo que ocurra y lo
 * reenvían en cuanto el SDK está listo. Perder errores tempranos para ganar
 * 200 ms sería exactamente el trueque que G73b prohíbe — un control que deja
 * de reportar sin que nadie se entere.
 *
 * Sin Session Replay a propósito: capturaría pantalla del alumno (reactivos,
 * datos de perfil) — no forma parte de esta fase para no arriesgar exponer
 * contenido sensible sin un flujo de consentimiento explícito.
 */

type SentryModule = typeof import('@sentry/nextjs');

let sentryPromise: Promise<SentryModule> | null = null;

/**
 * Errores ocurridos antes de que el SDK existiera. Acotado: si algo falla en
 * bucle durante el arranque, esto no puede crecer sin control.
 */
const PENDIENTES_MAX = 10;
const pendientes: unknown[] = [];
let escuchasInstaladas = false;

function recordarTemprano(err: unknown): void {
  if (pendientes.length < PENDIENTES_MAX) pendientes.push(err);
  // Un error real no espera al idle: se fuerza la carga para reportarlo ya.
  void loadSentry();
}

function instalarEscuchasTempranas(): void {
  if (escuchasInstaladas || typeof window === 'undefined') return;
  escuchasInstaladas = true;
  window.addEventListener('error', (e: ErrorEvent) => recordarTemprano(e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) =>
    recordarTemprano(e.reason)
  );
}

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
    // Lo que ocurrió mientras el SDK no existía se reporta igual, etiquetado
    // para poder distinguirlo de lo que Sentry capturó por su cuenta.
    while (pendientes.length > 0) {
      const err = pendientes.shift();
      Sentry.captureException(err, { tags: { antes_de_sentry: 'true' } });
    }
    return Sentry;
  });
  return sentryPromise;
}

/**
 * Fuera del camino crítico. `requestIdleCallback` con `timeout` para que el
 * SDK cargue igual en una pestaña que nunca llega a estar ociosa; `setTimeout`
 * donde no exista (Safari < 16.4).
 */
function programarCargaOciosa(): void {
  if (typeof window === 'undefined') return;
  const idle = window.requestIdleCallback;
  if (typeof idle === 'function') idle(() => void loadSentry(), { timeout: 3_000 });
  else window.setTimeout(() => void loadSentry(), 1_500);
}

instalarEscuchasTempranas();
programarCargaOciosa();

// Requerido por el SDK para instrumentar navegaciones del App Router (spans de
// transición entre rutas). Sin DSN real es un no-op puro; si el SDK todavía no
// cargó, este `loadSentry()` lo fuerza — una navegación ya no es el primer
// pintado, así que aquí no hay nada que proteger.
export function onRouterTransitionStart(
  ...args: Parameters<SentryModule['captureRouterTransitionStart']>
): void {
  void loadSentry()?.then((Sentry) => Sentry.captureRouterTransitionStart(...args));
}
