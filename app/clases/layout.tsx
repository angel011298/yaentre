import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { MarketplaceShell } from '@/components/marketplace/MarketplaceShell';
import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';
import { isOnboardingComplete } from '@/lib/onboarding/steps';
import { readMarketplaceFlags } from '@/lib/marketplace/flags';

export const metadata: Metadata = {
  title: 'Clases en vivo',
  robots: { index: false, follow: false },
};

/**
 * G103 — clases en vivo del alumno (directorio, reserva, mis clases). Fuera de
 * `(app)` a propósito: la pista de REGULARIZACIÓN es para cuentas que no
 * necesariamente hicieron el onboarding del examen de admisión. Con la
 * bandera apagada, la sección no existe (404). Cada página verifica su guard.
 */
export default async function ClasesLayout({ children }: { children: ReactNode }) {
  if (!readMarketplaceFlags().liveClasses) notFound();
  let theme = 'dark';
  let hasStudentApp = false;
  try {
    const { profile } = await requireUser();
    theme = profile.themePref;
    hasStudentApp = profile.role === 'STUDENT' && isOnboardingComplete(profile.onboardingStep);
  } catch (err) {
    if (err instanceof AuthError) redirect('/login?next=/clases');
    throw err;
  }
  return (
    <MarketplaceShell
      theme={theme}
      homeHref={hasStudentApp ? '/app' : '/clases'}
      homeLabel={hasStudentApp ? 'Volver a mi tablero' : 'Clases en vivo'}
      nav={[
        { href: '/clases', label: 'Profesores', exact: true },
        { href: '/clases/mis-clases', label: 'Mis clases' },
      ]}
    >
      {children}
    </MarketplaceShell>
  );
}
