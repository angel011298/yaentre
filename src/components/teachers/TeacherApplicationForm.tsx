'use client';

import { useActionState, useState } from 'react';
import { applyTeacherAction, uploadCsfAction } from '@/app/actions/teachers';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { initialActionState } from '@/lib/auth/types';
import { TEACHER_AGREEMENTS } from '@/lib/legal/teacher-texts';
import { RFC_QUESTION } from '@/lib/teachers/onboarding';
import { SUBJECT_KEYS, SUBJECT_LABELS } from '@/lib/teachers/tariff';
import { AvailabilityEditor } from './AvailabilityEditor';

/**
 * Solicitud de profesor (spec §3). Nada de aquí decide el carril de pago: el
 * servidor lo calcula (`determinePaymentRail`) con lo que llegue. La pregunta de
 * facturación lleva la redacción EXACTA de la spec (§3.2): se pregunta si puede
 * emitir facturas —no «¿tienes RFC?»— y la opción «no» se responde con calidez.
 */
export function TeacherApplicationForm() {
  const [state, formAction, isPending] = useActionState(applyTeacherAction, initialActionState);
  const [canInvoice, setCanInvoice] = useState<'yes' | 'no'>('no');
  const [csfPath, setCsfPath] = useState('');
  const [csfStatus, setCsfStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const errors = state.fieldErrors ?? {};

  async function onCsfChange(file: File | undefined) {
    setCsfPath('');
    if (!file) return;
    setCsfStatus({ tone: 'ok', text: 'Subiendo…' });
    const fd = new FormData();
    fd.set('csf', file);
    const res = await uploadCsfAction(fd);
    if (res.ok) {
      setCsfPath(res.data.path);
      setCsfStatus({ tone: 'ok', text: 'Constancia recibida.' });
    } else {
      setCsfStatus({ tone: 'error', text: res.message });
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Sobre ti</h2>
        <TextField name="fullName" label="Nombre completo" autoComplete="name" required errors={errors.fullName} />
        <TextField
          name="publicName"
          label="Cómo te verán los alumnos"
          hint="Por ejemplo «Ana P.». No incluyas teléfonos, correos ni redes."
          required
          errors={errors.publicName}
        />
        <div className="space-y-1.5">
          <label htmlFor="field-bio" className="text-sm font-medium text-text-secondary">
            Presentación (opcional)
          </label>
          <textarea
            id="field-bio"
            name="bio"
            rows={4}
            maxLength={500}
            className="w-full rounded-md border border-border-subtle bg-input p-3 text-text-primary"
          />
          {errors.bio && (
            <p role="alert" className="text-xs font-medium text-danger">
              {errors.bio[0]}
            </p>
          )}
        </div>
        <TextField name="phone" type="tel" label="Teléfono (10 dígitos)" autoComplete="tel" required errors={errors.phone} />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Materias que impartes</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SUBJECT_KEYS.map((key) => (
            <label key={key} className="flex min-h-touch items-center gap-2 text-sm">
              <input type="checkbox" name="subjects" value={key} className="h-4 w-4" />
              {SUBJECT_LABELS[key]}
            </label>
          ))}
        </div>
        {errors.subjects && (
          <p role="alert" className="text-xs font-medium text-danger">
            {errors.subjects[0]}
          </p>
        )}
      </section>

      <section>
        <AvailabilityEditor error={errors.availability?.[0]} />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Identidad y pago</h2>
        <p className="text-sm text-text-secondary">
          Necesitamos tu CURP y tu CLABE para verificar tu identidad y depositarte. Solo las ve el equipo de administración
          de YaEntre y nunca se muestran a los alumnos.
        </p>
        <TextField name="curp" label="CURP" autoComplete="off" required maxLength={18} errors={errors.curp} />
        <TextField name="bankName" label="Banco" required errors={errors.bankName} />
        <TextField
          name="clabe"
          label="CLABE interbancaria (18 dígitos)"
          inputMode="numeric"
          autoComplete="off"
          required
          errors={errors.clabe}
        />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-text-secondary">{RFC_QUESTION.question}</legend>
          {(['yes', 'no'] as const).map((v) => (
            <label key={v} className="flex min-h-touch items-start gap-2 text-sm">
              <input
                type="radio"
                name="canInvoice"
                value={v}
                checked={canInvoice === v}
                onChange={() => setCanInvoice(v)}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="font-medium">{RFC_QUESTION[v].label}</span>
                <span className="block text-xs text-text-muted">{RFC_QUESTION[v].hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {canInvoice === 'yes' && (
          <div className="space-y-4">
            <TextField name="rfc" label="RFC (persona física)" maxLength={13} autoComplete="off" errors={errors.rfc} />
            <div className="space-y-1.5">
              <label htmlFor="field-csf" className="text-sm font-medium text-text-secondary">
                Constancia de Situación Fiscal (PDF, máx. 5 MB)
              </label>
              <input
                id="field-csf"
                type="file"
                accept="application/pdf"
                onChange={(e) => void onCsfChange(e.target.files?.[0])}
                className="block w-full text-sm"
              />
              <input type="hidden" name="csfDocumentPath" value={csfPath} />
              {csfStatus && (
                <p role="status" className={csfStatus.tone === 'ok' ? 'text-xs text-success' : 'text-xs text-danger'}>
                  {csfStatus.text}
                </p>
              )}
              {errors.csfDocumentPath && (
                <p role="alert" className="text-xs font-medium text-danger">
                  {errors.csfDocumentPath[0]}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Acuerdos</h2>
        {TEACHER_AGREEMENTS.map((a) => {
          const field = a.key === 'contract' ? 'acceptContract' : a.key === 'nda' ? 'acceptNda' : 'acceptRecordingPolicy';
          return (
            <div key={a.key} className="space-y-2 rounded-lg border border-border-subtle p-3">
              <p className="text-sm font-medium">{a.title}</p>
              <p className="text-sm text-text-secondary">{a.summary}</p>
              <details className="text-sm">
                <summary className="cursor-pointer text-brand">Leer el texto completo</summary>
                <p className="mt-2 whitespace-pre-line text-text-secondary">{a.body}</p>
              </details>
              <label className="flex min-h-touch items-center gap-2 text-sm">
                <input type="checkbox" name={field} required className="h-4 w-4" />
                He leído y acepto
              </label>
              {errors[field] && (
                <p role="alert" className="text-xs font-medium text-danger">
                  {errors[field][0]}
                </p>
              )}
            </div>
          );
        })}
      </section>

      {state.status === 'error' && state.message && (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Enviando…' : 'Enviar mi solicitud'}
      </Button>
    </form>
  );
}
