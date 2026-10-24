import { getAdminContext } from '@/lib/admin/context';
import { calculateResicoStatusV2, RESICO_CEILING_CENTS, type MarketplaceRevenue } from '@/lib/admin/resico-monitor';
import { getResicoInputs } from '@/lib/db/payouts';
import { formatMxn } from '@/lib/format/mx';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Monitor RESICO' };

const SIGNAL = {
  GREEN: { label: 'Verde — holgado', box: 'bg-success-subtle' },
  YELLOW: { label: 'Amarillo — vigilar', box: 'bg-warning-subtle' },
  RED: { label: 'Rojo — actuar ya', box: 'bg-danger-subtle' },
} as const;

function RevenueBreakdown({ title, revenue }: { title: string; revenue: MarketplaceRevenue }) {
  return (
    <div className="space-y-1">
      <p className="font-semibold text-text-primary">
        {title} (peor caso): <span className="font-mono tabular-nums">{formatMxn(revenue.totalCents)}</span>
      </p>
      <ul className="space-y-0.5 pl-4 text-text-secondary">
        <li>
          Carril A, solo la comisión: <span className="font-mono tabular-nums">{formatMxn(revenue.carrils.A.commissionCents)}</span> (
          {revenue.carrils.A.count})
        </li>
        <li>
          Carril B, el total: <span className="font-mono tabular-nums">{formatMxn(revenue.carrils.B.totalCents)}</span> ({revenue.carrils.B.count})
        </li>
      </ul>
    </div>
  );
}

/**
 * G103 — monitor RESICO (spec del marketplace §10, PRIORIDAD ALTA, + §5.3 de
 * la spec de cursos): semáforo del ingreso del año contra el techo de $3.5 M.
 * El semáforo usa el PEOR CASO (todo como Carril B); el desglose por carril es
 * para decidir. No es una determinación fiscal: se revisa con el contador.
 */
export default async function AdminResicoPage() {
  await getAdminContext();
  const inputs = await getResicoInputs(new Date());
  const status = calculateResicoStatusV2(
    inputs.subscriptionRevenueCents,
    inputs.classRevenue,
    inputs.courseRevenue,
    inputs.dayOfYear,
    inputs.daysInYear
  );
  const signal = SIGNAL[status.signal];
  const barPct = Math.min(100, status.percentUsed);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">Monitor RESICO — año fiscal {inputs.year}</h1>
        <p className="text-sm text-text-secondary">
          Techo: {formatMxn(RESICO_CEILING_CENTS)}. Ingreso cobrado desde el 1 de enero (hora de la Ciudad de México), neto
          de reembolsos registrados. Herramienta de vigilancia, no un cálculo fiscal.
        </p>
      </div>

      <section className={`space-y-3 rounded-lg p-4 ${signal.box}`}>
        <p className="font-display text-lg font-bold text-text-primary">Estado: {signal.label}</p>
        <div>
          <div
            className="h-3 w-full overflow-hidden rounded-full bg-surface"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={barPct}
            aria-label="Porcentaje del techo RESICO usado"
          >
            <div className="h-full rounded-full bg-text-primary" style={{ width: `${barPct}%` }} />
          </div>
          <p className="mt-1 text-sm text-text-primary">
            Acumulado: <span className="font-mono tabular-nums">{formatMxn(status.yearToDateIncomeCents)}</span> ·{' '}
            {status.percentUsed} % del techo
          </p>
        </div>
        <p className="text-sm text-text-primary">{status.recommendation}</p>
      </section>

      <section className="space-y-3 rounded-lg border border-border-subtle bg-surface p-4 text-sm">
        <h2 className="font-display text-lg font-bold text-text-primary">Desglose</h2>
        <p className="font-semibold text-text-primary">
          Suscripciones y extensiones: <span className="font-mono tabular-nums">{formatMxn(status.subscriptionIncomeCents)}</span>
        </p>
        <RevenueBreakdown title="Clases" revenue={inputs.classRevenue} />
        <RevenueBreakdown title="Cursos" revenue={inputs.courseRevenue} />
        <p className="text-text-secondary">
          Si solo contara la comisión del Carril A:{' '}
          <span className="font-mono tabular-nums">{formatMxn(status.realisticIncomeCents)}</span>
        </p>
      </section>

      <section className="space-y-1 rounded-lg border border-border-subtle bg-surface p-4 text-sm">
        <p className="text-text-primary">
          Proyección lineal al 31 de diciembre: <span className="font-mono tabular-nums">{formatMxn(status.projectedAnnualCents)}</span>
        </p>
        {status.projectedOverCeiling && (
          <p role="alert" className="font-semibold text-danger">
            Al ritmo actual, el año rebasaría el techo del RESICO.
          </p>
        )}
        <p className="text-xs text-text-muted">Día {inputs.dayOfYear} de {inputs.daysInYear}.</p>
      </section>
    </div>
  );
}
