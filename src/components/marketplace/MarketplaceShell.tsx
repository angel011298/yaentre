import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/Logo';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { MarketplaceNav, type ShellNavItem } from './MarketplaceNav';

/**
 * G103 — cáscara de las secciones del marketplace que viven fuera de la app
 * del alumno (`/profesor`, `/clases`, `/mis-cursos`, `/aprender`): no exigen
 * el onboarding de admisión (un alumno de regularización no tiene por qué
 * hacerlo) y cada página verifica su propio guard en su primera línea.
 *
 * Tema: el del perfil para el alumno (oscuro por defecto) y claro para el
 * profesor, igual que el panel de madres y padres y el admin.
 */
export function MarketplaceShell({
  theme,
  homeHref,
  homeLabel,
  nav,
  children,
}: {
  theme: string;
  homeHref: string;
  homeLabel: string;
  nav: ShellNavItem[];
  children: ReactNode;
}) {
  return (
    <div data-theme={theme} className="flex min-h-dvh flex-col bg-base text-text-primary">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-brand"
      >
        Saltar al contenido
      </a>
      <header className="yaentre-safe-top border-b border-border-subtle bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href={homeHref} className="flex min-h-touch items-center gap-2" aria-label={homeLabel}>
              <Logo size={32} />
            </Link>
            <SignOutButton className="inline-flex min-h-touch items-center rounded-md border border-border-subtle px-3 text-sm font-semibold text-text-secondary hover:bg-elevated hover:text-text-primary" />
          </div>
          {nav.length > 0 && <MarketplaceNav items={nav} />}
        </div>
      </header>
      <main id="contenido-principal" className="yaentre-safe-pb-lg mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
