'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { payoutDecisionAction, reviewCourseAction, reviewTeacherAction } from '@/app/actions/admin-marketplace';
import { Button } from '@/components/ui/Button';

export type DecisionTarget =
  | { kind: 'teacher'; teacherId: string }
  | { kind: 'course'; courseId: string }
  | { kind: 'payout'; payoutId: string };

type DecisionResult = { ok: true } | { ok: false; message: string };

function submitFor(target: DecisionTarget, decision: string, reason: string, extra: string): Promise<DecisionResult> {
  switch (target.kind) {
    case 'teacher':
      return reviewTeacherAction({ teacherId: target.teacherId, decision, reason });
    case 'course':
      return reviewCourseAction({ courseId: target.courseId, decision, reason });
    case 'payout':
      return payoutDecisionAction({
        payoutId: target.payoutId,
        decision,
        reason,
        ...(decision === 'MARK_TRANSFERRED' ? { speiReference: extra } : {}),
      });
  }
}

interface DecisionOption {
  value: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

/**
 * G103 — botones de decisión del panel admin (profesores, cursos, reseñas,
 * liquidaciones). El motivo es OBLIGATORIO (mín. 8 caracteres): es lo único
 * que hace útil la bitácora meses después. La acción del servidor vuelve a
 * verificar el rol, el estado y deja la fila de bitácora.
 */
export function MarketplaceDecision({
  options,
  target,
  extraField,
}: {
  options: DecisionOption[];
  target: DecisionTarget;
  extraField?: { label: string; name: string; showFor: string[] };
}) {
  const id = useId();
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [extra, setExtra] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  async function confirm() {
    if (!chosen) return;
    setPending(true);
    setMessage(null);
    const r = await submitFor(target, chosen, reason, extra).catch(() => null);
    setPending(false);
    if (r?.ok) {
      setMessage({ tone: 'ok', text: 'Listo.' });
      setChosen(null);
      setReason('');
      setExtra('');
      router.refresh();
    } else {
      setMessage({ tone: 'error', text: r && !r.ok ? r.message : 'No se pudo aplicar.' });
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Button key={o.value} type="button" variant={chosen === o.value ? 'primary' : (o.variant ?? 'secondary')} aria-pressed={chosen === o.value} onClick={() => setChosen(o.value)}>
            {o.label}
          </Button>
        ))}
      </div>
      {chosen && (
        <div className="space-y-2 rounded-md border border-border-subtle p-3">
          {extraField && extraField.showFor.includes(chosen) && (
            <div className="space-y-1">
              <label htmlFor={`${id}-extra`} className="text-sm font-medium text-text-secondary">{extraField.label}</label>
              <input id={`${id}-extra`} name={extraField.name} value={extra} maxLength={40} onChange={(e) => setExtra(e.target.value)} className="min-h-touch w-full rounded-md border border-border-subtle bg-input px-3 text-text-primary" />
            </div>
          )}
          <label htmlFor={`${id}-reason`} className="text-sm font-medium text-text-secondary">Motivo (queda en la bitácora)</label>
          <textarea id={`${id}-reason`} rows={2} maxLength={400} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-md border border-border-subtle bg-input p-2 text-sm text-text-primary" />
          <div className="flex gap-2">
            <Button type="button" variant="primary" disabled={pending || reason.trim().length < 8} onClick={() => void confirm()}>
              {pending ? 'Aplicando…' : 'Confirmar'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setChosen(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`text-sm ${message.tone === 'ok' ? 'text-success' : 'text-danger'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
