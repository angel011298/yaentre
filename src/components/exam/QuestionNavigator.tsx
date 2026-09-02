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
  // G63: `role="group"` con botones normales — antes era `role="tablist"`/
  // `role="tab"` sin la navegación por flechas ni `aria-controls` que exige el
  // patrón de tabs de WAI-ARIA (era ARIA roto). Cada botón sigue siendo
  // enfocable con Tab e informa su estado por `aria-label` (no solo por color).
  return (
    <div
      className="grid grid-cols-6 gap-2 sm:grid-cols-10"
      role="group"
      aria-label="Navegación entre preguntas del diagnóstico"
    >
      {Array.from({ length: total }, (_, i) => {
        const isCurrent = i === currentIndex;
        const isAnswered = answered[i];
        return (
          <button
            key={i}
            type="button"
            aria-current={isCurrent ? 'true' : undefined}
            aria-label={`Ir a la pregunta ${i + 1}${isCurrent ? ' (actual)' : ''}${
              isAnswered ? ', respondida' : ', sin responder'
            }`}
            onClick={() => onJump(i)}
            className={`flex min-h-touch min-w-touch items-center justify-center rounded-md border-2 text-xs font-semibold transition-all active:scale-[0.95] ${
              isCurrent
                ? 'border-brand bg-brand text-white'
                : isAnswered
                  ? 'border-success bg-success/10 text-success'
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
