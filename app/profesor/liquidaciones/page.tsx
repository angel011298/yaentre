import { notFound } from 'next/navigation';
import { getTeacherPayoutOverview } from '@/lib/db/payouts';
import { formatMexicoDate, formatMxn, maskTail } from '@/lib/format/mx';
import { anyMarketplaceOn, readMarketplaceFlags } from '@/lib/marketplace/flags';
import { getTeacherPageContext } from '@/lib/teachers/guard';
import { PAYOUT_RULES } from '@/lib/teachers/payout-calculator';
import { payoutPeriodLabel, payoutReference, PAYOUT_STATUS_LABELS } from '@/lib/teachers/payout-sheet';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mis liquidaciones' };

/**
 * G103 — liquidaciones del profesor (spec del marketplace §8). Solo lo suyo:
 * el profesor sale de la sesión. Muestra el saldo que se está acumulando, la
 * reserva retenida y cada liquidación con su desglose por fuente.
 */
export default async function ProfesorLiquidacionesPage() {
  const { teacher } = await getTeacherPageContext('/profesor/liquidaciones');
  if (!anyMarketplaceOn(readMarketplaceFlags())) notFound();
  const { payouts, preview, heldRetentionCents, nextReleaseAt } = await getTeacherPayoutOverview(teacher.id, new Date());
  const accumulating = preview.netCents;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-text-primary">Mis liquidaciones</h1>
        <p className="text-sm text-text-secondary">
          Cada semana (de lunes a domingo) se liquida tu parte, el 75 %, de las clases que impartiste y de los cursos que
          vendiste, por SPEI a la CLABE {maskTail(teacher.clabe)}. Se retiene el 15 % durante 30 días como reserva de
          desempeño; después se te paga en una liquidación posterior.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 rounded-lg border border-border-subtle bg-surface p-4">
          <p className="text-sm text-text-secondary">Saldo en curso</p>
          <p className="font-mono text-2xl font-bold tabular-nums text-text-primary">{formatMxn(Math.max(0, accumulating))}</p>
          <p className="text-xs text-text-muted">
            {accumulating < PAYOUT_RULES.MIN_PAYOUT_CENTS
              ? `Se liquida al acumular ${formatMxn(PAYOUT_RULES.MIN_PAYOUT_CENTS)}.`
              : 'Entra en la próxima liquidación semanal.'}
            {preview.adjustmentCents < 0 ? ` Incluye ${formatMxn(-preview.adjustmentCents)} de descuento por reembolsos.` : ''}
          </p>
        </div>
        <div className="space-y-1 rounded-lg border border-border-subtle bg-surface p-4">
          <p className="text-sm text-text-secondary">Reserva retenida</p>
          <p className="font-mono text-2xl font-bold tabular-nums text-text-primary">{formatMxn(heldRetentionCents)}</p>
          <p className="text-xs text-text-muted">
            {nextReleaseAt ? `La siguiente se libera el ${formatMexicoDate(nextReleaseAt)}.` : 'Sin reservas retenidas.'}
          </p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold text-text-primary">Historial</h2>
        {payouts.length === 0 ? (
          <p className="rounded-lg border border-border-subtle bg-surface p-4 text-sm text-text-secondary">
            Aquí aparecerá cada liquidación semanal en cuanto se calcule.
          </p>
        ) : (
          <ul className="space-y-2">
            {payouts.map((p) => (
              <li key={p.id} className="space-y-2 rounded-lg border border-border-subtle bg-surface p-4 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-text-primary">Semana {payoutPeriodLabel(p.periodStart, p.periodEnd)}</p>
                  <p className="text-text-secondary">{PAYOUT_STATUS_LABELS[p.status] ?? p.status}</p>
                </div>
                <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5">
                  <dt className="text-text-secondary">Clases impartidas ({p.classCount})</dt>
                  <dd className="text-right font-mono tabular-nums text-text-primary">{formatMxn(p.classRevenueCents)}</dd>
                  <dt className="text-text-secondary">Cursos vendidos ({p.enrollmentCount})</dt>
                  <dd className="text-right font-mono tabular-nums text-text-primary">{formatMxn(p.courseRevenueCents)}</dd>
                  <dt className="text-text-secondary">Reserva (15 %)</dt>
                  <dd className="text-right font-mono tabular-nums text-text-primary">−{formatMxn(p.retentionCents)}</dd>
                  {p.releasedRetentionCents > 0 && (
                    <>
                      <dt className="text-text-secondary">Reservas liberadas</dt>
                      <dd className="text-right font-mono tabular-nums text-text-primary">+{formatMxn(p.releasedRetentionCents)}</dd>
                    </>
                  )}
                  {p.adjustmentCents !== 0 && (
                    <>
                      <dt className="text-text-secondary">Ajustes por reembolsos</dt>
                      <dd className="text-right font-mono tabular-nums text-text-primary">
                        {p.adjustmentCents < 0 ? '−' : '+'}
                        {formatMxn(Math.abs(p.adjustmentCents))}
                      </dd>
                    </>
                  )}
                  <dt className="font-semibold text-text-primary">Neto</dt>
                  <dd className="text-right font-mono tabular-nums font-semibold text-text-primary">{formatMxn(p.netCents)}</dd>
                </dl>
                <p className="text-xs text-text-muted">
                  Referencia {payoutReference(p.id)}
                  {p.transferredAt ? ` · transferida el ${formatMexicoDate(p.transferredAt)}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
