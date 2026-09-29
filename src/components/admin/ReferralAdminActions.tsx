'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import {
  reinstateReferralAction,
  resolveReferralFlagAction,
  suspendReferralAction,
} from '@/app/actions/admin-referrals';

/**
 * Decisiones del admin sobre un referidor (suspender / reactivar) o sobre una venta
 * marcada por el antifraude (descartar la marca / confirmar el fraude).
 *
 * ⚠️ Esta interfaz NO es una capa de seguridad: esconder un botón no cierra nada
 * (G98). `isMaster` solo evita OFRECER lo que el servidor va a rechazar; la
 * autorización real está en la primera línea de cada acción. Todas piden MOTIVO.
 */
export function ReferralAdminActions(
  props:
    | { kind: 'code'; referralId: string; active: boolean; isMaster: boolean }
    | { kind: 'flag'; saleId: string; isMaster: boolean }
) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  if (!props.isMaster) {
    return <p className="text-xs text-text-muted">Las decisiones son del administrador maestro.</p>;
  }

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setMessage({ tone: 'error', text: result.message ?? 'No se pudo completar.' });
        return;
      }
      setMessage({ tone: 'ok', text: 'Listo. Quedó en la bitácora.' });
      setReason('');
      router.refresh();
    });
  }

  const disabled = pending || reason.trim().length < 8;

  return (
    <div className="space-y-2">
      <label className="block text-xs">
        <span className="font-medium">Motivo (mínimo 8 caracteres)</span>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={400}
          className="mt-1 w-full rounded-md border border-border-subtle bg-base p-2 text-sm"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {props.kind === 'code' && props.active && (
          <Button
            type="button"
            variant="danger"
            disabled={disabled}
            onClick={() => run(() => suspendReferralAction({ referralId: props.referralId, reason }))}
          >
            Suspender
          </Button>
        )}
        {props.kind === 'code' && !props.active && (
          <Button
            type="button"
            disabled={disabled}
            onClick={() => run(() => reinstateReferralAction({ referralId: props.referralId, reason }))}
          >
            Reactivar
          </Button>
        )}
        {props.kind === 'flag' && (
          <>
            <Button
              type="button"
              disabled={disabled}
              onClick={() => run(() => resolveReferralFlagAction({ saleId: props.saleId, decision: 'CLEAR', reason }))}
            >
              Falsa alarma (acreditar)
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={disabled}
              onClick={() => run(() => resolveReferralFlagAction({ saleId: props.saleId, decision: 'CONFIRM', reason }))}
            >
              Confirmar fraude (revertir)
            </Button>
          </>
        )}
      </div>
      {message && (
        <p role="status" className={message.tone === 'ok' ? 'text-sm text-success' : 'text-sm text-danger'}>
          {message.text}
        </p>
      )}
    </div>
  );
}
