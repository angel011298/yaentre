import { ComputePayoutsForm } from '@/components/admin/ComputePayoutsForm';
import { MarketplaceDecision } from '@/components/admin/MarketplaceDecision';
import { getAdminContext } from '@/lib/admin/context';
import { listPayoutsForAdmin, pendingAdjustmentsByTeacher } from '@/lib/db/payouts';
import { formatMexicoDate, formatMxn } from '@/lib/format/mx';
import { lastClosedWeekStart, PAYOUT_RULES } from '@/lib/teachers/payout-calculator';
import { buildPayoutSheetRow, PAYOUT_STATUS_LABELS, type PayoutSheetRow } from '@/lib/teachers/payout-sheet';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Liquidaciones' };

type AdminPayout = Awaited<ReturnType<typeof listPayoutsForAdmin>>[number];

const DECISIONS: Record<string, Array<{ value: string; label: string; variant?: 'primary' | 'secondary' | 'danger' }>> = {
  PENDING: [
    { value: 'APPROVE', label: 'Aprobar', variant: 'primary' },
    { value: 'CANCEL', label: 'Cancelar', variant: 'danger' },
  ],
  APPROVED: [
    { value: 'MARK_TRANSFERRED', label: 'Marcar como transferida', variant: 'primary' },
    { value: 'MARK_FAILED', label: 'La transferencia falló' },
    { value: 'CANCEL', label: 'Cancelar', variant: 'danger' },
  ],
  FAILED: [
    { value: 'MARK_TRANSFERRED', label: 'Marcar como transferida', variant: 'primary' },
    { value: 'CANCEL', label: 'Cancelar', variant: 'danger' },
  ],
};

function Amounts({ row }: { row: PayoutSheetRow }) {
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
      <dt className="text-text-secondary">Clases en vivo ({row.classCount} impartidas)</dt>
      <dd className="text-right font-mono tabular-nums text-text-primary">{row.classRevenue}</dd>
      <dt className="text-text-secondary">Cursos pregrabados ({row.enrollmentCount} inscripciones)</dt>
      <dd className="text-right font-mono tabular-nums text-text-primary">{row.courseRevenue}</dd>
      <dt className="font-semibold text-text-primary">Bruto</dt>
      <dd className="text-right font-mono tabular-nums font-semibold text-text-primary">{row.gross}</dd>
      <dt className="text-text-secondary">Reserva de desempeño (15 %, 30 días)</dt>
      <dd className="text-right font-mono tabular-nums text-text-primary">{row.retention}</dd>
      {row.released && (
        <>
          <dt className="text-text-secondary">Reservas anteriores liberadas</dt>
          <dd className="text-right font-mono tabular-nums text-text-primary">{row.released}</dd>
        </>
      )}
      {row.adjustment && (
        <>
          <dt className="text-text-secondary">Ajustes (reembolsos posteriores a una liquidación)</dt>
          <dd className="text-right font-mono tabular-nums text-text-primary">{row.adjustment}</dd>
        </>
      )}
      <dt className="border-t border-border-subtle pt-1 font-bold text-text-primary">Neto a transferir</dt>
      <dd className="border-t border-border-subtle pt-1 text-right font-mono tabular-nums font-bold text-text-primary">{row.net}</dd>
    </dl>
  );
}

function PayoutCard({ payout, isMaster }: { payout: AdminPayout; isMaster: boolean }) {
  const row = buildPayoutSheetRow(payout, { revealBankData: isMaster });
  const options = DECISIONS[payout.status] ?? [];
  const canForfeit = payout.status === 'TRANSFERRED' && payout.retentionStatus === 'HELD' && payout.retentionCents > 0;
  return (
    <li className="space-y-3 rounded-lg border border-border-subtle bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-semibold text-text-primary">{row.teacherName}</p>
          <p className="text-xs text-text-muted">
            Semana {row.periodLabel} · {PAYOUT_STATUS_LABELS[payout.status] ?? payout.status}
          </p>
        </div>
        <p className="font-mono text-sm text-text-secondary">{row.reference}</p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-text-muted">CLABE</dt>
        <dd className="break-all font-mono text-text-primary">{row.clabe}</dd>
        <dt className="text-text-muted">Banco</dt>
        <dd className="text-text-primary">{row.bankName}</dd>
        <dt className="text-text-muted">Esquema</dt>
        <dd className="text-text-primary">{row.railLabel}</dd>
        {row.speiReference && (
          <>
            <dt className="text-text-muted">Clave de rastreo</dt>
            <dd className="break-all font-mono text-text-primary">{row.speiReference}</dd>
          </>
        )}
        {payout.failReason && (
          <>
            <dt className="text-text-muted">Motivo del fallo</dt>
            <dd className="text-text-primary">{payout.failReason}</dd>
          </>
        )}
        {payout.status === 'TRANSFERRED' && payout.retentionCents > 0 && (
          <>
            <dt className="text-text-muted">Reserva</dt>
            <dd className="text-text-primary">
              {payout.retentionStatus === 'HELD'
                ? `Retenida hasta el ${formatMexicoDate(payout.retentionReleaseAt)}`
                : payout.retentionStatus === 'RELEASED'
                  ? 'Liberada en una liquidación posterior'
                  : 'Retenida por incidencia'}
            </dd>
          </>
        )}
      </dl>
      <Amounts row={row} />
      {isMaster && (options.length > 0 || canForfeit) && (
        <MarketplaceDecision
          target={{ kind: 'payout', payoutId: payout.id }}
          options={canForfeit ? [{ value: 'FORFEIT_RETENTION', label: 'Retener la reserva (incidencia grave)', variant: 'danger' }] : options}
          extraField={{ label: 'Clave de rastreo SPEI', name: 'speiReference', showFor: ['MARK_TRANSFERRED'] }}
        />
      )}
    </li>
  );
}

