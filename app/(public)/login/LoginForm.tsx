'use client';

import { useActionState } from 'react';
import { signInAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { initialActionState } from '@/lib/auth/types';

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, isPending] = useActionState(signInAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <TextField
        name="email"
        type="email"
        label="Correo electrónico"
        autoComplete="email"
        required
        errors={state.fieldErrors?.email}
      />
      <TextField
        name="password"
        type="password"
        label="Contraseña"
        autoComplete="current-password"
        required
        errors={state.fieldErrors?.password}
      />
      {state.status === 'error' && state.message && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Iniciando sesión…' : 'Iniciar sesión'}
      </Button>
    </form>
  );
}
