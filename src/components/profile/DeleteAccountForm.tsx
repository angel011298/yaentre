'use client';

import { useActionState, useState } from 'react';
import { deleteAccountAction } from '@/app/actions/account';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { initialActionState } from '@/lib/auth/types';

/** Eliminar cuenta (F17 tarea 3): confirmación fuerte — escribir el correo
 *  exacto, no un simple checkbox. Redirige a `/` en éxito (ver la Action). */
export function DeleteAccountForm() {
  const [state, formAction, isPending] = useActionState(deleteAccountAction, initialActionState);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="mt-2 text-sm font-semibold text-danger hover:underline"
      >
        Eliminar mi cuenta
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-md border border-danger/40 bg-danger/10 p-3">
      <TextField
        name="confirmEmail"
        type="email"
        label="Escribe tu correo para confirmar"
        autoComplete="off"
        required
      />
      {state.status === 'error' && state.message && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="danger" disabled={isPending}>
          {isPending ? 'Eliminando…' : 'Sí, eliminar mi cuenta'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setConfirming(false)} disabled={isPending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
