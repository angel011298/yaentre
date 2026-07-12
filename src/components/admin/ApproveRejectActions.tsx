'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveQuestionAction, rejectQuestionAction } from '@/app/actions/admin-questions';
import { Button } from '@/components/ui/Button';

interface Props {
  questionId: string;
  compact?: boolean;
  /** Si se provee, navega ahí tras una acción exitosa (usado en el detalle). */
  redirectTo?: string;
}

/**
 * Botones Aprobar/Rechazar. Client Component porque necesita `useTransition`
 * (llamar la Server Action con un input tipado, no un <form action> con
 * FormData) y `window.confirm` antes de rechazar — rechazar borra el reactivo
 * de la DB (no hay soft-delete en el schema, ver src/lib/db/admin-questions.ts).
 */
export function ApproveRejectActions({ questionId, compact = false, redirectTo }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null);

  function afterSuccess() {
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveQuestionAction({ questionId });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDone('approved');
      afterSuccess();
    });
  }

  function handleReject() {
    if (!window.confirm('¿Rechazar y ELIMINAR este reactivo? Esta acción no se puede deshacer.')) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await rejectQuestionAction({ questionId });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDone('rejected');
      afterSuccess();
    });
  }

  if (done) {
    return (
      <span className="text-sm text-text-muted">
        {done === 'approved' ? '✅ Aprobado' : '🗑️ Rechazado'}
      </span>
    );
  }

  return (
    <div className={compact ? 'flex items-center gap-2' : 'flex flex-wrap items-center gap-3'}>
      <Button type="button" variant="primary" onClick={handleApprove} disabled={isPending}>
        {isPending ? 'Procesando…' : 'Aprobar'}
      </Button>
      <Button type="button" variant="danger" onClick={handleReject} disabled={isPending}>
        Rechazar
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
