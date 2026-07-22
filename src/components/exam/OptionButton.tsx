import { LatexText } from '@/components/admin/LatexText';

interface Props {
  id: string;
  text: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Opción de reactivo del lado alumno. A diferencia de `admin/OptionCard`,
 * este componente NUNCA recibe `isCorrect` — ni siquiera como prop opcional —
 * porque vive en sesiones de evaluación donde revelar la respuesta antes de
 * tiempo rompería el guardrail de scoring server-side (CLAUDE.md).
 */
export function OptionButton({ id, text, selected, onClick, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex w-full min-h-touch items-start gap-3 rounded-md border p-3 text-left text-sm transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? 'border-brand bg-brand-tint text-text-primary'
          : 'border-border-subtle bg-surface text-text-secondary hover:border-brand-soft hover:bg-elevated'
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          selected ? 'bg-brand text-white' : 'bg-elevated text-text-muted'
        }`}
      >
        {id}
      </span>
      <span className="pt-0.5">
        <LatexText text={text} />
      </span>
    </button>
  );
}
