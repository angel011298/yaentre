'use client';

import { useEffect } from 'react';

/**
 * Registra el service worker (F17 tarea 1). Montado una vez en el layout
 * raíz — silencioso: si el navegador no soporta service workers o el
 * registro falla, la app sigue funcionando normal, solo sin capacidad
 * offline (degradación graciosa, mismo criterio que el resto del proyecto).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  return null;
}
