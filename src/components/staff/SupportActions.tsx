'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { issueRefundAction, opposeMarketingAction } from '@/app/actions/support';

/**
 * Acciones de la ficha de soporte: reembolsar un plan y retirar el consentimiento
 * de marketing.
 *
 * ⚠️ Esta interfaz NO es una capa de seguridad: esconder un botón no cierra nada
 * (G98). `canRefund` solo evita OFRECER lo que el servidor va a rechazar; la
 * autorización real —rol, válvula, admin maestro— está en la primera línea del
 * servicio. Las dos acciones piden MOTIVO: es lo que hace útil la bitácora.
 */
export function SupportActions(
  props:
    | { kind: 'refund'; subscriptionId: string; canRefund: boolean; refundableLabel: string }
    | { kind: 'marketing'; userProfileId: string; enabled: boolean }
) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  function run(fn: () => Promise<{ ok: boolean; message?: string; data?: unknown }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      setConfirming(false);
      if (!result.ok) {
        setMessage({ tone: 'error', text: result.message ?? 'No se pudo completar.' });
        return;
      }
      const warnings = (result.data as { warnings?: string[] } | undefined)?.warnings ?? [];
      setMessage({
        tone: warnings.length > 0 ? 'error' : 'ok',
        text: warnings.length > 0 ? `Hecho, con avisos: ${warnings.join(' ')}` : 'Listo. Quedó en la bitácora.',
      });
      setReason('');
      router.refresh();
    });
  }

  const disabled = pending || reason.trim().length < 8;

  if (props.kind === 'marketing') {
    if (!props.enabled) return <p className="text-sm text-text-secondary">✓ Ya no recibe correos promocionales.</p>;
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
        <Button
          type="button"
          disabled={disabled}
          onClick={() => run(() => opposeMarketingAction({ userProfileId: props.userProfileId, reason }))}
        >
          Retirar consentimiento de marketing
        </Button>
        {message && <Feedback message={message} />}
      </div>
    );
  }

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
      {!confirming ? (
        <Button type="button" variant="danger" disabled={disabled || !props.canRefund} onClick={() => setConfirming(true)}>
          Reembolsar {props.refundableLabel}
        </Button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm">
            Se devuelve {props.refundableLabel} y el plan se da de baja. No se puede deshacer.
          </p>
          <Button type="button" variant="danger" disabled={pending} onClick={() => run(() => issueRefundAction({ subscriptionId: props.subscriptionId, reason }))}>
            Sí, reembolsar
          </Button>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
        </div>
      )}
      {message && <Feedback message={message} />}
    </div>
  );
}

function Feedback({ message }: { message: { tone: 'ok' | 'error'; text: string } }) {
  return (
    <p role="status" className={message.tone === 'ok' ? 'text-sm text-success' : 'text-sm text-danger'}>
      {message.text}
    </p>
  );
}
