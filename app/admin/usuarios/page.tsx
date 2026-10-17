import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { getAdminContext } from '@/lib/admin/context';
import { Pagination } from '@/components/admin/Pagination';
import { UserSearchForm } from '@/components/admin/UserSearchForm';
import { searchUsers, USERS_PAGE_SIZE } from '@/lib/db/admin-users';
import { userSearchSchema } from '@/lib/admin/schemas';
import { Icon } from '@/components/ui/Icon';

export const metadata = { title: 'Usuarios' };

/**
 * G99 — pestaña Usuarios.
 *
 * Solo lectura: exige ADMIN (vía `app/admin/layout.tsx`) pero NO admin
 * maestro. Las acciones destructivas viven en el detalle de cada cuenta y
 * cada una verifica el rol y la compuerta de maestro por su cuenta.
 *
 * 🔒 Aquí NO se muestra ni se consulta material de contraseñas. Supabase Auth
 * guarda un hash y esta pantalla no lo lee.
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // G100 🔴 — el guard va AQUÍ, antes de leer un solo dato. El layout no basta:
  // Next renderiza layout y página EN PARALELO, y el 307 a /app que manda el
  // layout llevaba en el CUERPO la página ya renderizada (medido: correos de
  // cuentas reales en la respuesta a un alumno). Ver `getAdminContext`.
  await getAdminContext();
  const sp = await searchParams;
  const { q, page } = userSearchSchema.parse({ q: sp.q, page: sp.page });
  const result = await searchUsers({ q, page });
  const totalPages = Math.max(1, Math.ceil(result.total / USERS_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Usuarios</h1>
        <p className="text-text-secondary">
          {result.total} cuenta{result.total === 1 ? '' : 's'} registrada
          {result.total === 1 ? '' : 's'}. Busca por correo o por nombre.
        </p>
      </div>

      <UserSearchForm defaultValue={q} />

      {result.rows.length === 0 ? (
        <Card className="p-8 text-center text-text-secondary">
          {q ? `Sin resultados para «${q}».` : 'Todavía no hay cuentas registradas.'}
        </Card>
      ) : (
        <div className="space-y-3">
          {result.rows.map((u) => (
            <Card key={u.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text-primary">
                    {u.displayName || '(sin nombre)'}{' '}
                    <span className="text-text-muted">· {u.email ?? '(sin correo)'}</span>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                    <span className="rounded-md bg-elevated px-2 py-0.5 font-medium">{u.role}</span>
                    <span className="inline-flex items-center gap-1">
                      <Icon
                        name={u.emailVerified ? 'checkCircle' : 'alert'}
                        className={`h-3.5 w-3.5 ${u.emailVerified ? 'text-success' : 'text-warning'}`}
                      />
                      {u.emailVerified ? 'verificado' : 'sin verificar'}
                    </span>
                    <span>alta {u.createdAt.toISOString().slice(0, 10)}</span>
                    <span>{u.onboardingComplete ? 'onboarding completo' : 'onboarding pendiente'}</span>
                    {u.targetExamLabel && <span>{u.targetExamLabel}</span>}
                    <span className="inline-flex items-center gap-1" title="Racha actual">
                      <Icon name="flame" className="h-3.5 w-3.5 text-streak" />
                      {u.currentStreak}
                    </span>
                    {u.activeSubscriptions > 0 && (
                      <span className="text-success">
                        {u.activeSubscriptions} plan{u.activeSubscriptions === 1 ? '' : 'es'} activo
                        {u.activeSubscriptions === 1 ? '' : 's'}
                      </span>
                    )}
                    {u.compSubscriptions > 0 && <span className="text-info">cortesía</span>}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    último acceso{' '}
                    {u.lastSignInAt ? u.lastSignInAt.toISOString().slice(0, 16).replace('T', ' ') : '—'}
                    {' · '}última sesión de estudio{' '}
                    {u.lastSessionAt ? u.lastSessionAt.toISOString().slice(0, 10) : '—'}
                  </p>
                </div>
                <Link
                  href={`/admin/usuarios/${u.id}`}
                  className="min-h-touch inline-flex shrink-0 items-center rounded-md bg-brand px-3 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
                >
                  Administrar
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Pagination
        page={result.page}
        totalPages={totalPages}
        searchParams={sp}
        basePath="/admin/usuarios"
      />
    </div>
  );
}
