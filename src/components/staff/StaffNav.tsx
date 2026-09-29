'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface StaffNavLink {
  href: string;
  label: string;
}

/**
 * Navegación de la zona de personal. Recibe los enlaces YA filtrados por
 * capacidad desde el layout de servidor: esto solo pinta cuál está activo.
 * Esconder un enlace NO es una protección (cada página vuelve a exigir su
 * capacidad); es no ofrecerle a una persona lo que el servidor va a rechazar.
 */
export function StaffNav({ links }: { links: StaffNavLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Secciones">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`min-h-touch inline-flex items-center rounded-md px-3 text-sm font-medium transition-all ${
              active ? 'bg-brand text-white' : 'text-text-secondary hover:bg-elevated hover:text-text-primary'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
