'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Action = 'confirm' | 'complete' | 'student-no-show' | 'cancel';

const LABEL: Record<Action, string> = {
  confirm: 'Confirmar asistencia',
  complete: 'Marcar como impartida',
  'student-no-show': 'El alumno no llegó',
  cancel: 'Cancelar clase',
};

const CONFIRM_TEXT: Partial<Record<Action, string>> = {
  'student-no-show': 'Solo si ya pasaron más de 15 minutos del inicio y el alumno no se conectó. ¿Registrarlo?',
  cancel:
    'Al cancelar, el alumno recibe el reembolso completo y la cancelación cuenta en tu tasa de cancelación. ¿Cancelar la clase?',
};

/**
 * Acciones del profesor sobre una clase. Llaman a los Route Handlers de
 * `/api/teachers/me/classes/{id}/*`, que son quienes verifican al profesor y su
 * propiedad sobre la clase: aquí solo se decide qué botones OFRECER.
 */
export function TeacherClassActions({
  classId,
  canConfirm,
  canComplete,
  canDeclareStudentNoShow,
  canCancel,
}: {
  classId: string;
  canConfirm: boolean;
  canComplete: boolean;
  canDeclareStudentNoShow: boolean;
  canCancel: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: Action) {
    const warning = CONFIRM_TEXT[action];
    if (warning && !window.confirm(warning)) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/teachers/me/classes/${classId}/${action}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        });
        const body = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
        if (!res.ok || !body?.ok) {
          setError(body?.message ?? 'No se pudo completar. Intenta de nuevo.');
          return;
        }
        router.refresh();
      } catch {
        setError('No pudimos conectar. Revisa tu conexión e intenta de nuevo.');
      }
    });
  }

  const actions: Array<[Action, boolean]> = [
    ['confirm', canConfirm],
    ['complete', canComplete],
    ['student-no-show', canDeclareStudentNoShow],
    ['cancel', canCancel],
  ];

  return (
    <div className="mt-2 space-y-1">
      <div className="flex flex-wrap gap-2">
        {actions
          .filter(([, on]) => on)
          .map(([action]) => (
            <button
              key={action}
              type="button"
              disabled={pending}
              onClick={() => run(action)}
              className="min-h-touch rounded-md border border-border-subtle px-3 text-sm font-medium hover:bg-elevated disabled:opacity-50"
            >
              {LABEL[action]}
            </button>
          ))}
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
