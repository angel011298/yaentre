'use client';

import { useActionState } from 'react';
import { resendVerificationAction } from '@/app/actions/auth';
import { Card } from '@/components/ui/Card';
import { initialActionState } from '@/lib/auth/types';

/** Estado de verificación del correo + reenviar (F17 tarea 2). Reusa
 *  `resendVerificationAction` de F5 sin cambios — mismo botón que ya
 *  vivía en `VerificationBanner.tsx`, ahora también disponible en Perfil. */
export function EmailVerificationCard({ verified }: { verified: boolean }) {
  const [state, formAction, isPending] = useActionState(resendVerificationAction, initialActionState);

  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-text-primary">Correo electrónico</p>
      {verified ? (
        <p className="mt-1 text-sm text-success">✓ Verificado</p>
      ) : (
        <div className="mt-1 space-y-2">
          <p className="text-sm text-warning">Sin verificar — necesitas verificarlo antes de comprar un plan.</p>
          <form action={formAction}>
            <button
              type="submit"
              disabled={isPending}
              className="flex min-h-touch items-center text-sm font-semibold text-brand-soft hover:underline disabled:opacity-50"
            >
              {isPending ? 'Enviando…' : 'Reenviar correo de verificación'}
            </button>
          </form>
          {state.status === 'success' && state.message && (
            <p className="text-sm text-success">{state.message}</p>
          )}
          {state.status === 'error' && state.message && (
            <p className="text-sm text-danger">{state.message}</p>
          )}
        </div>
      )}
    </Card>
  );
}
