'use client';

import { useActionState } from 'react';
import { confirmTutorConsentAction } from '@/app/actions/tutor';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { initialActionState } from '@/lib/auth/types';
import { TUTOR_CONSENT_CLAUSES } from '@/lib/legal/consent-texts';

/** Mapea la clave de la cláusula al `name` del checkbox que lee el Server Action. */
const CONSENT_FIELD_NAME: Record<string, string> = {
  data: 'dataConsent',
  marketing: 'marketingConsent',
  analytics: 'analyticsConsent',
  recording: 'recordingConsent',
};

/**
 * Formulario del TUTOR (Bloque 1). Presenta los consentimientos granulares
 * —datos (obligatorio) + marketing/analítica/grabación (opcionales)— con la
 * descripción ANTES del control (handoff §3.4/§8). No hay sesión: el token
 * (campo oculto) es la autorización.
 */
export function TutorConfirmForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(
    confirmTutorConsentAction,
    initialActionState
  );

  if (state.status === 'success') {
    return (
      <div className="space-y-3 text-center">
        <p className="text-3xl">✅</p>
        <p className="text-sm text-text-secondary">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField name="tutorName" type="text" label="Tu nombre (opcional)" autoComplete="name" />
        <TextField
          name="relationship"
          type="text"
          label="Parentesco (opcional)"
          placeholder="Madre, padre, tutor…"
        />
      </div>

      <div className="space-y-3">
        {TUTOR_CONSENT_CLAUSES.map((clause) => (
          <label
            key={clause.key}
            className="flex gap-3 rounded-lg border border-border-subtle bg-surface p-4 cursor-pointer"
          >
            <input
              type="checkbox"
              name={CONSENT_FIELD_NAME[clause.key]}
              required={clause.required}
              className="mt-1 h-4 w-4 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-text-secondary leading-snug">
              <span className="block font-semibold text-text-primary">
                {clause.label}
                {clause.required && <span className="text-danger"> *</span>}
              </span>
              {clause.description}
            </span>
          </label>
        ))}
      </div>

      {state.status === 'error' && state.message && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Confirmando…' : 'Confirmar inscripción'}
      </Button>
      <p className="text-center text-xs text-text-muted">
        Los consentimientos marcados con * son obligatorios. Los demás son opcionales y puedes
        cambiarlos después.
      </p>
    </form>
  );
}