function Section({ title, hint, payouts, isMaster }: { title: string; hint?: string; payouts: AdminPayout[]; isMaster: boolean }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-bold text-text-primary">
        {title} <span className="text-sm font-normal text-text-muted">({payouts.length})</span>
      </h2>
      {hint && <p className="text-sm text-text-secondary">{hint}</p>}
      {payouts.length === 0 ? (
        <p className="rounded-lg border border-border-subtle bg-surface p-4 text-sm text-text-secondary">Nada por ahora.</p>
      ) : (
        <ul className="space-y-3">
          {payouts.map((p) => (
            <PayoutCard key={p.id} payout={p} isMaster={isMaster} />
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * G103 — liquidaciones semanales a profesores por SPEI manual (spec del
 * marketplace §7 + horarios/cursos §5.2). Calcular, aprobar, transferir,
 * cancelar y retener reservas exige admin MAESTRO (la acción lo verifica); un
 * ADMIN de lectura ve los montos con la CLABE enmascarada.
 */
export default async function AdminLiquidacionesPage() {
  const ctx = await getAdminContext();
  const [payouts, debts] = await Promise.all([listPayoutsForAdmin({}), pendingAdjustmentsByTeacher()]);
  const by = (s: string) => payouts.filter((p) => p.status === s);
  const transferred = by('TRANSFERRED').slice(0, 30);
  const totalApproved = by('APPROVED').reduce((s, p) => s + p.netCents, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-text-primary">Liquidaciones</h1>
        <p className="text-sm text-text-secondary">
          Liquidación semanal de la parte del profesor (75 %) de clases impartidas y cursos vendidos. Se retiene el
          15 % durante 30 días; si el neto no llega a {formatMxn(PAYOUT_RULES.MIN_PAYOUT_CENTS)}, se acumula para la
          semana siguiente.{!ctx.isMaster ? ' Solo el administrador maestro puede calcular, aprobar y marcar transferencias.' : ''}
        </p>
      </div>

      {ctx.isMaster && <ComputePayoutsForm defaultWeekStart={lastClosedWeekStart(new Date())} />}

      {debts.length > 0 && (
        <section className="space-y-2 rounded-lg bg-warning-subtle p-4 text-sm text-text-primary">
          <p className="font-semibold">Descuentos pendientes por reembolsos</p>
          <ul className="list-disc pl-5">
            {debts.map((d) => (
              <li key={d.teacherId}>
                {d.displayName}: {formatMxn(d.amountCents)} ({d.count} {d.count === 1 ? 'movimiento' : 'movimientos'}) — se
                aplican en su siguiente liquidación.
              </li>
            ))}
          </ul>
        </section>
      )}

      <Section title="Por aprobar" payouts={by('PENDING')} isMaster={ctx.isMaster} />
      <Section
        title="Hoja de pago — por transferir"
        hint={by('APPROVED').length > 0 ? `Total a transferir: ${formatMxn(totalApproved)}. Usa la referencia como concepto del SPEI.` : undefined}
        payouts={by('APPROVED')}
        isMaster={ctx.isMaster}
      />
      <Section title="Transferencias fallidas" payouts={by('FAILED')} isMaster={ctx.isMaster} />
      <Section title="Transferidas (últimas 30)" payouts={transferred} isMaster={ctx.isMaster} />
    </div>
  );
}
