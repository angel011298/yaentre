import Link from 'next/link';
import type { ReactNode } from 'react';
import { signOutAction } from '@/app/actions/auth';

/**
 * Envoltura del panel parental (F16 tarea 3): modo claro fijo, a diferencia
 * del resto de la app del alumno (UIUX Spec: "Panel parental | Light | No").
 * Deliberadamente ligera — sin Sidebar/BottomNav/Tino del alumno, sin
 * gamificación: el tono aquí es informativo/tranquilizador, no motivacional
 * (F16 tarea 3, público distinto al del alumno).
 *
 * Sin JS de cliente propio (tarea 7: navegador integrado de Facebook) — solo
 * `<Link>`/`<form>` nativos, nada que dependa de APIs que un WebView
 * restringido pudiera bloquear.
 */
export function ParentShell({
  children,
  studentSwitcher,
}: {
  children: ReactNode;
  studentSwitcher?: ReactNode;
}) {
  return (
    <div data-theme="light" className="min-h-screen bg-base text-text-primary">
      <header className="border-b border-border-subtle bg-surface">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/tutor" className="font-display text-lg font-bold text-brand">
            YaEntre · Panel del tutor
          </Link>
          <div className="flex items-center gap-4">
            {studentSwitcher}
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex min-h-touch items-center text-sm font-semibold text-text-muted hover:text-brand"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
