'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface ShellNavItem {
  href: string;
  label: string;
  /** Coincidencia exacta (para la entrada de inicio de cada sección). */
  exact?: boolean;
}

/** Navegación de la sección; el estado activo va en texto (`aria-current`) y no solo en color. */
export function MarketplaceNav({ items }: { items: ShellNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones" className="-mx-1 flex flex-wrap gap-1">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex min-h-touch items-center rounded-md px-3 text-sm font-medium transition-colors ${
              active ? 'bg-brand text-on-brand' : 'text-text-secondary hover:bg-elevated hover:text-text-primary'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
