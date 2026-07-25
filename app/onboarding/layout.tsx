import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';

/**
 * Layout del onboarding: exige sesión (como (app)/layout.tsx) pero
 * deliberadamente NO usa requireOnboarding — este layout ES el destino al
 * que ese guard redirige, así que aplicarlo aquí crearía un loop.
 */
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  try {
    await requireUser();
  } catch (err) {
    if (err instanceof AuthError) {
      redirect('/login?next=/onboarding');
    }
    throw err;
  }

  return (
    <div data-theme="dark" className="min-h-screen bg-base text-text-primary">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-10 sm:max-w-lg">
        {children}
      </main>
    </div>
  );
}
