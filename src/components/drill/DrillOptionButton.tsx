import { LatexText } from '@/components/admin/LatexText';

export type OptionReveal = 'correct' | 'incorrect' | 'neutral' | null;

interface Props {
  id: string;
  text: string;
  selected: boolean;
  reveal: OptionReveal;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Opción de reactivo del drill (F14 tarea 3): a diferencia de `exam/OptionButton`
 * (que NUNCA revela correctitud, para sesiones de evaluación), esta SÍ pinta un
 * estado post-respuesta — porque el drill revela al instante
 * (`revealsCorrectnessOnSubmit` ya es `true` para TOPIC_DRILL/AREA_PRACTICE,
 * F2/F6). Color + ícono + texto siempre juntos (nunca solo color — regla de
 * accesibilidad, CLAUDE.md).
 */
export function DrillOptionButton({ id, text, selected, reveal, onClick, disabled }: Props) {
  const toneClass =
    reveal === 'correct'
      ? 'border-success bg-success/10 text-text-primary'
      : reveal === 'incorrect'
        ? 'border-danger bg-danger/10 text-text-primary'
        : selected
          ? 'border-brand bg-brand-tint text-text-primary'
          : 'border-border-subtle bg-surface text-text-secondary hover:border-brand-soft hover:bg-elevated';

  const badgeClass =
    reveal === 'correct'
      ? 'bg-success text-white'
      : reveal === 'incorrect'
        ? 'bg-danger text-white'
        : selected
          ? 'bg-brand text-white'
          : 'bg-elevated text-text-muted';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex w-full min-h-touch items-start gap-3 rounded-md border p-3 text-left text-sm transition-all active:scale-[0.99] disabled:cursor-not-allowed ${toneClass}`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${badgeClass}`}
        aria-hidden
      >
        {reveal === 'correct' ? '✓' : reveal === 'incorrect' ? '✗' : id}
      </span>
      <span className="pt-0.5">
        <LatexText text={text} />
      </span>
    </button>
  );
}
