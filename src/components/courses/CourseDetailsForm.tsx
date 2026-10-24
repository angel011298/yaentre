'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCourseAction, updateCourseDetailsAction } from '@/app/actions/courses-teacher';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { COURSE_CATEGORY_LABELS, COURSE_LEVEL_LABELS } from '@/lib/courses/rules';
import { formatMxn } from '@/lib/format/mx';

export interface CourseDetailsValues {
  title: string;
  shortDescription: string;
  description: string;
  learningOutcomes: string[];
  category: keyof typeof COURSE_CATEGORY_LABELS;
  subjectArea: string;
  level: keyof typeof COURSE_LEVEL_LABELS;
  tags: string[];
  isFree: boolean;
  pricePesos: number;
  originalPricePesos: number | null;
}

const EMPTY: CourseDetailsValues = {
  title: '',
  shortDescription: '',
  description: '',
  learningOutcomes: [],
  category: 'REGULARIZACION',
  subjectArea: '',
  level: 'BASICO',
  tags: [],
  isFree: false,
  pricePesos: 299,
  originalPricePesos: null,
};

/**
 * G103 — datos del curso (crear o editar en borrador). Muestra al profesor lo
 * que recibe por venta (75 %) en pesos; el precio se valida otra vez en el
 * servidor. Descripción y objetivos son texto plano.
 */
