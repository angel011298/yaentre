import { getAdminContext } from '@/lib/admin/context';
import { listExpiringSubscriptions } from '@/lib/db/admin-expiring';
import { formatMexicoDate } from '@/lib/format/mx';
import { planLabel } from '@/lib/stripe/pricing';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Vigencias' };

/** G103 — accesos que vencen en 30 días o están en gracia (solo lectura). */
export default async function AdminVigenciasPage() {
  await getAdminContext();
  const rows = await listExpiringSubscriptions(new Date());

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">Vigencias por vencer</h1>
        <p className="text-sm text-text-secondary">
          Planes de 12 meses que vencen en los próximos 30 días o están en sus 7 días de gracia. Los
          avisos por correo salen solos (30, 7 y 1 día antes, al vencer y al terminar la gracia).
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-border-subtle bg-surface p-4 text-sm text-text-secondary">
          Ningún acceso vence en los próximos 30 días.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-elevated text-xs text-text-muted">
              <tr>
                <th className="p-3">Cuenta</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Vence</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Avisos enviados</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.subscriptionId} className="border-t border-border-subtle">
                  <td className="p-3 text-text-primary">{r.email ?? r.userProfileId}</td>
                  <td className="p-3 text-text-secondary">
                    {planLabel(r.plan)}
                    {r.isComp ? ' (cortesía)' : ''}
                  </td>
                  <td className="p-3 text-text-secondary">{formatMexicoDate(r.expiresAt)}</td>
                  <td className="p-3 font-semibold text-text-primary">
                    {r.accessStatus === 'GRACE' ? 'En gracia' : 'Vigente'}
                  </td>
                  <td className="p-3 text-xs text-text-muted">
                    {r.noticesSent.length ? r.noticesSent.map((k) => k.split(':')[0]).join(', ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
