import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { VerificationBanner } from '@/components/ui/VerificationBanner';
import { BottomNav } from '@/components/dashboard/BottomNav';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { TopBar } from '@/components/dashboard/TopBar';
import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';
import { getStreak } from '@/lib/db/streak';
import { isOnboardingComplete } from '@/lib/onboarding/steps';

export default async function AppLayout({ children }: { children: ReactNode }) {
  // El middleware ya bloquea /app/* sin sesión; este guard es defensa en
  // profundidad (páginas cacheadas, cambios futuros de matcher, etc.) y,
  // además, exige onboarding completo — redirige a /onboarding si falta
  // (F5, ver src/lib/onboarding/steps.ts). El chequeo de ROL va primero
  // (F16): un tutor tiene `onboardingStep=0` de por vida (nunca pasa por el
  // asistente de alumno), así que si se comprobara onboarding antes que rol
  // un tutor quedaría atrapado en /onboarding sin salida — /app es
  // exclusivamente para STUDENT.
  let authUser;
  let profileId: string;
  let displayName: string | null;
  try {
    const { authUser: user, profile } = await requireUser();
    if (profile.role === 'PARENT') {
      redirect('/tutor');
    }
    if (!isOnboardingComplete(profile.onboardingStep)) {
      redirect('/onboarding');
    }
    authUser = user;
    profileId = profile.id;
    displayName = profile.displayName;
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
