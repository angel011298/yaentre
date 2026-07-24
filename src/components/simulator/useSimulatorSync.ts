'use client';

import { useCallback, useEffect, useRef } from 'react';
import { SYNC_FLUSH_INTERVAL_MS } from '@/lib/simulator/config';
import { useSimulatorStore } from '@/lib/stores/simulatorStore';

const SYNC_URL = '/api/simulator/sync';

/**
 * Resiliencia del simulador (F12 tarea 6). Persiste la cola local de respuestas
 * del store por tres vías: flush periódico, reintento al reconectar, y
 * `sendBeacon` cuando la página se oculta o se cierra (para no perder nada aún
 * durante el cierre del navegador). `flushNow` se `await`-ea antes de terminar
 * para garantizar que la última respuesta llegó al servidor antes de puntuar.
 */
export function useSimulatorSync() {
  const inFlight = useRef(false);
  const lastSent = useRef('');

  const flushNow = useCallback(async () => {
    const store = useSimulatorStore.getState();
    const body = store.syncSnapshot();
    const serialized = JSON.stringify(body);
    // Nada nuevo que enviar desde la última vez.
    if (serialized === lastSent.current) return;
    if (inFlight.current) return;

    inFlight.current = true;
    try {
      const res = await fetch(SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: serialized,
        keepalive: true,
      });
      if (res.ok) {
        lastSent.current = serialized;
        store.confirmSynced(body.answers);
      }
    } catch {
      // Offline / red caída: la cola queda intacta y se reintenta al reconectar.
    } finally {
      inFlight.current = false;
    }
  }, []);

  const beacon = useCallback(() => {
    const body = useSimulatorStore.getState().syncSnapshot();
    try {
      navigator.sendBeacon(
        SYNC_URL,
        new Blob([JSON.stringify(body)], { type: 'application/json' })
      );
    } catch {
      // sendBeacon no disponible: el flush periódico o el reintento cubren el caso.
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => void flushNow(), SYNC_FLUSH_INTERVAL_MS);

    const onOnline = () => {
      useSimulatorStore.getState().setOnline(true);
      void flushNow();
    };
    const onOffline = () => useSimulatorStore.getState().setOnline(false);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') beacon();
    };
    const onHide = () => beacon();

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [flushNow, beacon]);

  return { flushNow, beacon };
}
