'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cancelClassByStudentAction } from '@/app/actions/classes';
import { Button } from '@/components/ui/Button';

/** G103 — cancelar una clase: sin costo hasta 24 h antes (reembolso total). */
export function StudentClassActions({ classSessionId, canCancel }: { classSessionId: string; canCancel: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!canCancel) {
    return <p className="text-xs text-text-muted">Faltan menos de 24 h: ya no se puede cancelar desde la app.</p>;
  }

  async function cancel() {
    setPending(true);
    const r = await cancelClassByStudentAction({ classSessionId }).catch(() => null);
    setPending(false);
    if (r?.ok) {
      router.refresh();
      return;
    }
    setMessage(r?.message ?? 'No pudimos cancelar la clase. Intenta de nuevo.');
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {confirming ? (
        <>
          <span className="text-xs text-text-secondary">Te reembolsamos el 100 % a tu tarjeta.</span>
          <Button type="button" variant="danger" disabled={pending} onClick={cancel}>
            {pending ? 'Cancelando…' : 'Confirmar cancelación'}
          </Button>
          <Button type="button" variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
            No cancelar
          </Button>
        </>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setConfirming(true)}>
          Cancelar clase
        </Button>
      )}
      {message && (
        <p role="alert" className="w-full text-sm text-danger">
          {message}
        </p>
      )}
    </div>
  );
}
