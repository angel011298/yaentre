import Link from 'next/link';
import { StreakFlame } from '@/components/gamification/StreakFlame';

/** Barra superior (F11 Task 4 + UIUX Spec §7.5 `TopBar`): logo, racha
 *  (visible arriba, como pide la tarea) y avatar. Server-renderable. */
export function TopBar({ streak, initial }: { streak: number; initial: string }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border-subtle bg-surface/90 px-4 py-3 backdrop-blur lg:pl-60">
      <Link href="/app" className="font-display text-lg font-bold text-brand lg:hidden">
        Acierta
      </Link>
      <div className="ml-auto flex items-center gap-4">
        <StreakFlame days={streak} />
        <Link
          href="/app"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-tint text-sm font-bold text-brand"
          aria-label="Perfil"
        >
          {initial}
        </Link>
      </div>
    </header>
  );
}
