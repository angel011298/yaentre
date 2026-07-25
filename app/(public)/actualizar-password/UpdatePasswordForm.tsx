'use client';

import { useActionState } from 'react';
import { updatePasswordAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { initialActionState } from '@/lib/auth/types';

export function UpdatePasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePasswordAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4">
      <TextField
        name="password"
        type="password"
        label="Nueva contraseña"
        autoComplete="new-password"
        required
        hint="Mínimo 8 caracteres."
        errors={state.fieldErrors?.password}
      />
      {state.status === 'error' && state.message && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Guardando…' : 'Guardar nueva contraseña'}
      </Button>
    </form>
  );
}
