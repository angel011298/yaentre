import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { MarketplaceShell } from '@/components/marketplace/MarketplaceShell';
import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';
import { isOnboardingComplete } from '@/lib/onboarding/steps';
import { readMarketplaceFlags } from '@/lib/marketplace/flags';

export const metadata: Metadata = {
  title: 'Mis cursos',
  robots: { index: false, follow: false },
};

/**
 * G103 — cursos comprados y reproductor. Fuera de `(app)`: cualquier cuenta
 * registrada compra cursos, haya hecho o no el onboarding de admisión. Cada
 * página verifica su guard en su primera línea.
 */
export default async function Layout({ children }: { children: ReactNode }) {
  if (!readMarketplaceFlags().courses) notFound();
  let theme = 'dark';
  let hasStudentApp = false;
  try {
    const { profile } = await requireUser();
    theme = profile.themePref;
    hasStudentApp = profile.role === 'STUDENT' && isOnboardingComplete(profile.onboardingStep);
  } catch (err) {
    if (err instanceof AuthError) redirect('/login?next=/mis-cursos');
    throw err;
  }
  return (
    <MarketplaceShell
      theme={theme}
      homeHref={hasStudentApp ? '/app' : '/mis-cursos'}
      homeLabel={hasStudentApp ? 'Volver a mi tablero' : 'Mis cursos'}
      nav={[
        { href: '/mis-cursos', label: 'Mis cursos', exact: true },
        { href: '/cursos', label: 'Explorar cursos' },
      ]}
    >
      {children}
    </MarketplaceShell>
  );
}
