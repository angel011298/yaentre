import type { Area, Career } from '@prisma/client';
import { selectCareerAction } from '@/app/actions/onboarding';
import { formatEntrometroTarget } from '@/lib/adaptive/entrometro';
import type { AreaCoverage } from '@/lib/content/coverage';
import { areaPartialCoverage } from '@/lib/tino/copy';

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
  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-sm font-medium text-brand-soft">{area.name}</p>
        <h1 className="font-display text-2xl font-bold">¿Cuál es tu carrera meta?</h1>
        <p className="text-sm text-text-secondary">
          Usamos esto para calcular tu Entrómetro contra una meta de referencia.
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

      {careers.length === 0 ? (
        <p className="rounded-lg border border-border-subtle bg-surface p-4 text-sm text-text-secondary">
          Esta área todavía no tiene carreras cargadas. Elige otra área para continuar.
        </p>
      ) : (
        <div className="space-y-3">
          {careers.map((career) => {
            const target = formatEntrometroTarget({
              minAciertos: career.minAciertos,
              minAciertosYear: career.minAciertosYear,
              minAciertosConfidence: career.minAciertosConfidence,
            });

            return (
              <form key={career.id} action={selectCareerAction}>
                <input type="hidden" name="careerId" value={career.id} />
                <button
                  type="submit"
                  className="min-h-touch w-full rounded-lg border border-border-subtle bg-surface p-4 text-left transition-all hover:border-brand-soft hover:bg-elevated active:scale-[0.98]"
                >
                  <p className="font-display text-base font-semibold text-text-primary">
                    {career.name}
                  </p>
                  {target.hasTarget ? (
                    <p className="mt-1 text-sm text-text-secondary">
                      <span className="font-semibold text-brand-soft">{target.qualifier}</span>{' '}
                      {target.label}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-text-muted">{target.disclaimer}</p>
                  )}
                </button>
              </form>
            );
          })}
        </div>
      )}
    </div>
  );
}
