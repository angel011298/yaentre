'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { updateTargetCareerAction } from '@/app/actions/profile';
import { CareerPicker } from '@/components/onboarding/CareerPicker';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import type { CareerOption } from '@/lib/db/profile';

/**
 * Cambiar la carrera meta (F17 tarea 2). Al guardar, `router.refresh()`
 * vuelve a pedir el dashboard/Entrómetro al servidor — que ya lee
 * `targetCareerId` fresco (`computeCareerStrategy`, F6), así el hueco contra
 * la nueva meta aparece recalculado sin lógica adicional aquí.
 *
 * G101: era un `<select>` con el nombre y «(~N aciertos)». Con la oferta
 * oficial completa (hasta 46 carreras por área) se usa el mismo selector con
 * búsqueda del onboarding, que además dice dónde se imparte cada carrera.
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

  const current = options.find((o) => o.id === currentCareerId);
  const changed = Boolean(careerId) && careerId !== currentCareerId;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!changed) return;
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
      <div>
        <p className="text-sm font-semibold text-text-primary">Carrera meta</p>
        {current && <p className="text-sm text-text-secondary">Actual: {current.name}</p>}
      </div>
      <div className="max-h-[28rem] overflow-y-auto rounded-lg">
        <CareerPicker
          mode="select"
          surface="surface"
          items={options}
          selectedId={careerId || null}
          onSelect={(id) => {
            setCareerId(id);
            setSaved(false);
          }}
        />
      </div>
      <Button type="submit" variant="secondary" disabled={pending || !changed}>
        {pending ? 'Guardando…' : 'Actualizar meta'}
      </Button>
      {saved && (
        <p role="status" className="inline-flex items-center gap-1.5 text-sm text-success">
          <Icon name="check" className="h-4 w-4" />
          Meta actualizada — tu Entrómetro ya refleja el nuevo hueco.
        </p>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </form>
  );
}
