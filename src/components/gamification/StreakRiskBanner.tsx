import { Chilo } from '@/components/mascot/Chilo';
import { streakAtRisk } from '@/lib/chilo/copy';

/**
 * Banner de "racha en riesgo" (F15 tarea 4): la racha sigue viva pero el
 * último día con actividad ya no es HOY (huso México) — sin estudiar antes de
 * medianoche, se rompe. Server-renderable, sin animación (el aviso ya es
 * urgente por sí mismo, no necesita movimiento).
 */
export function StreakRiskBanner({ days }: { days: number }) {
  const copy = streakAtRisk(days);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-streak/40 bg-streak/10 p-4">
      <Chilo variante="avatar" pose={copy.pose} size={48} />
      <p className="text-sm font-semibold text-text-primary">{copy.message}</p>
    </div>
  );
}
