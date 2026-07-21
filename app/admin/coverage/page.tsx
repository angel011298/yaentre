import { Card } from '@/components/ui/Card';
import {
  buildCoverageReport,
  COVERAGE_GOAL_VERIFIED,
  HEALTHY_AUTO_APPROVAL_RATE,
} from '@/lib/db/content-coverage';

function pct(n: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((n / total) * 100);
}

function rateLabel(autoApproved: number, unpublished: number): string {
  const resolved = autoApproved + unpublished;
  if (resolved === 0) return '— sin corridas';
  return `${pct(autoApproved, resolved)}% auto-aprob.`;
}

export default async function CoveragePage() {
  const report = await buildCoverageReport();
  const grandTotal = report.totalVerified + report.totalPending;
  const goalPct = Math.min(100, pct(report.totalVerified, COVERAGE_GOAL_VERIFIED));

  const totalResolved = report.totalAutoApproved + report.totalUnpublished;
  const globalRate = totalResolved > 0 ? report.totalAutoApproved / totalResolved : null;
  const globalRateHealthy = globalRate !== null && globalRate >= HEALTHY_AUTO_APPROVAL_RATE;

  const totalGrounded = report.totalSourced + report.totalTemarioOnly;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Cobertura de reactivos</h1>
        <p className="text-text-secondary">
          Progreso hacia la meta de {COVERAGE_GOAL_VERIFIED.toLocaleString('es-MX')} reactivos
          verificados (PRD §8), salud del pipeline adversarial (F2) y anclaje en fuentes reales
          (F2b).
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
          {report.totalPending.toLocaleString('es-MX')} sin veredicto del pipeline aún ·{' '}
          {grandTotal.toLocaleString('es-MX')} en el banco total
        </p>
      </Card>

      {/* F2: salud del pipeline adversarial */}
      <Card className="space-y-2 p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Tasa de auto-aprobación global (pipeline adversarial)
        </p>
        {globalRate === null ? (
          <p className="text-sm text-text-secondary">Todavía no hay corridas del pipeline.</p>
        ) : (
          <>
            <div className="flex items-baseline gap-3">
              <p
                className={`font-display text-2xl font-bold ${
                  globalRateHealthy ? 'text-success' : 'text-danger'
                }`}
              >
                {(globalRate * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-text-muted">
                {report.totalAutoApproved.toLocaleString('es-MX')} auto-aprobados de{' '}
                {totalResolved.toLocaleString('es-MX')} evaluados
              </p>
            </div>
            {!globalRateHealthy && (
              <p className="text-sm text-danger">
                ⚠️ Por debajo de {HEALTHY_AUTO_APPROVAL_RATE * 100}%: el problema está en el{' '}
                <strong>generador</strong> — mejorar su system prompt, no revisar a mano en
                volumen.
              </p>
            )}
          </>
        )}
      </Card>

      {/* F2b: anclaje en fuentes reales */}
      <Card className="space-y-2 p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Anclaje en documentos fuente (F2b)
        </p>
        {totalGrounded === 0 ? (
          <p className="text-sm text-text-secondary">Todavía no hay reactivos generados.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-info">
              ⚓ {report.totalSourced.toLocaleString('es-MX')} con fuente real (
              {pct(report.totalSourced, totalGrounded)}%)
            </span>
            <span className="text-warning">
              📖 {report.totalTemarioOnly.toLocaleString('es-MX')} solo temario (
              {pct(report.totalTemarioOnly, totalGrounded)}%)
            </span>
          </div>
        )}
        <p className="text-sm text-text-muted">
          {report.totalTopicsWithChunks}/{report.totalTopics} temas del temario tienen al menos un
          fragmento fuente ·{' '}
          <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs">
            pnpm content:scan-sources
          </code>{' '}
          para ingerir material nuevo.
        </p>
      </Card>

      {/* F3: auto-aprobación por formato */}
      {report.byFormat.length > 0 && (
        <Card className="space-y-3 p-6">
          <h2 className="font-display text-lg font-semibold">Auto-aprobación por formato</h2>
          <div className="space-y-2">
            {report.byFormat.map((f) => {
              const resolved = f.autoApproved + f.unpublished;
              const formatPct = pct(f.autoApproved, resolved);
              return (
                <div key={f.format} className="flex items-center gap-3 text-sm">
                  <span className="w-52 shrink-0 truncate text-text-secondary">{f.format}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-elevated">
                    <div
                      className={`h-full ${formatPct >= HEALTHY_AUTO_APPROVAL_RATE * 100 ? 'bg-success' : 'bg-danger'}`}
                      style={{ width: `${formatPct}%` }}
                    />
                  </div>
                  <span className="w-32 shrink-0 text-right text-text-muted">
                    {f.autoApproved}✓ / {f.unpublished}✋ ({formatPct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

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
              <div className="space-y-3">
                {area.subjects.map((subject) => {
                  const total = subject.verified + subject.pending;
                  const subjectPct = pct(subject.verified, total);
                  const grounded = subject.sourced + subject.temarioOnly;
                  return (
                    <div key={subject.id} className="space-y-1">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="w-40 shrink-0 truncate text-text-secondary">
                          {subject.name}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-elevated">
                          <div
                            className="h-full bg-success"
                            style={{ width: `${subjectPct}%` }}
                          />
                        </div>
                        <span className="w-28 shrink-0 text-right text-text-muted">
                          {subject.verified}✓ / {subject.pending}⧗ ({subjectPct}%)
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-40 text-xs text-text-muted">
                        <span>{rateLabel(subject.autoApproved, subject.unpublished)}</span>
                        {grounded > 0 && (
                          <span>
                            ⚓ {subject.sourced} con fuente / {subject.temarioOnly} solo temario
                          </span>
                        )}
                        <span>
                          {subject.topicsWithChunks}/{subject.topicsTotal} temas con fuente
                        </span>
                      </div>
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
