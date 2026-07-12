'use client';

import { useActionState } from 'react';
import { resendVerificationAction } from '@/app/actions/auth';
import { initialActionState } from '@/lib/auth/types';

export function VerificationBanner() {
  const [state, formAction, isPending] = useActionState(
    resendVerificationAction,
    initialActionState
  );

  return (
    <div className="border-b border-[var(--warning)]/30 bg-[var(--warning)]/10 px-4 py-3 text-sm text-[var(--text-primary)]">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
        <span>
          Verifica tu correo para desbloquear la compra de planes.
          {state.status === 'success' && state.message ? ` ${state.message}` : ''}
          {state.status === 'error' && state.message ? ` ${state.message}` : ''}
        </span>
        <form action={formAction}>
          <button
            type="submit"
            disabled={isPending}
            className="font-semibold text-[var(--brand-soft)] hover:underline disabled:opacity-50"
          >
            {isPending ? 'Enviando…' : 'Reenviar'}
          </button>
        </form>
      </div>
    </div>
  );
}
