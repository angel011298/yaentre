import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { VerificationBanner } from '@/components/ui/VerificationBanner';
import { BottomNav } from '@/components/dashboard/BottomNav';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { TopBar } from '@/components/dashboard/TopBar';
import { AppFooter } from '@/components/dashboard/AppFooter';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
import { IdentifyUser } from '@/components/analytics/IdentifyUser';
import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';
import { getStreak } from '@/lib/db/streak';
import { isOnboardingComplete } from '@/lib/onboarding/steps';

// Toda la app del alumno (dashboard, práctica, diagnóstico, checkout, paywall)
// es privada: nunca se indexa (G68). `app/robots.ts` además la bloquea al
// rastreo.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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

  const initial = (displayName ?? authUser.email ?? '?').trim().charAt(0).toUpperCase();

  return (
    // F17: el tema ya viene de `UserProfile.themePref` (antes vivía solo en
    // localStorage, sin persistencia real) — se cambia desde /app/perfil.
    <div
      data-theme={themePref}
      className="flex min-h-screen flex-col bg-base text-text-primary"
    >
      <IdentifyUser profileId={profileId} />
      {/* G63: enlace para saltar la barra lateral / superior con el teclado. */}
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Saltar al contenido
      </a>
      <Sidebar />
      {/* G74 (rendimiento): `getStreak` era un `await` del LAYOUT, así que
          bloqueaba el primer byte del cuerpo de TODA página autenticada —
          dashboard, práctica, progreso y perfil por igual — solo para pintar
          un número en la esquina. Medido con Lighthouse contra producción, el
          primer pintado con contenido del dashboard llegaba a irse a 1 469 ms
          con el fondo ya pintado desde los 339 ms: el `<h1>` existía, pero sus
          bytes todavía no habían salido del servidor. Dentro de su propio
          `<Suspense>`, la cáscara sale de inmediato y la racha entra en cuanto
          su consulta resuelve, sin mover nada de sitio (`StreakFlame` reserva
          su alto). Mismo criterio que G62 aplicó dentro del dashboard. */}
      <Suspense fallback={<TopBar streak={0} initial={initial || '?'} avatarUrl={avatarUrl} />}>
        <TopBarWithStreak profileId={profileId} initial={initial || '?'} avatarUrl={avatarUrl} />
      </Suspense>
      {!authUser.email_confirmed_at && <VerificationBanner />}
      <OfflineBanner />
      {/* G64: la reserva de espacio para la BottomNav vive ahora en el
          `AppFooter` (que va siempre después de `<main>` y era lo que de
          verdad quedaba tapado al hacer scroll hasta el fondo en móvil).
          `<main>` solo necesita su respiro inferior normal. */}
      <main
        id="contenido-principal"
        className="mx-auto w-full max-w-5xl space-y-4 px-4 py-8 flex-1 lg:pl-60"
      >
        {children}
      </main>
      <AppFooter />
      <BottomNav />
      {/* G62: fuera del flujo de `<main>` — se renderiza `fixed` y solo tras
          hidratar, así que dentro del contenido causaba layout shift. */}
      <InstallPrompt />
    </div>
  );
}

async function TopBarWithStreak({
  profileId,
  initial,
  avatarUrl,
}: {
  profileId: string;
  initial: string;
  avatarUrl: string | null;
}) {
  const streak = await getStreak(profileId);
  return <TopBar streak={streak?.currentStreak ?? 0} initial={initial} avatarUrl={avatarUrl} />;
}
