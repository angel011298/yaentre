import type { ReactNode } from 'react';
import { PublicFooter } from './PublicFooter';
import { PublicHeader } from './PublicHeader';

/**
 * Envoltura de las páginas de marketing (landing, precios): fuerza modo claro
 * sin toggle (UIUX Spec §3.5: "Landing page / marketing | Light | No").
 *
 * A propósito NO es un `layout.tsx` de `app/(public)/`: ese grupo de rutas
 * también contiene registro/login, que usan `AuthShell` con
 * `data-theme="dark"` fijo (DP6: el alumno vive en dark mode). Un layout
 * compartido les inyectaría este header/footer de marketing sin que lo
 * pidan — este componente se importa explícitamente solo donde se necesita.
 */
export function PublicPageShell({ children }: { children: ReactNode }) {
  return (
    <div data-theme="light" className="flex min-h-screen flex-col bg-base text-text-primary">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
