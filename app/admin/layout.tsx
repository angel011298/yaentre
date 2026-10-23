import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AdminNav } from '@/components/admin/AdminNav';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { getAdminContext } from '@/lib/admin/context';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

/**
 * Guard del panel admin (CC-06). El proxy (proxy.ts) ya exige sesión en
 * /admin/*; este layout verifica el ROL para la cáscara del panel. Sin sesión
 * → /login; con sesión pero sin rol ADMIN → /app (no tiene sentido devolverlo
 * a /login, ya está autenticado).
 *
 * G100 🔴: hasta G99 este layout era el ÚNICO guard de cinco páginas del
 * panel, y eso no protegía sus datos (ver `getAdminContext`).
 *
 * G100: la cabecera dice QUIÉN está dentro —«Administrador maestro» o
 * «Administrador»—, lo decide el servidor en cada petición (`getAdminContext`)
 * y por eso es igual en cualquier dispositivo. Y por fin tiene «Cerrar
 * sesión»: hasta G99 el panel no ofrecía ninguna forma de salir, así que en
 * un equipo prestado la sesión del admin se quedaba abierta.
 *
 * Tema: light (a diferencia del resto de la app del alumno, que es dark por
 * default) — el admin no es el alumno, ver CLAUDE.md §Sistema de diseño.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Sin sesión → /login; sin rol ADMIN → /app (lo hace `getAdminContext`).
  // ⚠️ Esto NO protege a las páginas: cada una llama al mismo guard en su
  // primera línea (ver el 🔴 de `getAdminContext`).
  const ctx = await getAdminContext();

  return (
    <div data-theme="light" className="min-h-screen bg-base text-text-primary">
      <header className="yaentre-safe-top border-b border-border-subtle bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/admin" className="inline-flex items-center gap-2 font-display text-lg font-semibold">
                  <Icon name="shield" className="h-5 w-5 text-brand-fg" />
                  YaEntre · Admin
                </Link>
                <RoleBadge isMaster={ctx.isMaster} />
              </div>
              <p className="truncate text-xs text-text-muted">{ctx.authUser.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {ctx.hasStudentApp && (
                <Link
                  href="/app"
                  className="inline-flex min-h-touch items-center rounded-md px-3 text-sm font-medium text-text-secondary hover:bg-elevated hover:text-text-primary"
                >
                  App del alumno
                </Link>
              )}
              <SignOutButton className="inline-flex min-h-touch items-center rounded-md border border-border-subtle px-3 text-sm font-semibold text-text-secondary hover:bg-elevated hover:text-text-primary" />
            </div>
          </div>
          <AdminNav />
        </div>
      </header>
      <main className="yaentre-safe-pb-lg mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}

/** El nivel de acceso, en texto y no solo en color (WCAG: el color nunca es
 *  el único canal). */
function RoleBadge({ isMaster }: { isMaster: boolean }) {
  return isMaster ? (
    <span
      data-testid="admin-role-badge"
      className="inline-flex items-center gap-1 rounded-md bg-brand px-2 py-0.5 text-xs font-semibold text-on-brand"
    >
      <Icon name="star" className="h-3 w-3" />
      Administrador maestro
    </span>
  ) : (
    <span
      data-testid="admin-role-badge"
      className="rounded-md border border-border-subtle px-2 py-0.5 text-xs font-semibold text-text-secondary"
    >
      Administrador
    </span>
  );
}
