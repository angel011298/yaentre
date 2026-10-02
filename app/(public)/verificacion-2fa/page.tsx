import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { signOutAction } from '@/app/actions/auth';
import { AuthShell } from '@/components/ui/AuthShell';
import { requireUserPendingMfa } from '@/lib/auth/guards';
import { safeInternalPath } from '@/lib/auth/safe-redirect';
import { MfaChallengeForm } from './MfaChallengeForm';

export const metadata: Metadata = {
  title: 'Verificación en dos pasos',
  robots: { index: false, follow: false },
};

/**
 * G100 — reto del segundo factor. Única página (con cerrar sesión) que acepta
 * una sesión aal1 de una cuenta con TOTP: todo lo demás pasa por
 * `requireUser`, que la rechaza y manda aquí vía /login.
 */
export default async function VerificacionDosPasosPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: rawNext } = await searchParams;
  let session;
  try {
    session = await requireUserPendingMfa();
  } catch {
    redirect('/login');
  }
  const next = safeInternalPath(rawNext, session.profile.role === 'PARENT' ? '/tutor' : '/app');
  if (!session.mfaPending) redirect(next);

  return (
    <AuthShell
      title="Verificación en dos pasos"
      subtitle="Abre tu app de autenticación y escribe el código de 6 dígitos de YaEntre."
    >
      <MfaChallengeForm next={next} />
      <form action={signOutAction} className="mt-4 text-center">
        <button type="submit" className="min-h-touch text-sm text-brand-soft hover:underline">
          Usar otra cuenta
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-text-muted">
        ¿Perdiste tu teléfono? Escríbenos a soporte desde el correo de tu cuenta y te ayudamos a
        recuperarla.
      </p>
    </AuthShell>
  );
}
