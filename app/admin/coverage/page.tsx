import { Card } from '@/components/ui/Card';
import { buildCoverageReport, COVERAGE_GOAL_VERIFIED } from '@/lib/db/content-coverage';

function pct(n: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((n / total) * 100);
}

export default async function CoveragePage() {
  const report = await buildCoverageReport();
  const grandTotal = report.totalVerified + report.totalPending;
  const goalPct = Math.min(100, pct(report.totalVerified, COVERAGE_GOAL_VERIFIED));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Cobertura de reactivos</h1>
        <p className="text-text-secondary">
          Progreso hacia la meta de {COVERAGE_GOAL_VERIFIED.toLocaleString('es-MX')} reactivos
          verificados (PRD §8).
        </p>
      </div>

      <Card className="space-y-3 p-6">
        <div className="flex items-baseline justify-between">
          <p className="font-display text-3xl font-bold text-brand">
            {report.totalVerified.toLocaleString('es-MX')}
          </p>
          <p className="text-sm text-text-secondary">
            de {COVERAGE_GOAL_VERIFIED.toLocaleString('es-MX')} verificados ({goalPct}%)
          </p>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-elevated">
          <div className="h-full bg-brand" style={{ width: `${goalPct}%` }} />
        </div>
        <p className="text-sm text-text-muted">
          {report.totalPending.toLocaleString('es-MX')} pendientes de revisión ·{' '}
          {grandTotal.toLocaleString('es-MX')} en el banco total
        </p>
      </Card>

      {report.areas.length === 0 ? (
        <Card className="p-8 text-center text-text-secondary">
          No hay áreas en la DB todavía. Siembra la taxonomía con{' '}
          <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs">
            pnpm prisma:seed
          </code>
          .
        </Card>
      ) : (
        <div className="space-y-4">
          {report.areas.map((area) => (
            <Card key={area.id} className="space-y-3 p-6">
              <h2 className="font-display text-lg font-semibold">{area.name}</h2>
              <div className="space-y-2">
                {area.subjects.map((subject) => {
                  const total = subject.verified + subject.pending;
                  const subjectPct = pct(subject.verified, total);
                  return (
                    <div key={subject.id} className="flex items-center gap-3 text-sm">
                      <span className="w-40 shrink-0 truncate text-text-secondary">
                        {subject.name}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-elevated">
                        <div className="h-full bg-success" style={{ width: `${subjectPct}%` }} />
                      </div>
                      <span className="w-28 shrink-0 text-right text-text-muted">
                        {subject.verified}✓ / {subject.pending}⧗ ({subjectPct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
