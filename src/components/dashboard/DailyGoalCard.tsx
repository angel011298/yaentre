import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import type { DailyGoalProgress } from '@/lib/study/daily-goal';

/**
 * G100 — «Meta de hoy»: minutos estudiados contra la meta del perfil. El
 * avance va en texto además de en la barra (el color nunca es el único canal,
 * UIUX §12) y la barra es un `progressbar` con sus valores para lector de
 * pantalla.
 */
export function DailyGoalCard({ progress }: { progress: DailyGoalProgress }) {
  const { minutes, goal, percent, done } = progress;
  return (
    <Card className="flex min-h-[76px] items-center gap-4 p-4">
      <span aria-hidden="true" className="text-2xl">
        {done ? '✅' : '⏱️'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-text-primary">
            {done ? '¡Meta de hoy cumplida!' : 'Meta de hoy'}
          </p>
          <p className="font-mono text-sm tabular-nums text-text-secondary">
            {minutes} / {goal} min
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Avance de tu meta de estudio de hoy"
          aria-valuemin={0}
          aria-valuemax={goal}
          aria-valuenow={Math.min(minutes, goal)}
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-elevated"
        >
          <div
            className={`h-full rounded-full transition-all ${done ? 'bg-success' : 'bg-brand'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <Link
        href="/app/perfil#estudio"
        className="inline-flex min-h-touch shrink-0 items-center text-xs font-semibold text-brand-soft hover:underline"
      >
        Ajustar
      </Link>
    </Card>
  );
}
