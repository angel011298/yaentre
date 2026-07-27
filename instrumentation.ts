import * as Sentry from '@sentry/nextjs';
import {
  SENTRY_DENY_URLS,
  SENTRY_ENVIRONMENT,
  SENTRY_IGNORE_ERRORS,
  SENTRY_TRACES_SAMPLE_RATE,
} from '@/lib/observability/sentry-shared';

/**
 * Monitoreo de errores del SERVIDOR (F20 tarea 1). Convención de archivo
 * `instrumentation.ts` de Next.js — `register()` corre una vez al arrancar
 * cada runtime, ANTES de servir la primera petición, tanto en Node
 * (Server Actions, Route Handlers, RSC) como en Edge (`proxy.ts`).
 *
 * Mismo criterio que el cliente: `dsn` vacío deja el SDK inerte, listo para
 * activarse por variable de entorno.
 */
export async function register() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    sendDefaultPii: false,
    ignoreErrors: SENTRY_IGNORE_ERRORS,
    denyUrls: SENTRY_DENY_URLS,
  });
}

/**
 * Hook de Next.js 15+ (App Router): captura errores no manejados de Server
 * Components, Server Actions y Route Handlers — el equivalente servidor del
 * error boundary de React del lado cliente. Sin esto, un throw en una Server
 * Action solo se ve en los logs de Vercel, nunca en Sentry.
 */
export const onRequestError = Sentry.captureRequestError;
