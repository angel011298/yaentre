import type { EntrometroHistoryPoint } from '@/lib/db/progress';

const WIDTH = 600;
const HEIGHT = 160;
const PAD_X = 12;
const PAD_Y = 16;

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Formatea una clave YYYY-MM-DD sin pasar por `Date` — evita que el huso del
 *  servidor corra la fecha un día (mismo motivo que `toDateKey`, F11). */
function formatDayKey(key: string): string {
  const [, m, d] = key.split('-');
  return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]}`;
}

/**
 * Gráfico de línea de la evolución del Entrómetro (F18 tarea 1). Server
 * Component: es SVG estático, sin necesidad de JS en el cliente. El
 * `aria-label` da el resumen en texto para lectores de pantalla — un lector
 * no puede "ver" la línea, así que el dato (de X a Y) también viaja como
 * texto, no solo como trazo (UIUX Spec §12: color/forma nunca es el único
 * canal).
 */
export function EntrometroHistoryChart({ data }: { data: EntrometroHistoryPoint[] }) {
  if (data.length === 0) return null;

  if (data.length === 1) {
    return (
      <p className="text-sm text-text-secondary">
        Tu primer Entrómetro real: <span className="font-semibold text-text-primary">{data[0].predictedScore}</span>{' '}
        el {formatDayKey(data[0].date)}. Sigue practicando para ver tu evolución aquí.
      </p>
    );
  }

  const scores = data.map((d) => d.predictedScore);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;

  const stepX = (WIDTH - PAD_X * 2) / (data.length - 1);
  const points = data.map((d, i) => ({
    x: PAD_X + i * stepX,
    y: HEIGHT - PAD_Y - ((d.predictedScore - min) / range) * (HEIGHT - PAD_Y * 2),
    ...d,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const first = data[0];
  const last = data[data.length - 1];

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Evolución del Entrómetro: de ${first.predictedScore} aciertos el ${formatDayKey(first.date)} a ${last.predictedScore} aciertos el ${formatDayKey(last.date)}`}
      >
        <line
          x1={PAD_X}
          y1={HEIGHT - PAD_Y}
          x2={WIDTH - PAD_X}
          y2={HEIGHT - PAD_Y}
          stroke="var(--border-subtle)"
          strokeWidth={1}
        />
        {/* G63: `--brand-soft` en vez de `--brand-primary` — el morado sólido
            daba 3.0:1 sobre `bg-surface` oscuro, en el límite del 3:1 de WCAG
            2.4.11 para un trazo de datos. `--brand-soft` da ≥ 5.5:1 en dark y
            colapsa al morado en light. */}
        <path d={pathD} fill="none" stroke="var(--brand-soft)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p) => (
          <circle key={p.date} cx={p.x} cy={p.y} r={4} fill="var(--brand-soft)" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-text-muted" aria-hidden>
        <span>
          {formatDayKey(first.date)} · {first.predictedScore}
        </span>
        <span>
          {formatDayKey(last.date)} · {last.predictedScore}
        </span>
      </div>
    </div>
  );
}
