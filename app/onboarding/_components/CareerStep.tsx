import Link from 'next/link';
import type { Area, Career } from '@prisma/client';
import { selectCareerAction } from '@/app/actions/onboarding';
import { CareerPicker } from '@/components/onboarding/CareerPicker';
import { Icon } from '@/components/ui/Icon';
import type { AreaCoverage } from '@/lib/content/coverage';
import { toCareerPickerItems } from '@/lib/content/career-picker';
import { areaPartialCoverage } from '@/lib/chilo/copy';

/**
 * Paso 3: carrera meta.
 *
 * G101: el área trae ahora TODAS las carreras de la oferta oficial (hasta 46
 * en IPN Físico-Matemáticas), así que la lista de botones de antes se volvió
 * un selector con búsqueda (`CareerPicker`). Cada carrera dice dónde se
 * imparte; la meta de aciertos aparece solo donde hay dato documentado.
 */
export function CareerStep({
  area,
  careers,
  coverage,
}: {
  area: Area;
  careers: Career[];
  /** G74 — cobertura del área ya elegida; sólo se muestra si es PARTIAL. */
  coverage?: AreaCoverage;
}) {
  const items = toCareerPickerItems(area.code, careers);

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <Link
          href="/onboarding"
          className="inline-flex min-h-touch items-center gap-1 text-sm font-medium text-brand-soft hover:underline"
        >
          <Icon name="chevronRight" className="h-4 w-4 rotate-180" />
          {area.name}
          <span className="sr-only">(cambiar de área)</span>
        </Link>
        <h1 className="font-display text-2xl font-bold">¿A qué carrera quieres entrar?</h1>
        <p className="text-sm text-text-secondary">
          Con su puntaje de referencia calculamos tu Entrómetro. Si todavía no tenemos el dato, tu
          avance se mide igual. Puedes cambiarla después desde tu perfil.
        </p>
      </header>

      {/* G74: se dice UNA vez y sin alarma. El área es utilizable; lo honesto
          es que el alumno sepa el hueco antes de invertir su tiempo, no que lo
          descubra cuando abra esa materia en práctica. */}
      {coverage?.status === 'PARTIAL' && (
        <p className="rounded-lg border border-border-subtle bg-surface p-3 text-sm text-text-muted">
          {areaPartialCoverage(coverage.pendingSubjectNames)}
        </p>
      )}

      {items.length === 0 ? (
        <p className="rounded-lg border border-border-subtle bg-surface p-4 text-sm text-text-secondary">
          Esta área todavía no tiene carreras cargadas. Elige otra área para continuar.
        </p>
      ) : (
        <CareerPicker mode="submit" items={items} action={selectCareerAction} />
      )}
    </div>
  );
}
