'use client';

import Link from 'next/link';
import { useLayoutEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

const CONSENT_STORAGE_KEY = 'yaentre-cookies-consent';

export function CookiesConsentBanner() {
  // G62: se RENDERIZA en el HTML inicial (arranca `undefined`, no `return
  // null`) — así es contenido temprano para LCP/Speed Index en vez de un
  // bloque que aparece tras hidratar (~3,7 s en móvil lento) y se volvía el
  // elemento LCP de pantallas escasas como `/practicar`. El script inline de
  // `app/layout.tsx` lo oculta por CSS antes de pintar si el visitante ya
  // eligió (evita el flash del caso "ya decidió"); este efecto solo sincroniza
  // el estado de React. El copy es compacto (~90px) y las fuentes van con
  // `display: optional`, así que no reflowa al cargar — el CLS que esto
  // causaba en un intento anterior era el swap de fuente, ya eliminado.
  const [consent, setConsent] = useState<boolean | null | undefined>(undefined);

  useLayoutEffect(() => {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(stored === 'true' ? true : stored === 'false' ? false : null);
  }, []);

  if (consent === true || consent === false) {
    return null;
  }

  const persist = (value: 'true' | 'false') => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, value);
      document.documentElement.setAttribute('data-cookie-consent', 'set');
    } catch {
      // Modo privado / almacenamiento bloqueado: la UI sigue funcionando,
      // solo no se recuerda la decisión entre visitas.
    }
  };

  const handleAccept = () => {
    persist('true');
    setConsent(true);
    // Trigger analytics load
    window.dispatchEvent(new Event('yaentre:cookies-accepted'));
  };

  const handleReject = () => {
    persist('false');
    setConsent(false);
  };

  return (
    <div
      data-cookie-banner
      className="fixed bottom-0 left-0 right-0 z-50 bg-surface shadow-lg border-t border-border-subtle"
    >
      <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* G62: copy compacto — antes eran dos párrafos (bloque de ~200px que
              competía por ser el elemento LCP en pantallas escasas). El detalle
              vive en el aviso de privacidad enlazado. */}
          <p className="flex-1 text-sm text-text-secondary">
            Usamos cookies técnicas y analíticas. Puedes rechazar las analíticas.{' '}
            <Link href="/legal/privacidad" className="font-semibold text-brand-soft hover:underline">
              Aviso de privacidad
            </Link>
            .
          </p>
          <div className="flex gap-3 flex-shrink-0">
            <Button
              onClick={handleReject}
              variant="secondary"
              className="text-sm px-4 py-2 h-auto"
            >
              Rechazar
            </Button>
            <Button
              onClick={handleAccept}
              variant="primary"
              className="text-sm px-4 py-2 h-auto"
            >
              Aceptar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function getCookiesConsent(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
  return stored === 'true';
}
