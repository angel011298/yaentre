'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { changeAcademicTargetAction } from '@/app/actions/profile';
import { Button } from '@/components/ui/Button';
import type { AcademicTargetCatalog } from '@/lib/db/academic-target';

const SELECT_CLASS =
  'min-h-touch w-full rounded-md border border-border-subtle bg-input px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand';

function locateCareer(
  catalog: AcademicTargetCatalog,
  careerId: string | null
): { examId: string; areaId: string } | null {
  for (const exam of catalog.exams)
    for (const area of exam.areas)
      if (area.careers.some((c) => c.id === careerId)) return { examId: exam.id, areaId: area.id };
  return null;
}

/**
 * G100 — meta académica: universidad/examen → área → carrera, en cascada.
 * Solo aparecen las opciones que el onboarding ofrecería hoy (flags y
 * cobertura de contenido). Cambiar de área avisa antes: cambia el temario,
 * las materias del Entrómetro y reinicia las materias a reforzar.
 */
export function AcademicTargetForm({
  catalog,
  currentCareerId,
}: {
  catalog: AcademicTargetCatalog;
  currentCareerId: string | null;
}) {
  const router = useRouter();
  const current = locateCareer(catalog, currentCareerId);

  const [examId, setExamId] = useState(current?.examId ?? catalog.exams[0]?.id ?? '');
  const exam = catalog.exams.find((e) => e.id === examId);
  const [areaId, setAreaId] = useState(current?.areaId ?? exam?.areas[0]?.id ?? '');
  const area = exam?.areas.find((a) => a.id === areaId);
  const [careerId, setCareerId] = useState(currentCareerId ?? '');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const careerInArea = area?.careers.some((c) => c.id === careerId) ? careerId : '';
  const areaChanged = current !== null && areaId !== current.areaId;
  const dirty = careerInArea !== '' && careerInArea !== currentCareerId;

  async function save() {
    if (!dirty) return;
    setPending(true);
    setMessage(null);
    const r = await changeAcademicTargetAction({ careerId: careerInArea });
    setPending(false);
    if (r.ok) {
      setMessage({ tone: 'ok', text: 'Tu meta se actualizó. Tu Entrómetro ya usa la nueva carrera.' });
      router.refresh();
    } else setMessage({ tone: 'error', text: r.message });
  }

  if (catalog.exams.length === 0) {
    return <p className="text-sm text-text-secondary">No hay exámenes disponibles en este momento.</p>;
  }

  return (
    <div className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text-secondary">Universidad y examen</span>
        <select
          className={SELECT_CLASS}
          value={examId}
          onChange={(e) => {
            const next = catalog.exams.find((x) => x.id === e.target.value);
            setExamId(e.target.value);
            setAreaId(next?.areas[0]?.id ?? '');
            setCareerId('');
          }}
        >
          {catalog.exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text-secondary">Área</span>
        <select
          className={SELECT_CLASS}
          value={areaId}
          onChange={(e) => {
            setAreaId(e.target.value);
            setCareerId('');
          }}
        >
          {exam?.areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text-secondary">Carrera</span>
        <select className={SELECT_CLASS} value={careerInArea} onChange={(e) => setCareerId(e.target.value)}>
          <option value="" disabled>
            Elige tu carrera
          </option>
          {area?.careers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {areaChanged && (
        <p className="rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
          Cambiar de área cambia tu temario y las materias de tu Entrómetro. Tu historial se
          conserva; las materias a reforzar se reinician.
        </p>
      )}

      <Button type="button" variant="secondary" disabled={!dirty || pending} onClick={() => void save()}>
        {pending ? 'Guardando…' : 'Guardar meta'}
      </Button>
      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`text-sm ${message.tone === 'error' ? 'text-danger' : 'text-success'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
