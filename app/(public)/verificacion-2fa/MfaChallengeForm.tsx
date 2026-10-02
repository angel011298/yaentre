'use client';

import { useActionState } from 'react';
import { verifyMfaChallengeAction } from '@/app/actions/security';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { initialActionState } from '@/lib/auth/types';

/** `<form action>` de Server Action: es un POST real aun antes de hidratar. */
export function MfaChallengeForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState(verifyMfaChallengeAction, initialActionState);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <TextField
        name="code"
        label="Código"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]*"
        maxLength={7}
        required
        autoFocus
      />
      {state.status === 'error' && state.message && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Verificando…' : 'Verificar'}
      </Button>
    </form>
  );
}
