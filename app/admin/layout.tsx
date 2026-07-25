import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminNav } from '@/components/admin/AdminNav';
import { AuthError } from '@/lib/auth/errors';
import { requireRole } from '@/lib/auth/guards';

/**
 * Guard del panel admin (CC-06). El proxy (proxy.ts) ya exige sesión en
 * /admin/*; este layout es la verificación real de ROL (requireRole('ADMIN'))
 * — defensa en profundidad más el único punto que de verdad discrimina
 * ADMIN de STUDENT/PARENT. Sin sesión → /login; con sesión pero sin rol
 * ADMIN → /app (no tiene sentido devolverlo a /login, ya está autenticado).
 *
 * Tema: light (a diferencia del resto de la app del alumno, que es dark por
 * default) — el admin no es el alumno, ver CLAUDE.md §Sistema de diseño.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  let email: string | undefined;
  try {
    const { authUser } = await requireRole('ADMIN');
    email = authUser.email;
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(err.code === 'FORBIDDEN' ? '/app' : '/login?next=/admin');
    }
    throw err;
  }

  return (
    <div data-theme="light" className="min-h-screen bg-base text-text-primary">
      <header className="border-b border-border-subtle bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="font-display text-lg font-semibold">🦉 Acierta — Admin</p>
            <p className="text-xs text-text-muted">{email}</p>
          </div>
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
