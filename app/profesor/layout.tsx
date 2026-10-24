import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { MarketplaceShell } from '@/components/marketplace/MarketplaceShell';
import type { ShellNavItem } from '@/components/marketplace/MarketplaceNav';
import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';
import { anyMarketplaceOn, readMarketplaceFlags } from '@/lib/marketplace/flags';

export const metadata: Metadata = {
  title: 'Panel del profesor',
  robots: { index: false, follow: false },
};

/**
 * G103 — panel del profesor. Con todas las banderas del marketplace apagadas
 * la sección no existe (404). El layout solo arma la cáscara: CADA página
 * verifica su guard en su primera línea (un layout no protege los datos de su
 * página, G100) y las acciones verifican el suyo por su cuenta.
 */
export default async function ProfesorLayout({ children }: { children: ReactNode }) {
  const flags = readMarketplaceFlags();
  if (!anyMarketplaceOn(flags)) notFound();

  try {
    await requireUser();
  } catch (err) {
    if (err instanceof AuthError) redirect('/login?next=/profesor');
    throw err;
  }

  const nav: ShellNavItem[] = [
    { href: '/profesor', label: 'Inicio', exact: true },
    ...(flags.liveClasses
      ? [
          { href: '/profesor/disponibilidad', label: 'Disponibilidad' },
          { href: '/profesor/clases', label: 'Clases' },
        ]
      : []),
    ...(flags.courses ? [{ href: '/profesor/cursos', label: 'Cursos' }] : []),
    { href: '/profesor/liquidaciones', label: 'Liquidaciones' },
  ];

  return (
    <MarketplaceShell theme="light" homeHref="/profesor" homeLabel="Panel del profesor" nav={nav}>
      {children}
    </MarketplaceShell>
  );
}
