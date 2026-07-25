import { Card } from '@/components/ui/Card';
import type { CumulativeStats } from '@/lib/db/progress';

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours.toFixed(1)} h`;
}

/** Estadísticas acumuladas de todo el historial (F18 tarea 1): 4 tarjetas
 *  cortas, siempre visibles aunque estén en 0 (no hay nada que ocultar). */
export function CumulativeStatsGrid({ stats }: { stats: CumulativeStats }) {
  const tiles = [
    { label: 'Reactivos respondidos', value: stats.totalAnswered.toLocaleString('es-MX') },
    { label: 'Acierto global', value: `${Math.round(stats.overallHitRate * 100)}%` },
    { label: 'Horas de estudio', value: formatHours(stats.studyHours) },
    { label: 'Racha más larga', value: `${stats.longestStreak} día${stats.longestStreak === 1 ? '' : 's'}` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => (
        <Card key={t.label} className="p-4 text-center">
          <p className="font-mono text-2xl font-bold tabular-nums text-text-primary">{t.value}</p>
          <p className="mt-1 text-xs text-text-muted">{t.label}</p>
        </Card>
      ))}
    </div>
  );
}