export function CourseDetailsForm({
  mode,
  courseId,
  initial,
  needsTerms = false,
  disabled = false,
}: {
  mode: 'create' | 'edit';
  courseId?: string;
  initial?: CourseDetailsValues;
  needsTerms?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const router = useRouter();
  const [v, setV] = useState<CourseDetailsValues>(initial ?? EMPTY);
  const [outcomes, setOutcomes] = useState((initial?.learningOutcomes ?? []).join('\n'));
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '));
  const [terms, setTerms] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const payout = v.isFree ? 0 : Math.round(v.pricePesos * 100 * 0.75);

  async function submit() {
    setPending(true);
    setMessage(null);
    const payload = {
      ...v,
      learningOutcomes: outcomes.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 10),
      tags: tags.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 10),
      pricePesos: v.isFree ? 0 : v.pricePesos,
      originalPricePesos: v.isFree ? null : v.originalPricePesos,
      ...(mode === 'create' && needsTerms ? { acceptCourseTerms: terms ? (true as const) : undefined } : {}),
    };
    const r = mode === 'create' ? await createCourseAction(payload).catch(() => null) : await updateCourseDetailsAction({ ...payload, courseId }).catch(() => null);
    setPending(false);
    if (r?.ok) {
      if (mode === 'create' && 'id' in r.data) {
        router.push(`/profesor/cursos/${r.data.id}`);
        return;
      }
      setMessage({ tone: 'ok', text: 'Cambios guardados.' });
      router.refresh();
      return;
    }
    setMessage({ tone: 'error', text: r?.message ?? 'No pudimos guardar. Intenta de nuevo.' });
  }

  return (
    <div className="space-y-4">
      <TextField label="Título" name="title" value={v.title} maxLength={90} disabled={disabled} onChange={(e) => setV({ ...v, title: e.target.value })} />
      <TextField label="Descripción corta (para la tarjeta del catálogo)" name="shortDescription" value={v.shortDescription} maxLength={160} disabled={disabled} onChange={(e) => setV({ ...v, shortDescription: e.target.value })} />
      <div className="space-y-1.5">
        <label htmlFor={`${id}-desc`} className="text-sm font-medium text-text-secondary">Descripción completa</label>
        <textarea id={`${id}-desc`} rows={6} maxLength={6000} value={v.description} disabled={disabled} onChange={(e) => setV({ ...v, description: e.target.value })} className="w-full rounded-md border border-border-subtle bg-input p-3 text-text-primary" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${id}-out`} className="text-sm font-medium text-text-secondary">Lo que aprenderán (uno por renglón, máx. 10)</label>
        <textarea id={`${id}-out`} rows={4} value={outcomes} disabled={disabled} onChange={(e) => setOutcomes(e.target.value)} className="w-full rounded-md border border-border-subtle bg-input p-3 text-text-primary" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor={`${id}-cat`} className="text-sm font-medium text-text-secondary">Categoría</label>
          <select id={`${id}-cat`} value={v.category} disabled={disabled} onChange={(e) => setV({ ...v, category: e.target.value as CourseDetailsValues['category'] })} className="min-h-touch w-full rounded-md border border-border-subtle bg-input px-3 text-text-primary">
            {Object.entries(COURSE_CATEGORY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${id}-lvl`} className="text-sm font-medium text-text-secondary">Nivel</label>
          <select id={`${id}-lvl`} value={v.level} disabled={disabled} onChange={(e) => setV({ ...v, level: e.target.value as CourseDetailsValues['level'] })} className="min-h-touch w-full rounded-md border border-border-subtle bg-input px-3 text-text-primary">
            {Object.entries(COURSE_LEVEL_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>
        <TextField label="Materia (ej. matematicas)" name="subjectArea" value={v.subjectArea} maxLength={40} disabled={disabled} onChange={(e) => setV({ ...v, subjectArea: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} />
      </div>
      <TextField label="Etiquetas (separadas por coma)" name="tags" value={tags} disabled={disabled} onChange={(e) => setTags(e.target.value)} />

      <fieldset className="space-y-3 rounded-md border border-border-subtle p-3">
        <legend className="px-1 text-sm font-medium text-text-secondary">Precio</legend>
        <label className="flex min-h-touch items-center gap-3">
          <input type="checkbox" checked={v.isFree} disabled={disabled} onChange={(e) => setV({ ...v, isFree: e.target.checked })} className="h-5 w-5" />
          <span className="text-sm text-text-primary">Curso gratuito</span>
        </label>
        {!v.isFree && (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Precio en pesos (99 a 9,999)" name="pricePesos" type="number" inputMode="numeric" min={99} max={9999} value={String(v.pricePesos)} disabled={disabled} onChange={(e) => setV({ ...v, pricePesos: Math.trunc(Number(e.target.value) || 0) })} />
            <TextField label="Precio original (opcional, se muestra tachado)" name="originalPricePesos" type="number" inputMode="numeric" min={100} max={9999} value={v.originalPricePesos === null ? '' : String(v.originalPricePesos)} disabled={disabled} onChange={(e) => setV({ ...v, originalPricePesos: e.target.value ? Math.trunc(Number(e.target.value)) : null })} />
          </div>
        )}
        <p className="text-sm text-text-secondary" aria-live="polite">
          {v.isFree ? 'No recibes pago por un curso gratuito.' : `Recibirás ${formatMxn(payout)} por cada venta (75 %).`}
        </p>
        <p className="text-xs text-text-muted">Sugerencia: cursos de 1 a 3 horas, $199 a $499; de 3 a 10 horas, $499 a $999.</p>
      </fieldset>

      {mode === 'create' && needsTerms && (
        // TODO-CLO: condiciones de contenido para profesores (propiedad del contenido, prohibición de usar el banco de reactivos de YaEntre, reportes y moderación).
        <label className="flex min-h-touch items-start gap-3">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 h-5 w-5" />
          <span className="text-sm text-text-secondary">
            Acepto las condiciones de contenido de YaEntre: el contenido es mío o tengo derecho a usarlo, y no incluye reactivos ni material del banco de YaEntre.
          </span>
        </label>
      )}

      {!disabled && (
        <Button type="button" variant="primary" disabled={pending} onClick={() => void submit()}>
          {pending ? 'Guardando…' : mode === 'create' ? 'Crear curso' : 'Guardar cambios'}
        </Button>
      )}
      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`text-sm ${message.tone === 'ok' ? 'text-success' : 'text-danger'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
