import { Card } from '@/components/ui/Card';
import { ReferralAdminActions } from '@/components/admin/ReferralAdminActions';
import { isMasterAdminEmail } from '@/lib/admin/master';
import { requireRole } from '@/lib/auth/guards';
import { formatMexicoDate } from '@/lib/format/dates';
import { formatMxnExact } from '@/lib/format/money';
import { listFraudAlertsForAdmin, listReferrersForAdmin } from '@/lib/referrals/admin-service';

export const metadata = { title: 'Referidos' };

const FLAG_LABEL: Record<string, string> = {
  self_purchase: 'Autocompra (misma cuenta)',
  same_email: 'Mismo correo (o alias)',
  velocity: 'Más de 5 ventas en 24 h',
  reversal_pattern: 'Reversiones repetidas',
};

/**
 * Pestaña Referidos (Bloque 3): alertas de antifraude y lista de referidores.
 * Lectura: ADMIN (el layout y, otra vez, el servicio). Las decisiones —suspender,
 * reactivar, resolver una marca— exigen admin maestro y viven en el servicio.
 * Nivel 2 (Embajador en efectivo) NO tiene panel: espera al contador.
 */
export default async function AdminReferralsPage() {
  const { authUser } = await requireRole('ADMIN');
  const isMaster = isMasterAdminEmail(authUser.email, process.env.MASTER_ADMIN_EMAILS);

  const [referrers, alerts] = await Promise.all([listReferrersForAdmin(), listFraudAlertsForAdmin()]);
  if (!referrers.ok || !alerts.ok) {
    return <Card className="p-6 text-text-secondary">{(!referrers.ok && referrers.message) || (!alerts.ok && alerts.message)}</Card>;
  }

  // Lo que pide revisión: marcas blandas sin resolver. Las duras ya nacieron REVERSED.
  const pending = alerts.data.filter((a) => !a.blocked && !a.resolved && a.status === 'PENDING');
  const history = alerts.data.filter((a) => !pending.includes(a));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Referidos</h1>
        <p className="text-text-secondary">
          {referrers.data.length} código{referrers.data.length === 1 ? '' : 's'} · {pending.length} por revisar. Solo el
          Nivel 1 (crédito) está activo.
        </p>
      </div>

      <section className="space-y-3" aria-labelledby="alertas">
        <h2 id="alertas" className="font-display text-lg font-semibold">
          Alertas por revisar
        </h2>
        {pending.length === 0 ? (
          <Card className="p-6 text-text-secondary">Nada por revisar.</Card>
        ) : (
          pending.map((a) => (
            <Card key={a.id} className="space-y-2 p-4">
              <p className="text-sm">
                <span className="font-mono font-semibold">{a.code}</span> · venta del {formatMexicoDate(a.createdAt)} ·{' '}
                {formatMxnExact(a.saleAmountCents)} · comisión retenida {formatMxnExact(a.commissionCents)}
              </p>
              <p className="text-xs text-text-secondary">{a.flags.map((f) => FLAG_LABEL[f] ?? f).join(' · ')}</p>
              <ReferralAdminActions kind="flag" saleId={a.id} isMaster={isMaster} />
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3" aria-labelledby="referidores">
        <h2 id="referidores" className="font-display text-lg font-semibold">
          Referidores
        </h2>
        {referrers.data.length === 0 ? (
          <Card className="p-6 text-text-secondary">Todavía no hay códigos.</Card>
        ) : (
          referrers.data.map((r) => (
            <Card key={r.id} className="space-y-2 p-4">
              <p className="text-sm">
                <span className="font-mono font-semibold">{r.code}</span> · {r.ownerEmail ?? 'sin correo'} ·{' '}
                <span className={r.active ? 'text-success' : 'text-danger'}>{r.active ? '✓ activo' : '✗ suspendido'}</span>
              </p>
              <p className="text-xs text-text-secondary">
                {r.referredCount} registro{r.referredCount === 1 ? '' : 's'} · ventas: {r.sales.pending} en espera,{' '}
                {r.sales.accrued} acreditadas ({formatMxnExact(r.accruedCents)}), {r.sales.reversed} revertidas
                {r.suspendedReason ? ` · suspendido: ${r.suspendedReason}` : ''}
              </p>
              <ReferralAdminActions kind="code" referralId={r.id} active={r.active} isMaster={isMaster} />
            </Card>
          ))
        )}
      </section>

      {history.length > 0 && (
        <section className="space-y-2" aria-labelledby="historial">
          <h2 id="historial" className="font-display text-lg font-semibold">
            Ya resueltas o bloqueadas
          </h2>
          <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-surface text-sm">
            {history.map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2 p-3">
                <span>
                  <span className="font-mono">{a.code}</span> · {formatMexicoDate(a.createdAt)} ·{' '}
                  {a.flags.map((f) => FLAG_LABEL[f] ?? f).join(', ')}
                </span>
                <span className="text-text-secondary">
                  {a.blocked ? 'Bloqueada al registrarse' : a.status === 'REVERSED' ? `Revertida (${a.reverseReason ?? '—'})` : 'Falsa alarma'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
