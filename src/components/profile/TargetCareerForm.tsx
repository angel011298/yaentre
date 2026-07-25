'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { updateTargetCareerAction } from '@/app/actions/profile';
import { Button } from '@/components/ui/Button';
import type { CareerOption } from '@/lib/db/profile';

/**
 * Cambiar la carrera meta (F17 tarea 2). Al guardar, `router.refresh()`
 * vuelve a pedir el dashboard/Aciertómetro al servidor — que ya lee
 * `targetCareerId` fresco (`computeCareerStrategy`, F6), así el hueco contra
 * la nueva meta aparece recalculado sin lógica adicional aquí.
 */
export function TargetCareerForm({
  options,
  currentCareerId,
}: {
  options: CareerOption[];
  currentCareerId: string | null;
}) {
  const router = useRouter();
  const [careerId, setCareerId] = useState(currentCareerId ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (options.length === 0) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!careerId || careerId === currentCareerId) return;
    setPending(true);
    setError(null);
    setSaved(false);
    const result = await updateTargetCareerAction({ careerId });
    setPending(false);
    if (result.ok) {
      setSaved(true);
      router.refresh();
    } else {
      setError(result.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label htmlFor="careerId" className="block text-sm font-semibold text-text-primary">
        Carrera meta
      </label>
      <select
        id="careerId"
        value={careerId}
        onChange={(e) => {
          setCareerId(e.target.value);
          setSaved(false);
        }}
        className="min-h-touch w-full rounded-[12px] border border-border-subtle bg-input px-3 text-text-primary outline-none focus:border-border-strong"
      >
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.minAciertos != null ? ` (~${c.minAciertos} aciertos)` : ''}
          </option>
        ))}
      </select>
      <Button type="submit" variant="secondary" disabled={pending || careerId === currentCareerId}>
        {pending ? 'Guardando…' : 'Actualizar meta'}
      </Button>
      {saved && <p className="text-sm text-success">Meta actualizada — tu Aciertómetro ya refleja el nuevo hueco.</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
