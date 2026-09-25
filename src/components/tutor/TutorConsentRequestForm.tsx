'use client';

import { useActionState } from 'react';
import { requestTutorConsentAction } from '@/app/actions/tutor';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { initialActionState } from '@/lib/auth/types';

/**
 * Formulario del ALUMNO menor para enviar (o reenviar) la liga de confirmación
 * a su tutor (Bloque 1). El correo del tutor es el único dato: el dueño de la
 * solicitud sale del guard del Server Action, nunca de un campo.
 */
export function TutorConsentRequestForm({
  defaultEmail,
  alreadyRequested,
}: {
  defaultEmail?: string | null;
  alreadyRequested: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    requestTutorConsentAction,
    initialActionState
  );

  return (
    <form action={formAction} className="space-y-4">
      <TextField
        name="tutorEmail"
        type="email"
        label="Correo de tu madre, padre o tutor"
        autoComplete="email"
        required
        defaultValue={defaultEmail ?? undefined}
        errors={state.fieldErrors?.tutorEmail}
      />

      {state.status === 'error' && state.message && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
      {state.status === 'success' && state.message && (
        <p role="status" className="text-sm text-success">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending
          ? 'Enviando…'
          : alreadyRequested
            ? 'Reenviar la liga a mi tutor'
            : 'Enviar la liga a mi tutor'}
      </Button>
    </form>
  );
}
