'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from './nav-items';

/** Navegación inferior móvil (F11 Task 9, UIUX Spec §7.5 `BottomNav`): 5
 *  opciones fijas. Oculta en desktop (`lg:hidden`) — ahí manda `Sidebar`. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="acierta-safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t border-border-subtle bg-surface lg:hidden">
      {NAV_ITEMS.map((item) => {
        const active = item.builtRoute && pathname === item.href;
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold ${
              active ? 'text-brand' : 'text-text-muted'
            }`}
          >
            <span className="text-lg" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
