'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { computePayoutsAction } from '@/app/actions/admin-marketplace';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

/**
 * G103 — calcular las liquidaciones de una semana cerrada (quedan por
 * aprobar). Contenedor sin `<form>` y botón `type="button"`: antes de hidratar,
 * el clic no hace nada en vez de navegar (lección de la bóveda, G99).
 */
export function ComputePayoutsForm({ defaultWeekStart }: { defaultWeekStart: string }) {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(defaultWeekStart);
  const [reason, setReason] = useState('Liquidación semanal');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  async function run() {
    setPending(true);
    setMessage(null);
    const r = await computePayoutsAction({ weekStart, reason }).catch(() => null);
    setPending(false);
    if (r?.ok) {
      const { created, belowMinimum, existing } = r.data;
      setMessage({
        tone: 'ok',
        text: `Creadas: ${created}. Bajo el mínimo (se acumulan): ${belowMinimum}. Ya existían: ${existing}.`,
      });
      router.refresh();
    } else {
      setMessage({ tone: 'error', text: r && !r.ok ? r.message : 'No se pudo calcular.' });
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border-subtle bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Lunes de la semana (AAAA-MM-DD)" name="weekStart" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} inputMode="numeric" />
        <TextField label="Motivo (queda en la bitácora)" name="computeReason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={400} />
      </div>
      <Button type="button" variant="primary" disabled={pending || reason.trim().length < 8} onClick={() => void run()}>
        {pending ? 'Calculando…' : 'Calcular la semana'}
      </Button>
      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`text-sm ${message.tone === 'ok' ? 'text-success' : 'text-danger'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
