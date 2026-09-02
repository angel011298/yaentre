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
          ? 'border-brand bg-brand/10 text-text-primary'
          : 'border-border-subtle bg-surface text-text-secondary hover:border-brand-soft hover:bg-elevated';

  // G63: `bg-success/bg-danger` con texto blanco daba 2.3:1 / 3.8:1 — por
  // debajo del 3:1 que WCAG 2.4.11 exige para el ✓/✗ como ícono de estado.
  // `text-on-success`/`text-on-danger` son theme-aware (≥ 4.3:1).
  const badgeClass =
    reveal === 'correct'
      ? 'bg-success text-on-success'
      : reveal === 'incorrect'
        ? 'bg-danger text-on-danger'
        : selected
          ? 'bg-brand text-white'
          : 'bg-elevated text-text-muted';

  // Estado dicho también con palabra (no solo color + símbolo) para lectores
  // de pantalla.
  const stateWord =
    reveal === 'correct' ? 'Respuesta correcta: ' : reveal === 'incorrect' ? 'Respuesta incorrecta: ' : '';

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
        {stateWord && <span className="sr-only">{stateWord}</span>}
        <LatexText text={text} />
      </span>
    </button>
  );
}
