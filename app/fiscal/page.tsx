import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { ResicoMonitorCard } from '@/components/admin/ResicoMonitorCard';
import { dueStatus, mexicoMonthOf, monthKey, monthRangeUtc, type DueStatus } from '@/lib/admin/fiscal';
import { requireCapability } from '@/lib/auth/guards';
import { getFiscalSnapshot } from '@/lib/db/fiscal';
import { getResicoStatus } from '@/lib/db/resico';
import { formatMexicoDate, formatMonthLabel } from '@/lib/format/dates';
import { formatMxnExact } from '@/lib/format/money';
import { FIRST_FISCAL_YEAR, parseFiscalYear } from '@/lib/api/fiscal-params';

export const metadata = { title: 'Tablero fiscal' };
export const dynamic = 'force-dynamic';

const DUE: Record<DueStatus, string> = {
  OVERDUE: '🔴 Vencido',
  DUE_SOON: '🟠 Vence pronto',
  UPCOMING: '⏳ Próximo',
  NO_ACTIVITY: '—',
};

/**
 * Tablero fiscal (Bloque 3): IVA por enterar, retenciones del día 17 y saldos de
 * la reserva de desempeño. SOLO LECTURA — el contador y el admin lo ven
 * (`fiscal.read`); ninguna acción sale de aquí.
 *
 * Es un tablero de CONTROL calculado con lo que el sistema sabe, no una
 * declaración: el IVA acreditable vive en las facturas recibidas y no está
 * aquí, y las retenciones se muestran como ESCENARIOS porque dos decisiones
 * siguen abiertas. Cada pantalla lo dice en voz alta.
 */
