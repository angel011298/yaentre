import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { LinkButton } from '@/components/ui/LinkButton';

/**
 * Header público (landing + precios). NO es un layout compartido con
 * registro/login a propósito: esas páginas usan `AuthShell` (dark mode fijo)
 * y no deben heredar este header — ver nota en PublicPageShell.
 *
 * Marca v1: logo horizontal; en los documentos legales, el logo sin personaje.
 */
export function PublicHeader({
  logo = 'personaje',
}: {
  logo?: 'personaje' | 'sin-personaje';
}) {
  return (
    <header className="border-b border-border-subtle bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex min-h-touch items-center">
          {logo === 'sin-personaje' ? (
            <Logo variante="sin-personaje" size={24} />
          ) : (
            <Logo size={34} />
          )}
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/precios"
            className="hidden min-h-touch items-center px-2 text-sm font-semibold text-text-secondary hover:text-brand-fg sm:flex"
          >
            Precios
          </Link>
          <Link
            href="/login"
            className="flex min-h-touch items-center px-2 text-sm font-semibold text-text-secondary hover:text-brand-fg"
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
