import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import type { ResicoSignal, ResicoStatus } from '@/lib/admin/resico-monitor';
import { formatMxnExact } from '@/lib/format/money';

/**
 * Presentación del monitor RESICO (spec del marketplace §10). Componente de
 * SERVIDOR y puramente presentacional: recibe el estado ya calculado.
 *
 * El color nunca es el único canal (WCAG): cada señal lleva su círculo, su
 * nombre escrito y su recomendación.
 */

const SIGNAL: Record<ResicoSignal, { dot: string; label: string; short: string }> = {
  GREEN: { dot: '🟢', label: 'VERDE — holgado', short: 'Verde' },
  YELLOW: { dot: '🟡', label: 'AMARILLO — atención', short: 'Amarillo' },
  RED: { dot: '🔴', label: 'ROJO — urgente', short: 'Rojo' },
};

export function ResicoMonitorCard({
  status,
  variant = 'full',
}: {
  status: ResicoStatus & { year: number };
  variant?: 'full' | 'compact';
}) {
  const sig = SIGNAL[status.signal];
  const barWidth = Math.min(100, status.percentUsed);

  const bar = (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-elevated"
      role="progressbar"
      aria-valuenow={Math.min(100, status.percentUsed)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Porcentaje del techo de RESICO usado"
    >
      <div className="h-full bg-brand" style={{ width: `${barWidth}%` }} />
    </div>
  );

  if (variant === 'compact') {
    return (
      <Card className="space-y-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">
            {sig.dot} Monitor RESICO — {status.year}
          </h2>
          <Link href="/admin/resico" className="text-sm font-medium text-brand hover:underline">
            Ver desglose
          </Link>
        </div>
        <p className="text-sm text-text-secondary">
          {formatMxnExact(status.yearToDateIncomeCents)} de {formatMxnExact(status.ceilingCents)} ({status.percentUsed}%
          · {sig.short}).
        </p>
        {bar}
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-5">
      <h2 className="font-display text-xl font-semibold">
        🚦 Monitor RESICO — Año fiscal {status.year}
      </h2>

      <div className="space-y-2">
        <p className="text-sm text-text-secondary">Techo: {formatMxnExact(status.ceilingCents)}</p>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-lg font-semibold">Acumulado: {formatMxnExact(status.yearToDateIncomeCents)}</p>
          <p className="text-sm font-medium">{status.percentUsed}%</p>
        </div>
        {bar}
      </div>

      <div>
        <h3 className="text-sm font-semibold">Desglose</h3>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Suscripciones</dt>
            <dd className="font-medium">{formatMxnExact(status.subscriptionIncomeCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Clases (peor caso)</dt>
            <dd className="font-medium">{formatMxnExact(status.classIncomeCents)}</dd>
          </div>
          <div className="flex justify-between gap-4 pl-4">
            <dt className="text-text-secondary">
              ├─ Carril A (solo comisión) · {status.carrilA.classes} clase{status.carrilA.classes === 1 ? '' : 's'}
            </dt>
            <dd className="font-medium">{formatMxnExact(status.carrilA.incomeCents)}</dd>
          </div>
          <div className="flex justify-between gap-4 pl-4">
            <dt className="text-text-secondary">
              └─ Carril B (valor completo) · {status.carrilB.classes} clase{status.carrilB.classes === 1 ? '' : 's'}
            </dt>
            <dd className="font-medium">{formatMxnExact(status.carrilB.incomeCents)}</dd>
          </div>
        </dl>
      </div>

      <p className="text-sm">
        Proyección anual: <strong>{formatMxnExact(status.projectedAnnualCents)}</strong> ({status.projectedPercentUsed}%
        del techo). Es una proyección lineal: en los primeros meses una sola venta la dispara, por eso no cambia el color.
      </p>

      <div className="space-y-1">
        <p className="text-sm font-semibold">
          Estado: {sig.dot} {sig.label}
        </p>
        <p className="text-sm">💡 {status.recommendation}</p>
        {status.migrationSavingsCents > 0 && (
          <p className="text-xs text-text-muted">
            Si todas las clases del Carril B pasaran al A, el ingreso computable bajaría{' '}
            {formatMxnExact(status.migrationSavingsCents)}.
          </p>
        )}
      </div>

      <div className="rounded-lg bg-elevated p-3 text-xs text-text-muted">
        <p>
          <strong>Cómo se mide.</strong> Base de efectivo (lo cobrado en el año fiscal, en hora de México, neto de lo
          devuelto). Los importes incluyen IVA: el techo de RESICO se mide sin IVA, así que este porcentaje sale
          más alto que el real, a propósito. Referencia sin IVA: {formatMxnExact(status.yearToDateExcludingIvaCents)} (
          {status.percentUsedExcludingIva}%). Techo teórico si todas las clases fueran Carril B:{' '}
          {formatMxnExact(status.subscriptionIncomeCents + status.classIncomeAllCarrilBCents)}.
        </p>
        <p className="mt-1">Pendiente de validar con el contador.</p>
      </div>
    </Card>
  );
}
