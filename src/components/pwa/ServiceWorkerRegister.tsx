'use client';

import { useEffect } from 'react';
import { SESSION_PERSISTENCE } from '@/lib/auth/session-policy';

/**
 * Registra el service worker (F17 tarea 1). Montado una vez en el layout
 * raíz — silencioso: si el navegador no soporta service workers o el
 * registro falla, la app sigue funcionando normal, solo sin capacidad
 * offline (degradación graciosa, mismo criterio que el resto del proyecto).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    // G100: el modo de sesión viaja en la URL del script — el worker no puede
    // leer variables de entorno. Cambiar de modo cambia la URL, y el navegador
    // instala el worker nuevo, que borra lo que el modo anterior guardó.
    const url = SESSION_PERSISTENCE === 'persistent' ? '/sw.js?modo=persistente' : '/sw.js';
    navigator.serviceWorker.register(url).catch(() => {});
  }, []);

  return null;
}
