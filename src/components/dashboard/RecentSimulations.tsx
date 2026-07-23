import type { RecentSimulation } from '@/lib/db/dashboard';

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function RecentSimulations({ simulations }: { simulations: RecentSimulation[] }) {
  return (
    <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-surface">
      {simulations.map((sim) => (
        <li key={sim.id} className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="font-semibold text-text-primary">
              {sim.score ?? '—'}/{sim.totalQuestions} aciertos
            </p>
            <p className="text-xs text-text-muted">{formatDate(sim.finishedAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
