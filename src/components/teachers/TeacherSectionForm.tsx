'use client';

import { useActionState, type ReactNode } from 'react';
import { updateTeacherProfileAction } from '@/app/actions/teachers';
import { Button } from '@/components/ui/Button';
import { initialActionState } from '@/lib/auth/types';

/**
 * Un formulario de UNA sección del perfil del profesor (pago, contacto,
 * materias, disponibilidad). Cada sección manda solo sus campos: un campo que no
 * se manda NO se interpreta como «bórralo» (`updateFromFormData`).
 */
export function TeacherSectionForm({
  title,
  children,
  render,
}: {
  title: string;
  children?: ReactNode;
  /** Para secciones que necesitan los errores de campo del servidor. */
  render?: (fieldErrors: Record<string, string[]>) => ReactNode;
}) {
  const [state, formAction, isPending] = useActionState(updateTeacherProfileAction, initialActionState);
  return (
    <form action={formAction} className="space-y-4">
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {render ? render(state.fieldErrors ?? {}) : children}
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? 'Guardando…' : 'Guardar'}
      </Button>
      {state.status !== 'idle' && state.message && (
        <p
          role={state.status === 'error' ? 'alert' : 'status'}
          className={state.status === 'error' ? 'text-sm font-medium text-danger' : 'text-sm text-success'}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
