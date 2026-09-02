'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { shouldShowInstallPrompt } from '@/lib/pwa/install-prompt';

const VISIT_KEY = 'yaentre:pwaVisitCount';
const DISMISS_KEY = 'yaentre:pwaInstallDismissedAt';

/** Evento no estandarizado (Chrome/Android) — sin tipo oficial en TS/DOM. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Invitación a instalar la PWA (F17 tarea 1): no invasiva — solo la SEGUNDA
 * visita, y si se descarta guarda la fecha para no volver a insistir en 7
 * días (`shouldShowInstallPrompt`, puro, F17). El conteo de visitas y la
 * fecha de descarte viven en `localStorage` a propósito: es estado de ESTE
 * dispositivo/navegador, no del usuario (CLAUDE.md prohíbe localStorage para
 * datos de sesión/sensibles — esto no lo es, es UX local no reproducible en
 * otro dispositivo por diseño).
 */
export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const visitCount = Number(localStorage.getItem(VISIT_KEY) ?? '0') + 1;
    localStorage.setItem(VISIT_KEY, String(visitCount));

    const dismissedRaw = localStorage.getItem(DISMISS_KEY);
    const dismissedAt = dismissedRaw ? Number(dismissedRaw) : null;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // Lectura de localStorage/matchMedia: no puede vivir en el cuerpo del
    // render (SSR no los tiene) ni es una suscripción a un evento externo —
    // es una sincronización de una sola vez al montar (mismo patrón que ya
    // usaba `ThemeToggle.tsx` antes de esta fase para lo mismo).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(shouldShowInstallPrompt({ visitCount, dismissedAt, isStandalone, now: Date.now() }));
  }, []);

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }

  async function install() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
    dismiss();
  }

  if (!visible) return null;

  return (
    // G62 (rendimiento): posición `fixed`. Antes vivía en el flujo, al inicio
    // de `<main>`, y como solo aparece TRAS hidratar (lee `localStorage` en un
    // efecto), empujaba todo el contenido del tablero/práctica hacia abajo al
    // montar — layout shift medido. Anclado sobre la `BottomNav` en móvil.
    <div
      role="dialog"
      aria-label="Instalar YaEntre"
      // G63: `bg-elevated` (superficie sólida, adaptable al tema) en vez de
      // `bg-brand-tint` (lila FIJO) — flotante `fixed`, necesita fondo opaco, y
      // en dark el texto blanco sobre el lila era invisible.
      className="fixed inset-x-0 bottom-24 z-30 mx-auto flex max-w-md items-start gap-3 rounded-lg border border-l-4 border-border-subtle border-l-brand bg-elevated p-4 shadow-md lg:bottom-4 lg:left-64"
    >
      <span className="text-2xl" aria-hidden>
        📲
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-text-primary">Instala YaEntre en tu celular</p>
        <p className="mt-1 text-sm text-text-secondary">
          Acceso directo desde tu pantalla de inicio, y tu tablero disponible aunque te quedes sin
          internet.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {deferredPrompt ? (
            <Button variant="primary" onClick={install}>
              Instalar
            </Button>
          ) : (
            <p className="text-xs text-text-muted">
              En iPhone: toca <strong>Compartir</strong> → <strong>Agregar a inicio</strong>.
            </p>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex min-h-touch items-center px-2 text-sm font-semibold text-text-muted hover:text-brand-soft"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
