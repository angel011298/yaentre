'use client';

import { useActionState } from 'react';
import { forgotPasswordAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { initialActionState } from '@/lib/auth/types';

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    initialActionState
  );

  if (state.status === 'success') {
    return (
      <p className="rounded-[12px] bg-[var(--success)]/10 px-3 py-2 text-sm text-[var(--success)]">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <TextField
        name="email"
        type="email"
        label="Correo electrónico"
        autoComplete="email"
        required
        errors={state.fieldErrors?.email}
      />
      {state.status === 'error' && state.message && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Enviando…' : 'Enviar enlace de recuperación'}
      </Button>
    </form>
  );
}
