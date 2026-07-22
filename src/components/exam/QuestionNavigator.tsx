interface Props {
  total: number;
  currentIndex: number;
  answered: boolean[];
  onJump: (index: number) => void;
}

/**
 * Navegador de preguntas del diagnóstico. A DIFERENCIA del simulador (que
 * solo avanza), aquí cada número es clicleable en cualquier momento — es la
 * pieza que implementa "SÍ permite regresar" (F-01 / F7 Task 1).
 */
export function QuestionNavigator({ total, currentIndex, answered, onJump }: Props) {
  return (
    <div
      className="grid grid-cols-6 gap-2 sm:grid-cols-10"
      role="tablist"
      aria-label="Navegación entre preguntas del diagnóstico"
    >
      {Array.from({ length: total }, (_, i) => {
        const isCurrent = i === currentIndex;
        const isAnswered = answered[i];
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={isCurrent}
            aria-label={`Pregunta ${i + 1}${isAnswered ? ', respondida' : ', sin responder'}`}
            onClick={() => onJump(i)}
            className={`flex min-h-touch min-w-touch items-center justify-center rounded-md border text-xs font-semibold transition-all active:scale-[0.95] ${
              isCurrent
                ? 'border-brand bg-brand text-white'
                : isAnswered
                  ? 'border-success/40 bg-success/10 text-success'
                  : 'border-border-subtle bg-surface text-text-muted hover:border-brand-soft'
            }`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
