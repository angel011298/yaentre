import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/admin/Pagination';
import { AUDIT_PAGE_SIZE, listAuditLog } from '@/lib/db/admin-audit';
import { auditFilterSchema } from '@/lib/admin/schemas';

export const metadata = { title: 'Bitácora' };

/**
 * G99 — pestaña Bitácora. Solo lectura, exige ADMIN (no maestro).
 *
 * Todo lo que ocurre en el panel deja fila aquí: las acciones de contenido que
 * ya existían desde CC-06 y las de cuentas y bóveda que añadió esta fase,
 * incluidas las que se RECHAZARON — el intento es justo lo que interesa
 * auditar.
 */
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const filters = auditFilterSchema.parse({
    actor: sp.actor,
    action: sp.action,
    target: sp.target,
    page: sp.page,
  });
  const result = await listAuditLog(filters);
  const totalPages = Math.max(1, Math.ceil(result.total / AUDIT_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Bitácora</h1>
        <p className="text-text-secondary">
          {result.total} registro{result.total === 1 ? '' : 's'} de administración. No se puede
          editar ni borrar desde el panel.
        </p>
      </div>

      <form method="get" action="/admin/bitacora" className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="audit-actor" className="text-sm font-medium text-text-secondary">
            Actor (correo)
          </label>
          <input
            id="audit-actor"
            name="actor"
            defaultValue={filters.actor}
            className="min-h-touch rounded-md border border-border-subtle bg-input px-3 text-text-primary"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="audit-action" className="text-sm font-medium text-text-secondary">
            Acción
          </label>
          <select
            id="audit-action"
            name="action"
            defaultValue={filters.action}
            className="min-h-touch rounded-md border border-border-subtle bg-input px-3 text-sm text-text-primary"
          >
            <option value="">(todas)</option>
            {result.actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="audit-target" className="text-sm font-medium text-text-secondary">
            Cuenta afectada (id)
          </label>
          <input
            id="audit-target"
            name="target"
            defaultValue={filters.target}
            className="min-h-touch rounded-md border border-border-subtle bg-input px-3 text-text-primary"
          />
        </div>
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>

      {result.rows.length === 0 ? (
        <Card className="p-8 text-center text-text-secondary">
          No hay registros que coincidan con el filtro.
        </Card>
      ) : (
        <div className="space-y-2">
          {result.rows.map((r) => {
            const meta = (r.metadata ?? {}) as Record<string, unknown>;
            const rejected = meta.outcome === 'rejected';
            return (
              <Card key={r.id} className="p-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-mono text-xs text-text-muted">
                    {r.createdAt.toISOString().slice(0, 19).replace('T', ' ')}
                  </span>
                  <span className="font-medium text-text-primary">{r.action}</span>
                  {rejected && (
                    <span className="rounded-md bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger">
                      rechazada
                    </span>
                  )}
                  <span className="rounded-md bg-elevated px-2 py-0.5 text-xs">{r.targetKind}</span>
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  por {r.actorEmail ?? '(cuenta eliminada)'}
                  {r.targetUserProfileId && (
                    <>
                      {' · sobre '}
                      {r.targetKind === 'user' ? (
                        <Link
                          href={`/admin/usuarios/${r.targetUserProfileId}`}
                          className="text-brand hover:underline"
                        >
                          {r.targetUserProfileId}
                        </Link>
                      ) : (
                        r.targetUserProfileId
                      )}
                    </>
                  )}
                </p>
                {r.reason && <p className="mt-1 text-xs text-text-primary">Motivo: {r.reason}</p>}
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] text-text-muted">
                  {JSON.stringify(meta)}
                </pre>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination
        page={result.page}
        totalPages={totalPages}
        searchParams={sp}
        basePath="/admin/bitacora"
      />
    </div>
  );
}
