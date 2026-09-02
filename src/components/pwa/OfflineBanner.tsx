'use client';

import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

/** SSR-safe, mismo patrón que `useIsMobile` de `SimulatorPreflight.tsx` (F12):
 *  `navigator.onLine` no existe en el servidor, así que el snapshot de
 *  servidor asume "en línea" (no hay forma correcta de saberlo ahí). */
function useIsOffline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !navigator.onLine,
    () => false
  );
}

/**
 * Aviso de "sin conexión" (F17 tarea 1): el tablero sigue mostrando los
 * últimos datos que el service worker guardó en caché, pero el alumno debe
 * saber que no está viendo lo más reciente.
 */
export function OfflineBanner() {
  const offline = useIsOffline();
  if (!offline) return null;

  return (
    <div
      role="status"
      className="border-b border-warning/40 bg-warning/15 px-4 py-2 text-center text-sm font-semibold text-warning"
    >
      <span aria-hidden>📡 </span>Sin conexión — viendo tus últimos datos guardados.
    </div>
  );
}
