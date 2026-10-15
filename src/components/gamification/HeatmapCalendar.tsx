'use client';

import ReactCalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import type { HeatmapDay } from '@/lib/db/dashboard';
import { localDateFromKey } from '@/lib/paywall/mexico-time';

interface HeatmapValue {
  /** Lo que la librería usa para ubicar la casilla: mediodía LOCAL del día. */
  date: Date;
  /** La clave original del día en México (`YYYY-MM-DD`), para el título. */
  key: string;
  level: 0 | 1 | 2;
}

const LEVEL_LABEL: Record<0 | 1 | 2, string> = {
  0: 'sin actividad',
  1: 'sesión corta',
  2: 'sesión de 30+ min',
};

/** G100: la librería trae las etiquetas en inglés (Mon/Aug). La semana empieza
 *  en domingo (índice 0), igual que `Date.getDay()`. */
type Months = [string, string, string, string, string, string, string, string, string, string, string, string];
type Weekdays = [string, string, string, string, string, string, string];
const MONTH_LABELS: Months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const WEEKDAY_LABELS: Weekdays = ['', 'Lun', '', 'Mié', '', 'Vie', ''];

/**
 * Mapa de calor de actividad (F11 Task 5, UIUX Spec `HeatmapCalendar`). Los
 * NIVELES ya vienen calculados del servidor (`loadHeatmapData`, F11) — este
 * componente solo es responsable del render (por eso es 'use client': la
 * librería dibuja SVG vía DOM, no puede ser un Server Component).
 *
 * G100 — las fechas entran como `Date` LOCALES, nunca como texto. La librería
 * hacía `new Date('2026-10-15')` (medianoche UTC) y luego trabajaba con la
 * fecha local: en México el calendario terminaba AYER y la actividad de hoy se
 * pintaba en la casilla de ayer, y como Vercel corre en UTC el servidor y el
 * navegador dibujaban calendarios distintos (error de hidratación #418 en el
 * tablero, medido en producción con el navegador en hora de México y en UTC).
 * Los valores van a MEDIODÍA local: la librería ubica la casilla con
 * `Math.floor(diferencia / 24 h)`, y un día de cambio de horario (23 o 25 h,
 * p. ej. en la frontera norte) no puede moverlos de casilla desde ahí.
 */
/**
 * G100 — la librería cuenta `startDate` como EXCLUSIVO: calcula los días como
 * `ceil((fin − inicio) / 24 h)` y arranca en `fin − días + 1`. Pasándole el
 * primer día, el calendario mostraba 89 de los 90 días que el servidor manda
 * (medido: primera casilla el 19-jul con datos desde el 18-jul).
 */
function dayBefore(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
}

export function HeatmapCalendar({ data }: { data: HeatmapDay[] }) {
  if (data.length === 0) return null;

  const values: HeatmapValue[] = data.map((d) => ({
    date: localDateFromKey(d.date, 12),
    key: d.date,
    level: d.level,
  }));

  // G63: el heatmap SVG comunica la actividad solo con color. `role="img"` +
  // un resumen en texto da a un lector de pantalla lo esencial.
  const activeDays = data.filter((d) => d.level > 0).length;
  const longDays = data.filter((d) => d.level === 2).length;
  const summary =
    `Mapa de actividad de los últimos ${data.length} días: ${activeDays} con estudio` +
    (longDays > 0 ? `, de los cuales ${longDays} de 30 minutos o más.` : '.');

  return (
    <div className="yaentre-heatmap" role="img" aria-label={summary}>
      <ReactCalendarHeatmap
        startDate={dayBefore(localDateFromKey(data[0].date))}
        endDate={localDateFromKey(data[data.length - 1].date)}
        values={values}
        gutterSize={2}
        showWeekdayLabels
        showMonthLabels
        monthLabels={MONTH_LABELS}
        weekdayLabels={WEEKDAY_LABELS}
        classForValue={(value) => {
          const level = (value as HeatmapValue | undefined)?.level ?? 0;
          return `heatmap-level-${level}`;
        }}
        titleForValue={(value) => {
          const v = value as HeatmapValue | undefined;
          if (!v) return '';
          return `${v.key}: ${LEVEL_LABEL[v.level]}`;
        }}
      />
    </div>
  );
}
