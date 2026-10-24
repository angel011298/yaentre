'use client';

import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

/**
 * G103 — casilla del art. 56 LFPC (obligatoria, NUNCA premarcada) y botón que
 * inicia el checkout de la extensión. El servidor vuelve a exigir la casilla:
 * desmarcarla aquí no basta para saltársela, y marcarla aquí no basta para
 * comprar (interruptor de ventas, correo verificado, vigencia elegible).
 *
 * Un `<div>` con botón `type="button"`, no un `<form>`: un clic antes de que
 * React hidrate no debe disparar una navegación nativa (lección de G99).
 */
export function ExtendAccessForm({
  priceLabel,
  consentText,
  salesOpen,
}: {
  priceLabel: string;
  consentText: string;
  salesOpen: boolean;
}) {
  const id = useId();
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);

  async function start() {
    if (!accepted) {
      setError('Para continuar, marca la casilla.');
      checkboxRef.current?.focus();
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/me/subscription/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptImmediateAccess: true }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; url: string }
        | { ok: false; message: string }
        | null;
      if (data && data.ok) {
        window.location.assign(data.url);
        return;
      }
      setError(data && !data.ok ? data.message : 'No pudimos iniciar el pago. Intenta de nuevo.');
    } catch {
      setError('No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.');
    }
    setPending(false);
  }

  if (!salesOpen) {
    return (
      <p role="status" className="rounded-md bg-warning-subtle p-3 text-sm text-text-primary">
        La compra todavía no está abierta. Te avisaremos en cuanto puedas extender tu acceso.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <input
          ref={checkboxRef}
          id={`${id}-consent`}
          type="checkbox"
          className="mt-1 h-5 w-5 shrink-0 accent-[var(--brand-primary)]"
          checked={accepted}
          onChange={(e) => {
            setAccepted(e.target.checked);
            if (e.target.checked) setError(null);
          }}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <label htmlFor={`${id}-consent`} className="text-sm leading-relaxed text-text-secondary">
          {consentText}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <Button type="button" variant="primary" className="w-full" disabled={pending} onClick={start}>
        {pending ? 'Abriendo el pago…' : `Extender 6 meses — ${priceLabel}`}
      </Button>
      <p className="text-xs text-text-muted">Puedes pagar con tarjeta, en OXXO o por transferencia SPEI.</p>
    </div>
  );
}
