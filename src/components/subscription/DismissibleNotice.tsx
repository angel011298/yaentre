'use client';

import { useState, useSyncExternalStore, type ReactNode } from 'react';

/**
 * Aviso que el alumno puede ocultar con «Ahora no» durante la pestaña actual.
 *
 * `sessionStorage` y no `localStorage`: es una comodidad de una sola visita,
 * no un dato de la persona, y con la sesión «sin rastro» de G100 nada de la
 * app debe sobrevivir al cierre del navegador. Todo acceso va en try/catch: en
 * modo privado puede lanzar, y entonces el aviso simplemente se muestra.
 *
 * `useSyncExternalStore` con instantánea de servidor `false`: el HTML del
 * servidor y la primera pasada del cliente coinciden (visible) y solo después
 * de hidratar se consulta el almacenamiento — sin desajuste de hidratación.
 */
function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

function readDismissed(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function DismissibleNotice({ storageKey, children }: { storageKey: string; children: ReactNode }) {
  const stored = useSyncExternalStore(
    subscribe,
    () => readDismissed(storageKey),
    () => false
  );
  const [dismissedNow, setDismissedNow] = useState(false);

  if (stored || dismissedNow) return null;

  return (
    <div>
      {children}
      <div className="mt-1 text-right">
        <button
          type="button"
          className="min-h-touch rounded-md px-3 text-sm font-medium text-text-secondary hover:bg-elevated hover:text-text-primary"
          onClick={() => {
            setDismissedNow(true);
            try {
              window.sessionStorage.setItem(storageKey, '1');
            } catch {
              /* sin almacenamiento: se oculta solo en esta vista */
            }
          }}
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
