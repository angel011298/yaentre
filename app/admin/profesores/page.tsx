import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Pagination } from '@/components/admin/Pagination';
import { adminTeacherListSchema } from '@/lib/admin/schemas';
import { ADMIN_TEACHERS_PAGE_SIZE } from '@/lib/db/teachers';
import { getResicoStatus } from '@/lib/db/resico';
import { formatMxnFromCents } from '@/lib/teachers/tariff';
import { listTeachersForAdmin } from '@/lib/teachers/admin-service';

export const metadata = { title: 'Profesores' };

const STATUS_LABEL = {
  PENDING_REVIEW: 'Por revisar',
  ACTIVE: 'Activo',
  SUSPENDED: 'Suspendido',
  INACTIVE: 'En pausa',
} as const;

const SIGNAL = {
  GREEN: { dot: '🟢', label: 'Verde' },
  YELLOW: { dot: '🟡', label: 'Amarillo' },
  RED: { dot: '🔴', label: 'Rojo' },
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
  const sig = SIGNAL[resico.signal];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Profesores</h1>
        <p className="text-text-secondary">
          {result.total} profesor{result.total === 1 ? '' : 'es'}
          {status ? ` (${STATUS_LABEL[status].toLowerCase()})` : ''}.
        </p>
      </div>

      <Card className="space-y-2 p-4">
        <h2 className="font-display text-lg font-semibold">
          {sig.dot} Monitor RESICO — año fiscal {resico.year}
        </h2>
        <p className="text-sm text-text-secondary">
          Acumulado <strong>{formatMxnFromCents(resico.yearToDateIncomeCents)}</strong> de{' '}
          {formatMxnFromCents(resico.ceilingCents)} ({resico.percentUsed}% · {sig.label}). Proyección al 31 de
          diciembre: {formatMxnFromCents(resico.projectedAnnualCents)} ({resico.projectedPercentUsed}%).
        </p>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-elevated"
          role="progressbar"
          aria-valuenow={Math.min(100, resico.percentUsed)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Porcentaje del techo de RESICO usado"
        >
          <div
            className="h-full bg-brand"
            style={{ width: `${Math.min(100, resico.percentUsed)}%` }}
          />
        </div>
        <ul className="text-sm text-text-secondary">
          <li>Suscripciones: {formatMxnFromCents(resico.subscriptionIncomeCents)}</li>
          <li>
            Clases (peor caso, todo como Carril B): {formatMxnFromCents(resico.classIncomeCents)} · con el Carril A
            contando solo su comisión: {formatMxnFromCents(resico.classIncomeMixedCents)}
          </li>
          <li>
            Clases cobradas — Carril A: {resico.carrils.A} · Carril B: {resico.carrils.B}
          </li>
        </ul>
        <p className="text-sm font-medium">{resico.recommendation}</p>
        <p className="text-xs text-text-muted">
          Base de efectivo, importes con IVA incluido (el techo se mide sin IVA: el porcentaje sale más alto que el
          real, a propósito). Pendiente de validar con el contador.
        </p>
      </Card>

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