export default async function FiscalDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireCapability('fiscal.read');

  const now = new Date();
  const sp = await searchParams;
  const parsed = parseFiscalYear(sp.year ?? null, now);
  const currentYear = mexicoMonthOf(now).year;
  const year = parsed.ok ? parsed.year : currentYear;

  const [snap, resico] = await Promise.all([getFiscalSnapshot(year, now), getResicoStatus(now)]);
  const c = snap.coverage;
  // El mes cerrado más reciente con movimiento: es el que toca enterar. Solo aplica al año en curso.
  const closedWithActivity = snap.months.filter(
    (m) => m.movements > 0 && monthRangeUtc(m.month).endUtc.getTime() <= now.getTime()
  );
  const next = year === currentYear ? closedWithActivity.at(-1) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Tablero fiscal</h1>
          <p className="text-text-secondary">
            Ingreso propio, IVA trasladado y obligaciones del día 17. Solo lectura, en hora de México.
          </p>
        </div>
        <nav className="flex items-center gap-2 text-sm" aria-label="Año fiscal">
          {year > FIRST_FISCAL_YEAR && (
            <Link href={`/fiscal?year=${year - 1}`} className="rounded-md bg-elevated px-3 py-1.5">
              ← {year - 1}
            </Link>
          )}
          <span className="rounded-md bg-brand px-3 py-1.5 font-medium text-white">{year}</span>
          {year < currentYear && (
            <Link href={`/fiscal?year=${year + 1}`} className="rounded-md bg-elevated px-3 py-1.5">
              {year + 1} →
            </Link>
          )}
        </nav>
      </div>

      <ResicoMonitorCard status={resico} variant="compact" />

      <Card className="space-y-2 p-4">
        <h2 className="font-display text-lg font-semibold">Próximo vencimiento</h2>
        {next ? (
          <p className="text-sm">
            <strong>{formatMonthLabel(next.month)}</strong>: IVA trasladado{' '}
            <strong>{formatMxnExact(next.ivaCents)}</strong> (antes de acreditar). Vence el{' '}
            <strong>{formatMexicoDate(next.dueDate)}</strong> · {DUE[dueStatus(next, now)]}.
          </p>
        ) : (
          <p className="text-sm text-text-secondary">Todavía no hay un mes cerrado con movimiento.</p>
        )}
        <p className="text-xs text-text-muted">
          La fecha es el 17 del mes siguiente, recorrida al lunes si cae en fin de semana. No considera días festivos:
          el contador confirma la fecha real.
        </p>
      </Card>

      <Card className="p-4">
        <h2 className="font-display text-lg font-semibold">IVA por mes — {year}</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Base de efectivo (lo cobrado en el mes), IVA del 16% incluido en el precio. El IVA se calcula sobre el total
          del mes, como lo dirá el CFDI global mensual. Es el IVA <strong>trasladado</strong>: el IVA acreditable (el de
          las comisiones de Stripe, el hosting, etc.) está en las facturas recibidas y lo aplica el contador.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <caption className="sr-only">Ingreso propio e IVA trasladado por mes</caption>
            <thead className="border-b border-border-subtle text-xs text-text-muted">
              <tr>
                <th scope="col" className="py-2 pr-3 font-medium">Mes</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Suscripciones</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Clases A (comisión)</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Clases B (total)</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Devoluciones</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Ingreso propio</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Base sin IVA</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">IVA trasladado</th>
                <th scope="col" className="px-2 py-2 font-medium">Vence</th>
                <th scope="col" className="py-2 pl-2 font-medium">CSV</th>
              </tr>
            </thead>
            <tbody>
              {snap.months.map((m) => {
                const status = dueStatus(m, now);
                const favor = m.ownIncomeGrossCents < 0;
                return (
                  <tr key={m.key} className="border-b border-border-subtle last:border-0">
                    <th scope="row" className="py-2 pr-3 font-medium">{formatMonthLabel(m.month)}</th>
                    <td className="px-2 py-2 text-right tabular-nums">{formatMxnExact(m.subscriptionsGrossCents)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatMxnExact(m.classCarrilACommissionCents)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatMxnExact(m.classCarrilBGrossCents)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {m.subscriptionRefundsCents > 0 ? `−${formatMxnExact(m.subscriptionRefundsCents)}` : formatMxnExact(0)}
                    </td>
                    <td className="px-2 py-2 text-right font-medium tabular-nums">{formatMxnExact(m.ownIncomeGrossCents)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatMxnExact(m.baseCents)}</td>
                    <td className="px-2 py-2 text-right font-medium tabular-nums">
                      {formatMxnExact(m.ivaCents)}
                      {favor && <span className="block text-xs font-normal text-info">saldo a favor</span>}
                    </td>
                    <td className="px-2 py-2 text-xs">
                      {status === 'NO_ACTIVITY' ? '—' : `${formatMexicoDate(m.dueDate)} · ${DUE[status]}`}
                    </td>
                    <td className="py-2 pl-2">
                      {m.movements > 0 ? (
                        <a
                          href={`/api/fiscal/export?month=${monthKey(m.month)}`}
                          className="text-brand hover:underline"
                          aria-label={`Descargar el CSV de ${formatMonthLabel(m.month)}`}
                        >
                          ↓
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border-subtle font-semibold">
                <th scope="row" className="py-2 pr-3">Año {year}</th>
                <td className="px-2 py-2 text-right tabular-nums">{formatMxnExact(snap.totals.subscriptionsGrossCents)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatMxnExact(snap.totals.classCarrilACommissionCents)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatMxnExact(snap.totals.classCarrilBGrossCents)}</td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {snap.totals.subscriptionRefundsCents > 0 ? `−${formatMxnExact(snap.totals.subscriptionRefundsCents)}` : formatMxnExact(0)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{formatMxnExact(snap.totals.ownIncomeGrossCents)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatMxnExact(snap.totals.baseCents)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatMxnExact(snap.totals.ivaCents)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="font-display text-lg font-semibold">Retenciones del día 17 — escenario</h2>
        <p className="rounded-lg bg-elevated p-3 text-sm">
          <strong>Retenciones efectuadas: {formatMxnExact(0)}.</strong> Hoy no se le paga a ningún profesor (el motor de
          liquidación semanal no está activo hasta que el contador valide el proceso), así que nada se ha retenido. Lo
          de abajo es lo que se retendría <em>si</em> se pagara lo que ya se debe, para dimensionar la obligación.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <caption className="sr-only">Escenarios de retención de ISR sobre pagos a profesores del Carril A</caption>
            <thead className="border-b border-border-subtle text-xs text-text-muted">
              <tr>
                <th scope="col" className="py-2 pr-3 font-medium">Mes</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Pagado a profesores (Carril A)</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Base sin IVA</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">ISR al 1%</th>
                <th scope="col" className="py-2 pl-2 text-right font-medium">ISR al 2.5%</th>
              </tr>
            </thead>
            <tbody>
              {snap.retentionBases
                .filter((b) => b.carrilAPayCents > 0)
                .map((b) => (
                  <tr key={monthKey(b.month)} className="border-b border-border-subtle last:border-0">
                    <th scope="row" className="py-2 pr-3 font-medium">{formatMonthLabel(b.month)}</th>
                    <td className="px-2 py-2 text-right tabular-nums">{formatMxnExact(b.carrilAPayCents)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatMxnExact(b.scenarios[0]!.baseCents)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatMxnExact(b.scenarios[0]!.isrCents)}</td>
                    <td className="py-2 pl-2 text-right tabular-nums">{formatMxnExact(b.scenarios[1]!.isrCents)}</td>
                  </tr>
                ))}
              {snap.retentionBases.every((b) => b.carrilAPayCents === 0) && (
                <tr>
                  <td colSpan={5} className="py-3 text-text-secondary">
                    Sin clases impartidas por profesores del Carril A en {year}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <ul className="list-disc space-y-1 pl-5 text-xs text-text-muted">
          <li>
            La tasa de ISR de plataforma para 2026 (1% o 2.5%) es una consulta abierta al contador: por eso se muestran
            las dos, y ninguna es «la» retención.
          </li>
          <li>
            El <strong>IVA retenido</strong> no se calcula: su tasa y la regla del CFDI por cuenta del profesor siguen
            abiertas.
          </li>
          <li>
            Los profesores del Carril B (asimilados) se retienen por nómina, con su propio CFDI: esa parte está bloqueada
            hasta que el contador la valide y no aparece aquí.
          </li>
        </ul>
      </Card>

      <Card className="space-y-2 p-4">
        <h2 className="font-display text-lg font-semibold">Reserva de desempeño (15% · 30 días)</h2>
        {snap.payoutCount === 0 ? (
          <p className="text-sm text-text-secondary">
            Sin liquidaciones registradas: el motor de liquidación no está activo, así que no hay reserva retenida.
            Esto no significa que no se deba nada — significa que todavía no se le ha pagado a nadie.
          </p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-text-secondary">Retenida</dt>
              <dd className="font-semibold tabular-nums">{formatMxnExact(snap.reserves.heldCents)}</dd>
              <dd className="text-xs text-text-muted">{snap.reserves.heldCount} liquidación(es)</dd>
            </div>
            <div>
              <dt className="text-text-secondary">Liberada</dt>
              <dd className="font-semibold tabular-nums">{formatMxnExact(snap.reserves.releasedCents)}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">Confiscada</dt>
              <dd className="font-semibold tabular-nums">{formatMxnExact(snap.reserves.forfeitedCents)}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">Próxima liberación</dt>
              <dd className="font-semibold">
                {snap.reserves.nextReleaseAt ? formatMexicoDate(snap.reserves.nextReleaseAt) : '—'}
              </dd>
            </div>
          </dl>
        )}
        {snap.reserves.overdueCount > 0 && (
          <p role="alert" className="text-sm font-medium text-danger">
            {snap.reserves.overdueCount} reserva(s) llevan más de 30 días retenidas: debieron liberarse. El job de
            liberación no está corriendo.
          </p>
        )}
      </Card>

      <Card className="space-y-2 p-4">
        <h2 className="font-display text-lg font-semibold">Cobertura de los datos</h2>
        <p className="text-sm text-text-secondary">
          Lo que este tablero NO ve todavía. Un tablero fiscal que parece completo y no lo es es peor que uno que avisa.
        </p>
        <ul className="space-y-2 text-sm">
          <li>
            {c.monthlyRenewalsUnrecorded > 0 ? '⚠️' : '✅'} Renovaciones del plan Mensual:{' '}
            {c.monthlyRenewalsUnrecorded > 0 ? (
              <>
                hay <strong>{c.monthlyRenewalsUnrecorded}</strong> suscripción(es) Mensual(es) activas con más de 30 días. Su
                primer cobro está registrado; <strong>sus renovaciones no</strong> (falta el manejo de{' '}
                <code>invoice.paid</code>). Concilia con los reportes de Stripe.
              </>
            ) : (
              'sin suscripciones Mensuales de más de 30 días.'
            )}
          </li>
          <li>
            {c.pendingAsyncPayments > 0 ? 'ℹ️' : '✅'} Pagos OXXO/SPEI pendientes: <strong>{c.pendingAsyncPayments}</strong>.
            El dinero no ha llegado y no cuenta hasta que se confirme.
          </li>
          <li>
            {c.paymentsWithoutPaidAt > 0 ? '⚠️' : '✅'} Cobros sin fecha de cobro: <strong>{c.paymentsWithoutPaidAt}</strong>
            {c.paymentsWithoutPaidAt > 0 ? ' (no entran a ningún mes hasta tener fecha).' : '.'}
          </li>
          <li>
            {c.classRefundsPending > 0 ? '⚠️' : '✅'} Clases con reembolso por emitir o completar:{' '}
            <strong>{c.classRefundsPending}</strong>.
          </li>
          <li>
            ℹ️ Los reembolsos de suscripciones hechos desde el panel de Stripe solo se reflejan si el webhook está
            suscrito a <code>charge.refunded</code>.
          </li>
        </ul>
      </Card>
    </div>
  );
}
