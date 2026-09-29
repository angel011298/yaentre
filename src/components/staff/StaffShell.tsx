import type { ReactNode } from 'react';
import { signOutAction } from '@/app/actions/auth';
import { CAPABILITIES, ROLE_LABELS, roleHasCapability, type Capability } from '@/lib/admin/capabilities';
import { StaffNav, type StaffNavLink } from './StaffNav';

/**
 * Cascarón de las zonas de personal FUERA de `/admin` (`/fiscal`, `/soporte`).
 * Las páginas de `/admin` no se pueden compartir con contador ni soporte (su
 * layout exige ADMIN y muchas páginas se apoyan solo en él), así que estas zonas
 * tienen su propio layout y su propio cascarón — mismo aspecto, otra puerta.
 *
 * Los enlaces se filtran por capacidad; un ADMIN ve además el regreso al panel.
 */
const ALL_LINKS: Array<StaffNavLink & { capability: Capability }> = [
  { href: '/admin', label: 'Panel admin', capability: 'admin.panel' },
  { href: '/fiscal', label: 'Tablero fiscal', capability: 'fiscal.read' },
  { href: '/fiscal/resico', label: 'Monitor RESICO', capability: 'fiscal.read' },
  { href: '/soporte', label: 'Soporte', capability: 'users.read' },
];

// Referencia explícita para que un cambio en la lista de capacidades no deje un enlace apuntando a una que ya no existe.
const KNOWN: readonly Capability[] = CAPABILITIES;

export function StaffShell({
  role,
  email,
  title,
  children,
}: {
  role: string;
  email: string | null | undefined;
  title: string;
  children: ReactNode;
}) {
  const links = ALL_LINKS.filter((l) => KNOWN.includes(l.capability) && roleHasCapability(role, l.capability)).map(
    ({ href, label }) => ({ href, label })
  );

  return (
    <div data-theme="light" className="min-h-screen bg-base text-text-primary">
      <header className="border-b border-border-subtle bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="font-display text-lg font-semibold">🦉 YaEntre — {title}</p>
            <p className="text-xs text-text-muted">
              {email} · {ROLE_LABELS[role] ?? role}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StaffNav links={links} />
            <form action={signOutAction}>
              <button
                type="submit"
                className="min-h-touch rounded-md px-3 text-sm font-medium text-text-secondary hover:bg-elevated hover:text-text-primary"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
