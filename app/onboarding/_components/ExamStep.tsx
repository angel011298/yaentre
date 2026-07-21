import { selectExamAction } from '@/app/actions/onboarding';
import type { ExamOption } from '@/lib/db/onboarding';

const LEVEL_LABEL: Record<ExamOption['levelType'], string> = {
  SUPERIOR: 'Licenciatura',
  MEDIA_SUPERIOR: 'Bachillerato',
};

export function ExamStep({ options }: { options: ExamOption[] }) {
  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold">¿Qué examen vas a presentar?</h1>
        <p className="text-sm text-text-secondary">
          Con esto preparamos el temario, el simulador y tus metas de aciertos.
        </p>
      </header>

      {options.length === 0 ? (
        <p className="rounded-lg border border-border-subtle bg-surface p-4 text-sm text-text-secondary">
          No hay exámenes disponibles por el momento. Vuelve más tarde.
        </p>
      ) : (
        <div className="space-y-3">
          {options.map((option) => (
            <form key={option.id} action={selectExamAction}>
              <input type="hidden" name="examId" value={option.id} />
              <button
                type="submit"
                className="min-h-touch w-full rounded-lg border border-border-subtle bg-surface p-4 text-left transition-all hover:border-brand-soft hover:bg-elevated active:scale-[0.98]"
              >
                <p className="font-display text-base font-semibold text-text-primary">
                  {option.institutionName}
                </p>
                <p className="text-sm text-text-secondary">
                  {LEVEL_LABEL[option.levelType]} · {option.label}
                </p>
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
