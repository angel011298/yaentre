'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from './nav-items';

/** Barra lateral de escritorio (F11 Task 9, UIUX Spec §7.5 `Sidebar`).
 *  Oculta en móvil — ahí manda `BottomNav`. */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-border-subtle bg-surface p-4 lg:flex">
      <Link href="/" className="mb-8 px-2 font-display text-xl font-bold text-brand">
        Acierta
      </Link>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = item.builtRoute && pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-touch items-center gap-3 rounded-md px-3 text-sm font-semibold transition-all ${
                active
                  ? 'bg-brand-tint text-brand'
                  : 'text-text-secondary hover:bg-elevated hover:text-text-primary'
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
    </aside>
  );
}
