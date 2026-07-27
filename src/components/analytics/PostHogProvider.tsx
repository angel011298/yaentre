'use client';

import { useEffect, type ReactNode } from 'react';
import { loadPostHog } from '@/lib/analytics/client';

/**
 * Analítica de producto — lado CLIENTE (F20 tarea 2). Envuelve toda la app
 * desde `app/layout.tsx` para arrancar la captura de vistas de página
 * (`capture_pageview`), que arma el embudo previo al registro.
 *
 * `autocapture: false`/`disable_session_recording: true` A PROPÓSITO (ver
 * `loadPostHog`): el autocapture de PostHog manda el texto de cualquier
 * elemento clickeado — en un examen eso incluiría el enunciado y las
 * opciones del reactivo. El embudo real se manda explícito desde
 * `src/lib/analytics/server.ts` (más confiable de todos modos: no depende de
 * que el JS del cliente cargue ni de que un adblocker no lo bloquee).
 *
 * No usa el `PostHogProvider`/contexto de `posthog-js/react`: nada en el
 * código llama a `usePostHog()` todavía, así que esa capa solo agregaba peso
 * al bundle sin aportar nada — `loadPostHog()` ya deja la instancia lista
 * para cualquier `posthog.capture(...)` directo si hiciera falta.
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    loadPostHog();
  }, []);

  return <>{children}</>;
}
