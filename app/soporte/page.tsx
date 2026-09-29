import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { Pagination } from '@/components/admin/Pagination';
import { userSearchSchema } from '@/lib/admin/schemas';
import { ROLE_LABELS } from '@/lib/admin/capabilities';
import { requireCapability } from '@/lib/auth/guards';
import { formatMexicoDate } from '@/lib/format/dates';
import { searchUsersForSupport } from '@/lib/support/service';

export const metadata = { title: 'Soporte' };

/**
 * Mesa de soporte: busca una cuenta por correo o nombre. La página vuelve a exigir
 * `users.read` por su cuenta (un layout no protege una página) y el servicio,
 * otra vez. Un `<form method="get">` sin JavaScript: la consulta la resuelve el
 * servidor y la URL es compartible.
 */
export default async function SupportHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireCapability('users.read');
  const sp = await searchParams;
  const { q, page } = userSearchSchema.parse({ q: sp.q, page: sp.page });
  const result = q ? await searchUsersForSupport({ q, page }) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Mesa de soporte</h1>
        <p className="text-text-secondary">
          Busca a la persona por correo o nombre para atender una solicitud de datos (ARCO) o un reembolso. Cada ficha
          que abres queda en la bitácora.
        </p>
      </div>

      <form method="get" action="/soporte" className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <TextField name="q" label="Buscar" type="search" defaultValue={q} placeholder="correo@ejemplo.com o nombre" />
        </div>
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      {!result ? (
        <Card className="p-8 text-center text-text-secondary">Escribe un correo o un nombre para empezar.</Card>
      ) : !result.ok ? (
        <Card className="p-8 text-center text-danger">{result.message}</Card>
      ) : result.data.rows.length === 0 ? (
        <Card className="p-8 text-center text-text-secondary">Sin resultados para «{q}».</Card>
      ) : (
        <div className="space-y-3">
          {result.data.rows.map((u) => (
            <Card key={u.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{u.email ?? 'sin correo'}</p>
                <p className="text-xs text-text-secondary">
                  {u.displayName ?? 'sin nombre'} · {ROLE_LABELS[u.role] ?? u.role} · alta {formatMexicoDate(u.createdAt)} ·{' '}
                  {u.activePlans} plan{u.activePlans === 1 ? '' : 'es'} activo{u.activePlans === 1 ? '' : 's'}
                </p>
              </div>
              <Link
                href={`/soporte/${u.id}`}
                className="min-h-touch inline-flex shrink-0 items-center rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand-hover"
              >
                Abrir ficha
              </Link>
            </Card>
          ))}
          <Pagination
            page={result.data.page}
            totalPages={Math.max(1, Math.ceil(result.data.total / result.data.pageSize))}
            searchParams={{ q }}
            basePath="/soporte"
          />
        </div>
      )}
    </div>
  );
}
