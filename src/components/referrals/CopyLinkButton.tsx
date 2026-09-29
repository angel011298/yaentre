'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

/**
 * Copia el enlace de referido con UN clic. El enlace no es un dato sensible (es el
 * que la persona quiere compartir), así que no hay nada que proteger del
 * portapapeles; solo se avisa del resultado con `role="status"` (color + texto).
 * Si el navegador no da acceso al portapapeles (contexto no seguro, permiso
 * denegado), se deja el enlace SELECCIONADO en el campo para que se copie a mano.
 */
export function CopyLinkButton({ url }: { url: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
    } catch {
      input.current?.select();
      setState('manual');
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor="referral-link">
        Tu enlace
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          id="referral-link"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-h-touch min-w-0 flex-1 rounded-md border border-border-subtle bg-base px-3 font-mono text-sm"
        />
        <Button type="button" onClick={copy}>
          Copiar enlace
        </Button>
      </div>
      <p role="status" className="min-h-5 text-sm text-text-secondary">
        {state === 'copied' && '✓ Enlace copiado. Pégalo donde quieras compartirlo.'}
        {state === 'manual' && 'No pudimos copiarlo solo: ya quedó seleccionado, cópialo con Ctrl+C (o mantén presionado en el celular).'}
      </p>
    </div>
  );
}
