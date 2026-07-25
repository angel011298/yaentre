'use client';

import { useState } from 'react';
import { reportQuestionAction } from '@/app/actions/drill';

/** Botón "reportar error" (F14 tarea 7): registra un `QuestionReport` real —
 *  visible en `/admin/reports` en cuanto un reactivo junta 3 reportes sin
 *  resolver (umbral ya existente, F3). No bloquea ni interrumpe la sesión. */
export function ReportQuestionButton({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  async function submit() {
    setStatus('sending');
    const result = await reportQuestionAction({ questionId, reason: reason || undefined });
    setStatus(result.ok ? 'sent' : 'idle');
  }

  if (status === 'sent') {
    return <p className="text-xs text-text-muted">Gracias, ya lo reportamos. 🦉</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-touch items-center text-xs text-text-muted underline hover:text-text-secondary"
      >
        ⚠️ Reportar error en este reactivo
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-border-subtle bg-elevated p-3">
      <label className="block text-xs font-semibold text-text-primary" htmlFor={`report-${questionId}`}>
        ¿Qué está mal? (opcional)
      </label>
      <textarea
        id={`report-${questionId}`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
        rows={2}
        className="w-full rounded-md border border-border-subtle bg-input p-2 text-sm text-text-primary"
        placeholder="Ej. la opción B también parece correcta…"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={status === 'sending'}
          className="min-h-touch rounded-md bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {status === 'sending' ? 'Enviando…' : 'Enviar reporte'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-touch px-3 text-xs text-text-muted hover:text-text-secondary"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
