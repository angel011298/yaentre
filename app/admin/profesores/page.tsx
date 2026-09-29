import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Pagination } from '@/components/admin/Pagination';
import { ResicoMonitorCard } from '@/components/admin/ResicoMonitorCard';
import { adminTeacherListSchema } from '@/lib/admin/schemas';
import { ADMIN_TEACHERS_PAGE_SIZE } from '@/lib/db/teachers';
import { getResicoStatus } from '@/lib/db/resico';
import { listTeachersForAdmin } from '@/lib/teachers/admin-service';

export const metadata = { title: 'Profesores' };

const STATUS_LABEL = {
  PENDING_REVIEW: 'Por revisar',
  ACTIVE: 'Activo',
  SUSPENDED: 'Suspendido',
  INACTIVE: 'En pausa',
} as const;

/**
 * Pestaña Profesores (Bloque 2): solicitudes por revisar, directorio y el
 * monitor RESICO. Lectura: ADMIN (layout + el servicio vuelve a exigirlo). Las
 * decisiones viven en el detalle y exigen admin maestro.
 */
export default async function AdminTeachersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { status, page } = adminTeacherListSchema.parse({ status: sp.status || undefined, page: sp.page });
  const [result, resico] = await Promise.all([listTeachersForAdmin({ status, page }), getResicoStatus()]);
  const totalPages = Math.max(1, Math.ceil(result.total / ADMIN_TEACHERS_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Profesores</h1>
        <p className="text-text-secondary">
          {result.total} profesor{result.total === 1 ? '' : 'es'}
          {status ? ` (${STATUS_LABEL[status].toLowerCase()})` : ''}.
        </p>
      </div>

      <ResicoMonitorCard status={resico} variant="compact" />

      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Filtrar por estado">
        <Link href="/admin/profesores" className="rounded-md bg-elevated px-3 py-1.5">
          Todos
        </Link>
        {(Object.keys(STATUS_LABEL) as Array<keyof typeof STATUS_LABEL>).map((s) => (
          <Link key={s} href={`/admin/profesores?status=${s}`} className="rounded-md bg-elevated px-3 py-1.5">
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </nav>

      {result.rows.length === 0 ? (
        <Card className="p-8 text-center text-text-secondary">No hay profesores en este estado.</Card>
      ) : (
        <div className="space-y-3">
          {result.rows.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {t.fullName} <span className="text-text-muted">· se muestra como «{t.publicName}»</span>
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-text-secondary">
                    <span className="rounded-md bg-elevated px-2 py-0.5 font-medium">{STATUS_LABEL[t.status]}</span>
                    <span>{t.level}</span>
                    <span>{t.paymentRail === 'ASIMILADOS' ? 'Carril B' : 'Carril A'}</span>
                    <span>{t.totalClassesGiven} clases</span>
                    <span>alta {t.createdAt.toISOString().slice(0, 10)}</span>
                  </p>
                </div>
                <Link
                  href={`/admin/profesores/${t.id}`}
                  className="min-h-touch inline-flex shrink-0 items-center rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand-hover"
                >
                  Revisar
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Pagination page={result.page} totalPages={totalPages} searchParams={sp} basePath="/admin/profesores" />
    </div>
  );
}
