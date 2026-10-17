'use client';

import { useSyncExternalStore } from 'react';
import { Icon } from '@/components/ui/Icon';

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
      className="flex items-center justify-center gap-2 border-b border-warning/40 bg-warning/15 px-4 py-2 text-center text-sm font-semibold text-warning"
    >
      <Icon name="wifiOff" className="h-4 w-4" />
      {/* G101: sin «viendo tus últimos datos guardados» — en el modo sin
          rastro (G100) no se guarda ninguna pantalla en el dispositivo. */}
      Sin conexión — revisa tu internet para seguir estudiando.
    </div>
  );
}
