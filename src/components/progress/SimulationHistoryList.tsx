import Link from 'next/link';
import type { SimulationHistoryEntry } from '@/lib/db/progress';

/** Mismo formato que `RecentSimulations` (F11) — consistencia visual entre
 *  el dashboard y el historial completo. */
function formatDate(d: Date): string {
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Historial COMPLETO de simulacros (F18 tarea 1), a diferencia de la lista
 * corta del dashboard (`RecentSimulations`, F11 — solo los últimos 3, sin
 * enlace). Cada fila es un link real a la pantalla de resultados ya
 * existente (`/simulador?view=result&session=`, F12/F13) — no una tarjeta
 * muerta.
 */
export function SimulationHistoryList({ simulations }: { simulations: SimulationHistoryEntry[] }) {
  if (simulations.length === 0) return null;

  return (
    <ul className="divide-y divide-border-subtle">
      {simulations.map((sim) => (
        <li key={sim.id}>
          <Link
            href={`/simulador?view=result&session=${sim.id}`}
            className="flex min-h-touch items-center justify-between gap-3 py-3 transition-colors hover:text-brand-soft"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-text-primary">
                {sim.score ?? '—'}/{sim.totalQuestions} aciertos
              </p>
              <p className="text-xs text-text-muted">
                {formatDate(sim.finishedAt)}
                {sim.percentile != null ? ` · le ganaste al ${sim.percentile}%` : ''}
              </p>
            </div>
            <span aria-hidden className="shrink-0 text-text-muted">
              Ver resultados →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
