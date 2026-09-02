'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin/questions/queue', label: 'Revisión' },
  { href: '/admin/reports', label: 'Reportes' },
  { href: '/admin/coverage', label: 'Cobertura' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {LINKS.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`min-h-touch inline-flex items-center rounded-md px-3 text-sm font-medium transition-all ${
              active
                ? 'bg-brand text-white'
                : 'text-text-secondary hover:bg-elevated hover:text-text-primary'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
