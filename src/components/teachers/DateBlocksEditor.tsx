'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { formatMexicoDate } from '@/lib/format/mx';

interface DateBlock {
  id: string;
  date: string;
  reason: string | null;
}

/** `YYYY-MM-DD` → fecha legible, interpretada como día de calendario (no medianoche UTC). */
function label(date: string): string {
  return formatMexicoDate(new Date(`${date}T18:00:00Z`));
}

/**
 * G103 — fechas bloqueadas (vacaciones, imprevistos). Ese día no se ofrece
 * ningún horario. Las clases YA reservadas ese día no se cancelan solas: el
 * profesor tiene que cancelarlas (con reembolso) desde «Clases».
 */
export function DateBlocksEditor({ initialBlocks, today, disabled }: { initialBlocks: DateBlock[]; today: string; disabled?: boolean }) {
  const id = useId();
  const [blocks, setBlocks] = useState(initialBlocks);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  async function add() {
    if (!date) {
      setStatus({ tone: 'error', text: 'Elige una fecha.' });
      return;
    }
    setPending(true);
    try {
      const res = await fetch('/api/teachers/me/date-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, reason: reason.trim() || null }),
      });
      const data = (await res.json().catch(() => ({}))) as { block?: DateBlock; error?: string };
      if (!res.ok || !data.block) throw new Error(data.error ?? 'No pudimos bloquear la fecha.');
      setBlocks((b) => [...b, data.block!].sort((x, y) => x.date.localeCompare(y.date)));
      setDate('');
      setReason('');
      setStatus({ tone: 'ok', text: `Bloqueaste el ${label(data.block.date)}.` });
    } catch (err) {
      setStatus({ tone: 'error', text: err instanceof Error ? err.message : 'No pudimos bloquear la fecha.' });
    }
    setPending(false);
  }

  async function remove(block: DateBlock) {
    setPending(true);
    try {
      const res = await fetch(`/api/teachers/me/date-blocks/${block.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('No pudimos quitar la fecha.');
      setBlocks((b) => b.filter((x) => x.id !== block.id));
      setStatus({ tone: 'ok', text: `Quitaste el bloqueo del ${label(block.date)}.` });
    } catch (err) {
      setStatus({ tone: 'error', text: err instanceof Error ? err.message : 'No pudimos quitar la fecha.' });
    }
    setPending(false);
  }

  return (
    <section className="space-y-3 rounded-lg border border-border-subtle bg-surface p-4" aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`} className="font-display text-lg font-bold text-text-primary">
        Fechas bloqueadas
      </h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <label htmlFor={`${id}-date`} className="text-sm font-medium text-text-secondary">
            Fecha
          </label>
          <input
            id={`${id}-date`}
            type="date"
            min={today}
            value={date}
            disabled={disabled}
            onChange={(e) => setDate(e.target.value)}
            className="min-h-touch w-full rounded-md border border-border-subtle bg-input px-3 text-text-primary"
          />
        </div>
        <div className="flex-1 space-y-1.5">
          <label htmlFor={`${id}-reason`} className="text-sm font-medium text-text-secondary">
            Motivo (solo lo ves tú)
          </label>
          <input
            id={`${id}-reason`}
            type="text"
            maxLength={120}
            value={reason}
            disabled={disabled}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-touch w-full rounded-md border border-border-subtle bg-input px-3 text-text-primary"
          />
        </div>
        <Button type="button" variant="secondary" disabled={disabled || pending} onClick={add}>
          Bloquear fecha
        </Button>
      </div>
      {blocks.length === 0 ? (
        <p className="text-sm text-text-muted">No tienes fechas bloqueadas.</p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="text-text-primary">
                {label(b.date)}
                {b.reason ? <span className="text-text-muted"> — {b.reason}</span> : null}
              </span>
              <Button type="button" variant="ghost" disabled={disabled || pending} onClick={() => remove(b)} aria-label={`Quitar el bloqueo del ${label(b.date)}`}>
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div aria-live="polite">
        {status && (
          <p role={status.tone === 'error' ? 'alert' : 'status'} className={`text-sm ${status.tone === 'ok' ? 'text-success' : 'text-danger'}`}>
            {status.text}
          </p>
        )}
      </div>
    </section>
  );
}
