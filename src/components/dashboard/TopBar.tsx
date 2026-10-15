import Image from 'next/image';
import Link from 'next/link';
import { StreakFlame } from '@/components/gamification/StreakFlame';

/** Barra superior (F11 Task 4 + UIUX Spec §7.5 `TopBar`): logo, racha
 *  (visible arriba, como pide la tarea) y avatar. Server-renderable.
 *
 *  G100: a una cuenta ADMIN le añade el acceso a su panel. Va aquí y no en la
 *  `BottomNav` porque la barra superior es la única que se ve igual en
 *  celular y en escritorio; el rol lo decide el layout en el servidor. */
export function TopBar({
  streak,
  initial,
  avatarUrl,
  isAdmin = false,
}: {
  streak: number;
  initial: string;
  avatarUrl?: string | null;
  isAdmin?: boolean;
}) {
  return (
    <header className="yaentre-safe-top sticky top-0 z-20 flex items-center justify-between border-b border-border-subtle bg-surface/90 px-4 py-3 backdrop-blur lg:pl-60">
      <Link href="/app" className="font-display text-lg font-bold text-brand-soft lg:hidden">
        YaEntre
      </Link>
      <div className="ml-auto flex items-center gap-4">
        {isAdmin && (
          <Link
            href="/admin"
            className="inline-flex min-h-touch items-center rounded-md border border-border-subtle px-3 text-sm font-semibold text-text-secondary hover:text-text-primary"
          >
            Panel admin
          </Link>
        )}
        <StreakFlame days={streak} />
        <Link
          href="/app/perfil"
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand-tint text-sm font-bold text-brand"
          aria-label="Perfil"
        >
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" width={36} height={36} className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </Link>
      </div>
    </header>
  );
}
