'use client';

import { useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { applyAsTeacherAction } from '@/app/actions/teachers';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { formatMxnShort } from '@/lib/format/mx';
import { isValidClabe, isValidCurp, isValidRfcPersonaFisica } from '@/lib/teachers/onboarding';
import { TRACK_LABELS } from '@/lib/teachers/subject-catalog';

type Track = 'ADMISION' | 'REGULARIZACION';

interface CatalogGroup {
  track: Track;
  subjects: Array<{ key: string; label: string; range: { minCents: number; maxCents: number } }>;
}

type Field = 'displayName' | 'fullName' | 'curp' | 'phone' | 'clabe' | 'bankName' | 'rfc' | 'subjects' | 'accept';

/**
 * G103 — solicitud de alta del profesor. La validación de aquí ADELANTA los
 * mensajes (mismas funciones puras que el servidor); el servidor vuelve a
 * validar todo. Al fallar se conservan los datos escritos y el foco va al
 * primer campo con error. Doble envío: el botón se deshabilita mientras viaja.
 *
 * Pregunta del RFC según la spec del marketplace §3.2: «¿Puedes emitir
 * facturas?», nunca «¿tienes RFC?».
 */
export function TeacherApplicationForm({
  catalog,
  previous,
}: {
  catalog: CatalogGroup[];
  previous: { displayName: string } | null;
}) {
  const id = useId();
  const router = useRouter();
  const [values, setValues] = useState({
    displayName: previous?.displayName ?? '',
    bio: '',
    fullName: '',
    curp: '',
    phone: '',
    clabe: '',
    bankName: '',
    rfc: '',
  });
  const [canInvoice, setCanInvoice] = useState<boolean | null>(null);
  const [subjects, setSubjects] = useState<Set<string>>(new Set());
  const [accepts, setAccepts] = useState({ contract: false, nda: false, recording: false });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  function validate(): Partial<Record<Field, string>> {
    const e: Partial<Record<Field, string>> = {};
    if (values.displayName.trim().length < 3) e.displayName = 'Escribe cómo quieres aparecer (mínimo 3 letras).';
    if (values.fullName.trim().length < 5) e.fullName = 'Escribe tu nombre completo.';
    if (!isValidCurp(values.curp)) e.curp = 'Revisa tu CURP: son 18 caracteres.';
    if (!/^\+?[\d\s-]{10,16}$/.test(values.phone.trim())) e.phone = 'Escribe un teléfono de 10 dígitos.';
    if (!isValidClabe(values.clabe)) e.clabe = 'Revisa tu CLABE: son 18 dígitos y uno no coincide.';
    if (values.bankName.trim().length < 2) e.bankName = 'Escribe el nombre de tu banco.';
    if (canInvoice === true && !isValidRfcPersonaFisica(values.rfc)) e.rfc = 'Escribe tu RFC (13 caracteres).';
    if (subjects.size === 0) e.subjects = 'Elige al menos una materia.';
    if (!accepts.contract || !accepts.nda || !accepts.recording) e.accept = 'Acepta los tres documentos para continuar.';
    return e;
  }

  async function submit() {
    const e = validate();
    setErrors(e);
    setServerError(null);
    const first = Object.keys(e)[0];
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"] input, [data-field="${first}"]`)?.focus();
      return;
    }
    setPending(true);
    const r = await applyAsTeacherAction({
      displayName: values.displayName,
      bio: values.bio || null,
      fullName: values.fullName,
      curp: values.curp,
      phone: values.phone,
      clabe: values.clabe,
      bankName: values.bankName,
      canInvoice: canInvoice === true,
      rfc: canInvoice ? values.rfc : null,
      subjects: [...subjects].map((k) => {
        const [track, subjectKey] = k.split(':') as [Track, string];
        return { track, subjectKey };
      }),
      acceptContract: true,
      acceptNda: true,
      acceptRecording: true,
    }).catch(() => null);
    setPending(false);
    if (r?.ok) {
      router.push('/profesor');
      router.refresh();
      return;
    }
    setServerError(r?.message ?? 'No pudimos enviar tu solicitud. Intenta de nuevo.');
  }

  const toggleSubject = (key: string) =>
    setSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div ref={formRef} className="space-y-6" data-testid="teacher-application">
      <fieldset className="space-y-3 rounded-lg border border-border-subtle bg-surface p-4">
        <legend className="px-1 font-display font-bold text-text-primary">Tus datos</legend>
        <div data-field="displayName">
          <TextField label="Nombre en el directorio (ej. «Prof. Ana R.»)" name="displayName" value={values.displayName} onChange={set('displayName')} errors={errors.displayName ? [errors.displayName] : undefined} maxLength={40} />
        </div>
        <div data-field="fullName">
          <TextField label="Nombre completo" name="fullName" autoComplete="name" value={values.fullName} onChange={set('fullName')} errors={errors.fullName ? [errors.fullName] : undefined} />
        </div>
        <div data-field="curp">
          <TextField label="CURP" name="curp" autoCapitalize="characters" value={values.curp} onChange={set('curp')} errors={errors.curp ? [errors.curp] : undefined} maxLength={18} />
        </div>
        <div data-field="phone">
          <TextField label="Teléfono" name="phone" type="tel" autoComplete="tel" value={values.phone} onChange={set('phone')} errors={errors.phone ? [errors.phone] : undefined} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${id}-bio`} className="text-sm font-medium text-text-secondary">Semblanza (opcional)</label>
          <textarea id={`${id}-bio`} rows={3} maxLength={600} value={values.bio} onChange={(e) => setValues((v) => ({ ...v, bio: e.target.value }))} className="w-full rounded-md border border-border-subtle bg-input p-3 text-text-primary" />
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-border-subtle bg-surface p-4">
        <legend className="px-1 font-display font-bold text-text-primary">Dónde recibes tus pagos</legend>
        <div data-field="clabe">
          <TextField label="CLABE interbancaria (18 dígitos)" name="clabe" inputMode="numeric" value={values.clabe} onChange={set('clabe')} errors={errors.clabe ? [errors.clabe] : undefined} maxLength={22} />
        </div>
        <div data-field="bankName">
          <TextField label="Banco" name="bankName" value={values.bankName} onChange={set('bankName')} errors={errors.bankName ? [errors.bankName] : undefined} />
        </div>
        <div role="radiogroup" aria-labelledby={`${id}-invoice`} className="space-y-2">
          <p id={`${id}-invoice`} className="text-sm font-medium text-text-secondary">¿Puedes emitir facturas por tus servicios?</p>
          <label className="flex min-h-touch items-start gap-3 rounded-md border border-border-subtle p-3">
            <input type="radio" name={`${id}-inv`} checked={canInvoice === true} onChange={() => setCanInvoice(true)} className="mt-1 h-5 w-5" />
            <span className="text-sm text-text-primary">Sí, tengo RFC y puedo facturar<span className="block text-xs text-text-muted">Te pediremos tu RFC y tu constancia de situación fiscal.</span></span>
          </label>
          <label className="flex min-h-touch items-start gap-3 rounded-md border border-border-subtle p-3">
            <input type="radio" name={`${id}-inv`} checked={canInvoice === false} onChange={() => setCanInvoice(false)} className="mt-1 h-5 w-5" />
            <span className="text-sm text-text-primary">No por el momento<span className="block text-xs text-text-muted">No hay problema: operamos con un esquema que no te pide facturar.</span></span>
          </label>
        </div>
        {canInvoice === true && (
          <div data-field="rfc">
            <TextField label="RFC" name="rfc" autoCapitalize="characters" value={values.rfc} onChange={set('rfc')} errors={errors.rfc ? [errors.rfc] : undefined} maxLength={13} />
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-border-subtle bg-surface p-4" data-field="subjects" tabIndex={-1}>
        <legend className="px-1 font-display font-bold text-text-primary">Qué materias das</legend>
        {catalog.map((group) => (
          <div key={group.track} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{TRACK_LABELS[group.track]}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.subjects.map((s) => {
                const key = `${group.track}:${s.key}`;
                return (
                  <label key={key} className="flex min-h-touch items-center gap-3 rounded-md border border-border-subtle p-3">
                    <input type="checkbox" checked={subjects.has(key)} onChange={() => toggleSubject(key)} className="h-5 w-5" />
                    <span className="text-sm text-text-primary">
                      {s.label}
                      <span className="block text-xs text-text-muted">
                        {formatMxnShort(s.range.minCents)}–{formatMxnShort(s.range.maxCents)} por clase
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        {errors.subjects && <p role="alert" className="text-xs font-medium text-danger">{errors.subjects}</p>}
      </fieldset>

      {/* TODO-CLO: contrato de comisión mercantil, NDA y política de grabación. */}
      <fieldset className="space-y-2 rounded-lg border border-border-subtle bg-surface p-4" data-field="accept" tabIndex={-1}>
        <legend className="px-1 font-display font-bold text-text-primary">Documentos</legend>
        {(
          [
            ['contract', 'Acepto el contrato de comisión mercantil de YaEntre.'],
            ['nda', 'Acepto el acuerdo de confidencialidad sobre contenidos y datos de alumnos.'],
            ['recording', 'Acepto la política de grabación de clases.'],
          ] as const
        ).map(([key, text]) => (
          <label key={key} className="flex min-h-touch items-start gap-3">
            <input type="checkbox" checked={accepts[key]} onChange={(e) => setAccepts((a) => ({ ...a, [key]: e.target.checked }))} className="mt-1 h-5 w-5" />
            <span className="text-sm text-text-secondary">{text}</span>
          </label>
        ))}
        {errors.accept && <p role="alert" className="text-xs font-medium text-danger">{errors.accept}</p>}
      </fieldset>

      {serverError && (
        <p role="alert" className="rounded-md bg-danger-subtle p-3 text-sm text-text-primary">
          {serverError}
        </p>
      )}
      <Button type="button" variant="primary" className="w-full" disabled={pending} onClick={submit}>
        {pending ? 'Enviando…' : 'Enviar solicitud'}
      </Button>
    </div>
  );
}
