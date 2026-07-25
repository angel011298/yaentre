import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { VerificationBanner } from '@/components/ui/VerificationBanner';
import { BottomNav } from '@/components/dashboard/BottomNav';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { TopBar } from '@/components/dashboard/TopBar';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
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
  let avatarUrl: string | null;
  let themePref: string;
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
    avatarUrl = profile.avatarUrl;
    themePref = profile.themePref;
  } catch (err) {
    if (err instanceof AuthError) {
      redirect('/login?next=/app');
    }
    throw err;
  }

  const streak = await getStreak(profileId);
  const initial = (displayName ?? authUser.email ?? '?').trim().charAt(0).toUpperCase();

  return (
    // F17: el tema ya viene de `UserProfile.themePref` (antes vivía solo en
    // localStorage, sin persistencia real) — se cambia desde /app/perfil.
    <div
      data-theme={themePref}
      className="min-h-screen bg-base text-text-primary"
    >
      <Sidebar />
      <TopBar streak={streak?.currentStreak ?? 0} initial={initial || '?'} avatarUrl={avatarUrl} />
      {!authUser.email_confirmed_at && <VerificationBanner />}
      <OfflineBanner />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-8 pb-24 lg:pl-60 lg:pb-8">
        <InstallPrompt />
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
