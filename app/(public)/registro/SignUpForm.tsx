'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signUpAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { initialActionState } from '@/lib/auth/types';

export function SignUpForm({ next }: { next?: string }) {
  const [state, formAction, isPending] = useActionState(signUpAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? '/app'} />
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
        autoComplete="new-password"
        required
        hint="Mínimo 8 caracteres."
        errors={state.fieldErrors?.password}
      />
      {state.status === 'error' && state.message && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {state.message}
          {state.code === 'DUPLICATE_EMAIL' && (
            <>
              {' '}
              <Link href="/login" className="font-semibold underline">
                Inicia sesión
              </Link>
            </>
          )}
        </p>
      )}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Creando tu cuenta…' : 'Crear cuenta'}
      </Button>
    </form>
  );
}
