'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from './nav-items';
import { Icon } from '@/components/ui/Icon';

/** Navegación inferior móvil (F11 Task 9, UIUX Spec §7.5 `BottomNav`): 5
 *  opciones fijas. Oculta en desktop (`lg:hidden`) — ahí manda `Sidebar`. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="yaentre-safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t border-border-subtle bg-surface lg:hidden">
      {NAV_ITEMS.map((item) => {
        const active = item.builtRoute && pathname === item.href;
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold ${
              active ? 'text-brand-soft' : 'text-text-muted'
            }`}
          >
            <Icon name={item.icon} className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
