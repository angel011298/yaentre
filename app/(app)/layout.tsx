import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { VerificationBanner } from '@/components/ui/VerificationBanner';
import { AuthError } from '@/lib/auth/errors';
import { requireOnboarding } from '@/lib/auth/guards';

export default async function AppLayout({ children }: { children: ReactNode }) {
  // El middleware ya bloquea /app/* sin sesión; este guard es defensa en
  // profundidad (páginas cacheadas, cambios futuros de matcher, etc.) y,
  // además, exige onboarding completo — redirige a /onboarding si falta
  // (F5, ver src/lib/onboarding/steps.ts).
  let authUser;
  try {
    ({ authUser } = await requireOnboarding());
  } catch (err) {
    if (err instanceof AuthError) {
      redirect('/login?next=/app');
    }
    throw err;
  }

  return (
    <div
      data-theme="dark"
      className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]"
    >
      {!authUser.email_confirmed_at && <VerificationBanner />}
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
