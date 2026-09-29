'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Acciones del alumno sobre una clase suya: cancelar y calificar. Llaman a los
 * Route Handlers `/api/classes/{id}/*`, que verifican que la clase es DE ESTA
 * SESIÓN; aquí solo se decide qué botones ofrecer.
 */
export function StudentClassActions({
  classId,
  canCancel,
  canRate,
  lateCancel,
}: {
  classId: string;
  canCancel: boolean;
  canRate: boolean;
  /** Faltan menos de 24 h: el reembolso sería parcial. */
  lateCancel: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(5);

  function call(path: string, body: unknown, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/classes/${classId}/${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
        if (!res.ok || !json?.ok) {
          setError(json?.message ?? 'No se pudo completar. Intenta de nuevo.');
          return;
        }
        router.refresh();
      } catch {
        setError('No pudimos conectar. Revisa tu conexión e intenta de nuevo.');
      }
    });
  }

  return (
    <div className="mt-2 space-y-2">
      {canCancel && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            call(
              'cancel',
              {},
              lateCancel
                ? 'Faltan menos de 24 horas: se te devuelve el 50% del pago. ¿Cancelar la clase?'
                : 'Se te devuelve el pago completo. ¿Cancelar la clase?'
            )
          }
          className="min-h-touch rounded-md border border-border-subtle px-3 text-sm font-medium hover:bg-elevated disabled:opacity-50"
        >
          Cancelar clase
        </button>
      )}
      {canRate && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm">
            Califica tu clase{' '}
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="min-h-touch rounded-md border border-border-subtle bg-input px-2"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} ★
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() => call('rate', { rating })}
            className="min-h-touch rounded-md bg-brand px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
