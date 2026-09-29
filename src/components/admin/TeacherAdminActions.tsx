'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  approveTeacherAction,
  reactivateTeacherAction,
  suspendTeacherAction,
} from '@/app/actions/admin-teachers';

/**
 * Decisiones del admin sobre un profesor: aprobar, suspender, reactivar.
 *
 * ⚠️ Esta interfaz NO es una capa de seguridad: esconder un botón no cierra nada
 * (G98). `isMaster` solo evita OFRECER lo que el servidor va a rechazar; la
 * autorización real está en la primera línea de cada acción. Todas piden MOTIVO,
 * que es lo único que hace útil la bitácora meses después.
 */

type Status = 'PENDING_REVIEW' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

export function TeacherAdminActions({
  teacherId,
  status,
  isMaster,
  hasCsf,
}: {
  teacherId: string;
  status: Status;
  isMaster: boolean;
  hasCsf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  if (!isMaster) {
    return (
      <Card className="p-4">
        <h2 className="font-display text-lg font-semibold">Decisiones</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Aprobar, suspender o reactivar a un profesor —y ver sus datos fiscales y bancarios completos— está
          reservado al administrador maestro.
        </p>
      </Card>
    );
  }

  function run(fn: (input: { teacherId: string; reason: string }) => Promise<{ ok: boolean; message?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await fn({ teacherId, reason });
      if (!result.ok) {
        setMessage({ tone: 'error', text: result.message ?? 'No se pudo completar.' });
        return;
      }
      setMessage({ tone: 'ok', text: 'Listo. Quedó registrado en la bitácora.' });
      setReason('');
      router.refresh();
    });
  }

  const disabled = pending || reason.trim().length < 8;

  return (
    <Card className="space-y-3 p-4">
      <h2 className="font-display text-lg font-semibold">Decisiones</h2>
      <p className="text-sm text-text-secondary">
        Quedan en la bitácora con tu nombre, la fecha y el motivo. Al suspender se cancelan sus clases futuras con
        reembolso completo a cada alumno.
      </p>

      <label className="block text-sm">
        <span className="font-medium">Motivo (mínimo 8 caracteres)</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={400}
          className="mt-1 w-full rounded-md border border-border-subtle bg-base p-2 text-sm"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {status === 'PENDING_REVIEW' && (
          <Button type="button" disabled={disabled} onClick={() => run(approveTeacherAction)}>
            Aprobar
          </Button>
        )}
        {status === 'SUSPENDED' && (
          <Button type="button" disabled={disabled} onClick={() => run(reactivateTeacherAction)}>
            Reactivar
          </Button>
        )}
        {status !== 'SUSPENDED' && (
          <Button type="button" variant="danger" disabled={disabled} onClick={() => run(suspendTeacherAction)}>
            {status === 'PENDING_REVIEW' ? 'Rechazar (suspender)' : 'Suspender'}
          </Button>
        )}
        {hasCsf && (
          <a
            href={`/api/admin/teachers/${teacherId}/csf`}
            className="min-h-touch inline-flex items-center rounded-md border border-border-subtle px-3 text-sm font-medium hover:bg-elevated"
          >
            Ver constancia (queda auditado)
          </a>
        )}
      </div>

      {message && (
        <p role="status" className={message.tone === 'ok' ? 'text-sm text-success' : 'text-sm text-danger'}>
          {message.text}
        </p>
      )}
    </Card>
  );
}
