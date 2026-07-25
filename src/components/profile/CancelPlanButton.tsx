'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cancelMonthlySubscriptionAction } from '@/app/actions/billing';
import { Button } from '@/components/ui/Button';

/** Cancelar el plan mensual (F17 tarea 2, criterio "sin contactar soporte").
 *  Confirmación de un paso (no es tan irreversible como eliminar la cuenta:
 *  el acceso sigue activo hasta el final del periodo ya pagado). */
export function CancelPlanButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setPending(true);
    setError(null);
    const result = await cancelMonthlySubscriptionAction();
    setPending(false);
    if (result.ok) {
      setConfirming(false);
      router.refresh();
    } else {
      setError(result.message);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm font-semibold text-danger hover:underline"
      >
        Cancelar mi plan
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-danger/40 bg-danger/10 p-3">
      <p className="text-sm text-text-primary">
        ¿Seguro? Conservas acceso hasta el final de tu periodo actual, pero no se renovará.
      </p>
      <div className="flex gap-2">
        <Button variant="danger" onClick={handleCancel} disabled={pending}>
          {pending ? 'Cancelando…' : 'Sí, cancelar'}
        </Button>
        <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
          No, mantener
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
