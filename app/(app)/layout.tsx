import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { VerificationBanner } from '@/components/ui/VerificationBanner';
import { BottomNav } from '@/components/dashboard/BottomNav';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { TopBar } from '@/components/dashboard/TopBar';
import { AuthError } from '@/lib/auth/errors';
import { requireOnboarding } from '@/lib/auth/guards';
import { getStreak } from '@/lib/db/streak';

export default async function AppLayout({ children }: { children: ReactNode }) {
  // El middleware ya bloquea /app/* sin sesión; este guard es defensa en
  // profundidad (páginas cacheadas, cambios futuros de matcher, etc.) y,
  // además, exige onboarding completo — redirige a /onboarding si falta
  // (F5, ver src/lib/onboarding/steps.ts).
  let authUser;
  let profileId: string;
  let displayName: string | null;
  try {
    const result = await requireOnboarding();
    authUser = result.authUser;
    profileId = result.profile.id;
    displayName = result.profile.displayName;
  } catch (err) {
    if (err instanceof AuthError) {
      redirect('/login?next=/app');
    }
    throw err;
  }

  const streak = await getStreak(profileId);
  const initial = (displayName ?? authUser.email ?? '?').trim().charAt(0).toUpperCase();

  return (
    <div
      data-theme="dark"
      className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]"
    >
      <Sidebar />
      <TopBar streak={streak?.currentStreak ?? 0} initial={initial || '?'} />
      {!authUser.email_confirmed_at && <VerificationBanner />}
      <main className="mx-auto max-w-5xl px-4 py-8 pb-24 lg:pl-60 lg:pb-8">{children}</main>
      <BottomNav />
    </div>
  );
}
