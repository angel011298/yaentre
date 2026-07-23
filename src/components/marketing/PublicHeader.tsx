import Link from 'next/link';
import { LinkButton } from '@/components/ui/LinkButton';

/**
 * Header público (landing + precios). NO es un layout compartido con
 * registro/login a propósito: esas páginas usan `AuthShell` (dark mode fijo)
 * y no deben heredar este header — ver nota en PublicPageShell.
 */
export function PublicHeader() {
  return (
    <header className="border-b border-border-subtle bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="font-display text-xl font-bold text-brand">
          Acierta
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/precios"
            className="hidden min-h-touch items-center px-2 text-sm font-semibold text-text-secondary hover:text-brand sm:flex"
          >
            Precios
          </Link>
          <Link
            href="/login"
            className="flex min-h-touch items-center px-2 text-sm font-semibold text-text-secondary hover:text-brand"
          >
            Iniciar sesión
          </Link>
          <LinkButton href="/registro" variant="primary" className="whitespace-nowrap">
            Empieza gratis
          </LinkButton>
        </nav>
      </div>
    </header>
  );
}
