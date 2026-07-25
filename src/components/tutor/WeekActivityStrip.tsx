import type { HeatmapDay } from '@/lib/db/dashboard';

const DAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const LEVEL_CLASS: Record<0 | 1 | 2, string> = {
  0: 'bg-elevated text-text-muted',
  1: 'bg-streak/30 text-text-primary',
  2: 'bg-streak text-white',
};

/**
 * "Actividad de la semana" del panel parental (F16 tarea 3, PRD F-06:
 * "Calendario semanal: días estudiados vs. días sin actividad"). Server
 * Component simple (sin SVG, sin cliente) en vez de reusar `HeatmapCalendar`
 * (F11): esa está pensada para 90 días de contribución estilo GitHub: a 7
 * días se lee peor que una fila de 7 casillas con su día de la semana.
 */
export function WeekActivityStrip({ data }: { data: HeatmapDay[] }) {
  return (
    <div className="flex justify-between gap-1.5">
      {data.map((d) => {
        // `d.date` ya es la fecha calendario México (YYYY-MM-DD) — se lee el
        // día de la semana en UTC para no reintroducir un offset.
        const weekday = new Date(`${d.date}T00:00:00Z`).getUTCDay();
        return (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-xs font-semibold text-text-muted">{DAY_LABELS[weekday]}</span>
            <div
              className={`h-8 w-full rounded-md ${LEVEL_CLASS[d.level]}`}
              title={d.date}
              aria-hidden
            />
          </div>
        );
      })}
    </div>
  );
}
