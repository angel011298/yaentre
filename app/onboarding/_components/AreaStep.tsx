import type { Area } from '@prisma/client';
import { selectAreaAction } from '@/app/actions/onboarding';

/**
 * Selección de área/rama. El área elegida no se persiste en DB (ver
 * src/lib/onboarding/steps.ts): el Server Action solo redirige a
 * /onboarding?area=<id>, que el Paso 3 usa para filtrar carreras.
 */
export function AreaStep({ areas }: { areas: Area[] }) {
  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold">¿En qué área o rama vas a concursar?</h1>
        <p className="text-sm text-text-secondary">
          Cada área agrupa materias y carreras distintas — elige la tuya.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {areas.map((area) => (
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
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
