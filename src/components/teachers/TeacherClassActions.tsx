'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cancelClassByTeacherAction, completeClassAction } from '@/app/actions/classes';
import { Button } from '@/components/ui/Button';

/** G103 — marcar impartida (después de la hora de fin) o cancelar con reembolso total al alumno. */
export function TeacherClassActions({
  classSessionId,
  canComplete,
  canCancel,
}: {
  classSessionId: string;
  canComplete: boolean;
  canCancel: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: (raw: unknown) => Promise<{ ok: true } | { ok: false; message: string }>) {
    setPending(true);
    setError(null);
    const r = await fn({ classSessionId }).catch(() => null);
    setPending(false);
    if (r?.ok) router.refresh();
    else setError(r?.message ?? 'No pudimos completar la acción.');
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canComplete && (
        <Button type="button" variant="primary" disabled={pending} onClick={() => run(completeClassAction)}>
          Marcar como impartida
        </Button>
      )}
      {canCancel &&
        (confirming ? (
          <>
            <span className="text-xs text-text-secondary">Se reembolsa el 100 % al alumno y cuenta como cancelación tuya.</span>
            <Button type="button" variant="danger" disabled={pending} onClick={() => run(cancelClassByTeacherAction)}>
              Confirmar cancelación
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
              No cancelar
            </Button>
          </>
        ) : (
          <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirming(true)}>
            Cancelar clase
          </Button>
        ))}
      {error && (
        <p role="alert" className="w-full text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
