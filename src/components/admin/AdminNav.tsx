'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  // G100 — resumen del panel y del nivel de acceso. Única entrada con
  // coincidencia EXACTA: con `startsWith('/admin')` estaría siempre activa.
  { href: '/admin', label: 'Inicio', exact: true },
  { href: '/admin/questions/queue', label: 'Revisión' },
  { href: '/admin/reports', label: 'Reportes' },
  { href: '/admin/coverage', label: 'Cobertura' },
  // G99 — administración maestra. Las tres exigen ADMIN (layout); las acciones
  // destructivas de dentro exigen además `MASTER_ADMIN_EMAILS`.
  { href: '/admin/usuarios', label: 'Usuarios' },
  { href: '/admin/bitacora', label: 'Bitácora' },
  { href: '/admin/boveda', label: 'Bóveda' },
  // G103 — temporalidad de acceso (solo lectura).
  { href: '/admin/vigencias', label: 'Vigencias' },
  // G103 — marketplace (las páginas existen siempre; sin profesores ni cursos
  // muestran su estado vacío).
  { href: '/admin/profesores', label: 'Profesores' },
  { href: '/admin/cursos', label: 'Cursos' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {LINKS.map((link) => {
        const active = 'exact' in link ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`min-h-touch inline-flex items-center rounded-md px-3 text-sm font-medium transition-all ${
              active
                ? 'bg-brand text-on-brand'
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
