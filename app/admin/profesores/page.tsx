import { MarketplaceDecision } from '@/components/admin/MarketplaceDecision';
import { getAdminContext } from '@/lib/admin/context';
import { listTeachersForAdmin } from '@/lib/db/teachers';
import { formatMexicoDate, maskTail } from '@/lib/format/mx';
import { LEVEL_LABELS } from '@/lib/teachers/level-engine';
import { subjectLabel, TRACK_LABELS } from '@/lib/teachers/subject-catalog';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Profesores' };

const STATUS: Record<string, string> = {
  PENDING_REVIEW: 'Solicitud por revisar',
  ACTIVE: 'Activo',
  SUSPENDED: 'Suspendido',
  INACTIVE: 'Inactivo',
  REJECTED: 'Rechazado',
};

/**
 * G103 — revisión de solicitudes de profesores (spec del marketplace §3.1
 * paso 4). CLABE y RFC enmascarados; la CURP se muestra completa porque es lo
 * que el admin tiene que verificar. Aprobar o suspender exige admin maestro
 * (lo decide la acción, no este botón).
 */
export default async function AdminProfesoresPage() {
  const ctx = await getAdminContext();
  const teachers = await listTeachersForAdmin();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">Profesores</h1>
        <p className="text-sm text-text-secondary">
          Verifica CURP (formato y que corresponda a la persona), CLABE (18 dígitos) y, en Carril A, RFC y
          constancia vigente.{!ctx.isMaster ? ' Solo el administrador maestro puede aprobar o suspender.' : ''}
        </p>
      </div>
      {teachers.length === 0 ? (
        <p className="rounded-lg border border-border-subtle bg-surface p-4 text-sm text-text-secondary">Todavía no hay solicitudes.</p>
      ) : (
        <ul className="space-y-3">
          {teachers.map((t) => (
            <li key={t.id} className="space-y-3 rounded-lg border border-border-subtle bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="text-sm">
                  <p className="font-semibold text-text-primary">{t.fullName} <span className="font-normal text-text-muted">({t.displayName})</span></p>
                  <p className="text-text-secondary">CURP {t.curp} · Tel. {t.phone}</p>
                  <p className="text-text-secondary">
                    CLABE {maskTail(t.clabe)} · {t.bankName} · {t.paymentRail === 'COMISION_MERCANTIL' ? `Carril A, RFC ${maskTail(t.rfc, 3)}` : 'Carril B (asimilados)'}
                  </p>
                  <p className="text-text-secondary">
                    {(['ADMISION', 'REGULARIZACION'] as const)
                      .map((tr) => {
                        const s = t.subjects.filter((x) => x.track === tr);
                        return s.length ? `${TRACK_LABELS[tr]}: ${s.map((x) => subjectLabel(x.subjectKey)).join(', ')}` : null;
                      })
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p className="text-xs text-text-muted">
                    Solicitó el {formatMexicoDate(t.createdAt)} · Nivel {LEVEL_LABELS[t.level]} · {t.totalClassesGiven} clases · contrato {t.contractVersion ?? '—'}
                  </p>
                  {t.canInvoice && (
                    t.csfDocumentPath ? (
                      <a href={`/api/admin/teachers/${t.id}/csf`} className="inline-flex min-h-touch items-center text-sm font-semibold text-brand-fg hover:underline">
                        Descargar constancia fiscal
                      </a>
                    ) : (
                      <p className="text-xs text-warning">Dijo que factura pero no ha subido su constancia (queda en Carril B).</p>
                    )
                  )}
                </div>
                <span className="rounded-md border border-border-subtle px-2 py-0.5 text-xs font-semibold text-text-secondary">{STATUS[t.status] ?? t.status}</span>
              </div>
              <MarketplaceDecision
                target={{ kind: 'teacher', teacherId: t.id }}
                options={
                  t.status === 'PENDING_REVIEW'
                    ? [
                        { value: 'APPROVE', label: 'Aprobar', variant: 'primary' },
                        { value: 'REJECT', label: 'Rechazar', variant: 'danger' },
                      ]
                    : t.status === 'ACTIVE'
                      ? [{ value: 'SUSPEND', label: 'Suspender', variant: 'danger' }]
                      : t.status === 'SUSPENDED' || t.status === 'INACTIVE'
                        ? [{ value: 'REACTIVATE', label: 'Reactivar' }]
                        : []
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
