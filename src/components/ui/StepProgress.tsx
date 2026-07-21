/** Indicador visual de progreso por pasos (onboarding, y reusable en flujos futuros como checkout). */
export function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div
      className="flex items-center gap-2"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Paso ${current} de ${total}`}
    >
      {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
        <div
          key={step}
          className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
            step <= current ? 'bg-brand' : 'bg-border-subtle'
          }`}
        />
      ))}
    </div>
  );
}
