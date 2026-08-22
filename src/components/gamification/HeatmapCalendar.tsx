'use client';

import ReactCalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import type { HeatmapDay } from '@/lib/db/dashboard';

interface HeatmapValue {
  date: string;
  level: 0 | 1 | 2;
}

const LEVEL_LABEL: Record<0 | 1 | 2, string> = {
  0: 'sin actividad',
  1: 'sesión corta',
  2: 'sesión de 30+ min',
};

/**
 * Mapa de calor de actividad (F11 Task 5, UIUX Spec `HeatmapCalendar`). Los
 * NIVELES ya vienen calculados del servidor (`loadHeatmapData`, F11) — este
 * componente solo es responsable del render (por eso es 'use client': la
 * librería dibuja SVG vía DOM, no puede ser un Server Component).
 */
export function HeatmapCalendar({ data }: { data: HeatmapDay[] }) {
  if (data.length === 0) return null;

  const values: HeatmapValue[] = data.map((d) => ({ date: d.date, level: d.level }));

  return (
    <div className="yaentre-heatmap">
      <ReactCalendarHeatmap
        startDate={data[0].date}
        endDate={data[data.length - 1].date}
        values={values}
        gutterSize={2}
        showWeekdayLabels
        showMonthLabels
        classForValue={(value) => {
          const level = (value as HeatmapValue | undefined)?.level ?? 0;
          return `heatmap-level-${level}`;
        }}
        titleForValue={(value) => {
          const v = value as HeatmapValue | undefined;
          if (!v) return '';
          return `${v.date}: ${LEVEL_LABEL[v.level]}`;
        }}
      />
    </div>
  );
}
