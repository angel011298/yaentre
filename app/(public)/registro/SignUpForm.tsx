'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signUpAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { initialActionState } from '@/lib/auth/types';

export function SignUpForm({ next, isTutor = false }: { next?: string; isTutor?: boolean }) {
  const [state, formAction, isPending] = useActionState(signUpAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? (isTutor ? '/tutor' : '/app')} />
      <input type="hidden" name="role" value={isTutor ? 'PARENT' : 'STUDENT'} />
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

      {/* F21: Aceptación de términos */}
      <div className="flex gap-3 pt-2">
        <input
          type="checkbox"
          id="accept-terms"
          name="acceptTerms"
          required
          className="mt-1 h-4 w-4 flex-shrink-0 cursor-pointer"
          aria-label="Acepto los términos y condiciones y el aviso de privacidad"
        />
        <label htmlFor="accept-terms" className="text-sm text-text-secondary leading-tight cursor-pointer">
          Acepto los{' '}
          <Link href="/legal/terminos" target="_blank" className="font-semibold text-brand-soft hover:underline">
            términos y condiciones
          </Link>
          {' '}y el{' '}
          <Link href="/legal/privacidad" target="_blank" className="font-semibold text-brand-soft hover:underline">
            aviso de privacidad
          </Link>
        </label>
      </div>
      {state.fieldErrors?.acceptTerms && (
        <p role="alert" className="text-sm text-danger -mt-2">
          Debes aceptar los términos y condiciones para continuar
        </p>
      )}

      {state.status === 'error' && state.message && (
        <p role="alert" className="text-sm text-danger">
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
