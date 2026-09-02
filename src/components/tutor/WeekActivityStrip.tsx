import type { HeatmapDay } from '@/lib/db/dashboard';

const DAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const LEVEL_TEXT: Record<0 | 1 | 2, string> = {
  0: 'sin actividad',
  1: 'sesión corta',
  2: 'sesión de 30+ min',
};

// G63 (accesibilidad): la casilla ya NO comunica el nivel solo con el color.
// Nivel 0 = contorno punteado vacío (forma distinta), 1 = relleno tenue con
// punto, 2 = relleno lleno con ✓. Y cada día lleva texto para lector de
// pantalla.
const LEVEL_CLASS: Record<0 | 1 | 2, string> = {
  0: 'border-2 border-dashed border-border-strong text-text-muted',
  1: 'bg-streak/25 text-text-primary',
  2: 'bg-streak text-on-streak',
};
const LEVEL_GLYPH: Record<0 | 1 | 2, string> = { 0: '', 1: '·', 2: '✓' };

/**
 * "Actividad de la semana" del panel parental (F16 tarea 3, PRD F-06:
 * "Calendario semanal: días estudiados vs. días sin actividad"). Server
 * Component simple (sin SVG, sin cliente) en vez de reusar `HeatmapCalendar`
 * (F11): esa está pensada para 90 días de contribución estilo GitHub: a 7
 * días se lee peor que una fila de 7 casillas con su día de la semana.
 */
export function WeekActivityStrip({ data }: { data: HeatmapDay[] }) {
  return (
    <ul className="flex justify-between gap-1.5" aria-label="Actividad de los últimos 7 días">
      {data.map((d) => {
        // `d.date` ya es la fecha calendario México (YYYY-MM-DD) — se lee el
        // día de la semana en UTC para no reintroducir un offset.
        const weekday = new Date(`${d.date}T00:00:00Z`).getUTCDay();
        return (
          <li key={d.date} className="flex flex-1 flex-col items-center gap-1">
            <span aria-hidden className="text-xs font-semibold text-text-muted">
              {DAY_LABELS[weekday]}
            </span>
            <span
              className={`flex h-8 w-full items-center justify-center rounded-md text-xs font-bold ${LEVEL_CLASS[d.level]}`}
            >
              <span aria-hidden>{LEVEL_GLYPH[d.level]}</span>
              <span className="sr-only">
                {DAY_NAMES[weekday]}: {LEVEL_TEXT[d.level]}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
