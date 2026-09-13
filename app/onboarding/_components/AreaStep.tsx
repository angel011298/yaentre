import { selectAreaAction } from '@/app/actions/onboarding';
import type { AreaOption } from '@/lib/db/onboarding';
import { areaPartialCoverage } from '@/lib/tino/copy';
import { AreaComingSoonCard } from './AreaComingSoonCard';

/**
 * Selección de área/rama. El área elegida no se persiste en DB (ver
 * src/lib/onboarding/steps.ts): el Server Action solo redirige a
 * /onboarding?area=<id>, que el Paso 3 usa para filtrar carreras.
 *
 * G74 — cobertura de contenido. Antes las áreas se ofrecían todas por igual:
 * un aspirante de IPN «Ciencias Sociales y Administrativas» elegía su rama sin
 * saber que 4 de sus 7 materias estaban en cero, y lo descubría a mitad del
 * diagnóstico. Ahora cada tarjeta se pinta según su cobertura REAL, leída de
 * la base (`@/lib/db/area-coverage`):
 *
 *   · READY       — igual que siempre, sin ruido.
 *   · PARTIAL     — se elige normal, con una línea que dice qué materia falta.
 *   · COMING_SOON — no es un botón: es una tarjeta honesta con el motivo y un
 *                   «avísame». Se sigue VIENDO (ver el porqué en
 *                   @/lib/content/coverage) para que el aspirante sepa que su
 *                   rama existe y está en camino, no que no la cubrimos.
 */
export function AreaStep({
  areas,
  showUnavailableNotice = false,
}: {
  areas: AreaOption[];
  showUnavailableNotice?: boolean;
}) {
  const selectable = areas.filter((a) => a.selectable);
  const pending = areas.filter((a) => !a.selectable);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold">¿En qué área o rama vas a concursar?</h1>
        <p className="text-sm text-text-secondary">
          Cada área agrupa materias y carreras distintas — elige la tuya.
        </p>
      </header>

      {showUnavailableNotice && pending.length > 0 && (
        <p
          role="alert"
          className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-text-primary"
        >
          Esa rama todavía no está lista — <strong>abre próximamente</strong>. Aquí abajo te
          decimos qué le falta y cómo avisarte en cuanto esté.
        </p>
      )}

      {selectable.length === 0 && pending.length === 0 && (
        <p className="rounded-lg border border-border-subtle bg-surface p-4 text-sm text-text-secondary">
          Todavía no hay áreas configuradas para este examen. Vuelve más tarde.
        </p>
      )}

      {selectable.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {selectable.map(({ area, coverage }) => (
            <form key={area.id} action={selectAreaAction}>
              <input type="hidden" name="areaId" value={area.id} />
              <button
                type="submit"
                className="flex min-h-touch w-full flex-col gap-2 rounded-lg border border-border-subtle bg-surface p-4 text-left transition-all hover:border-brand-soft hover:bg-elevated active:scale-[0.98]"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full text-lg"
                  style={{ backgroundColor: `${area.colorHex}26` }}
                  aria-hidden
                >
                  {area.iconEmoji ?? '📘'}
                </span>
                <span className="font-display text-sm font-semibold text-text-primary">
                  {area.name}
                </span>
                {coverage.status === 'PARTIAL' && (
                  <span className="text-xs text-text-muted">
                    {areaPartialCoverage(coverage.pendingSubjectNames)}
                  </span>
                )}
              </button>
            </form>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary">Próximamente</h2>
          {pending.map(({ area, coverage }) => (
            <AreaComingSoonCard
              key={area.id}
              areaId={area.id}
              areaName={area.name}
              colorHex={area.colorHex}
              iconEmoji={area.iconEmoji}
              pendingSubjectNames={coverage.pendingSubjectNames}
              hasAlternatives={selectable.length > 0}
            />
          ))}
        </section>
      )}
    </div>
  );
}
