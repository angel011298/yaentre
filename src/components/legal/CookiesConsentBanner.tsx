'use client';

import Link from 'next/link';
import { useLayoutEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

const CONSENT_STORAGE_KEY = 'yaentre-cookies-consent';

export function CookiesConsentBanner() {
  const [consent, setConsent] = useState<boolean | null | undefined>(undefined);

  useLayoutEffect(() => {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(stored === 'true' ? true : stored === 'false' ? false : null);
  }, []);

  if (consent !== null) {
    return null;
  }

  const handleAccept = () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'true');
    setConsent(true);
    // Trigger analytics load
    window.dispatchEvent(new Event('yaentre:cookies-accepted'));
  };

  const handleReject = () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'false');
    setConsent(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface shadow-lg border-t border-border-subtle">
      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 text-sm text-text-secondary">
            <p className="mb-2">
              Usamos cookies técnicas (obligatorias para que la plataforma funcione) y analíticas (para mejorar tu experiencia). Puedes rechazar las analíticas sin problemas.
            </p>
            <p>
              Lee nuestro{' '}
              <Link href="/legal/privacidad" className="font-semibold text-brand hover:underline">
                aviso de privacidad
              </Link>{' '}
              para más detalles.
            </p>
          </div>
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
