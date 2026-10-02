import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/ui/AuthShell';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { requireUserPendingMfa } from '@/lib/auth/guards';
import { safeInternalPath } from '@/lib/auth/safe-redirect';
import { LoginForm } from './LoginForm';

/** G100: errores del regreso de Google (`/auth/callback`). */
const GOOGLE_ERRORS: Record<string, string> = {
  google_cancelled: 'Cancelaste el inicio con Google. Puedes intentarlo de nuevo o usar tu correo.',
  google_failed: 'No pudimos entrar con Google. Intenta de nuevo o usa tu correo.',
  google_disabled: 'El inicio con Google no está disponible por ahora. Usa tu correo.',
};

export const metadata: Metadata = {
  title: 'Inicia sesión',
  description: 'Entra a tu cuenta de YaEntre y sigue tu preparación donde te quedaste.',
  alternates: { canonical: '/login' },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; registered?: string; passwordUpdated?: string; error?: string }>;
}) {
  const { next, registered, passwordUpdated, error } = await searchParams;

  // G100: una sesión a la que solo le falta el segundo factor llega aquí
  // porque todos los guards tratan «falta el código» como «sin sesión». Se
  // reenvía al reto en vez de pedir la contraseña otra vez.
  let pendingMfa = false;
  try {
    pendingMfa = (await requireUserPendingMfa()).mfaPending;
  } catch {
    pendingMfa = false;
  }
  if (pendingMfa) {
    const target = safeInternalPath(next, '');
    redirect(target ? `/verificacion-2fa?next=${encodeURIComponent(target)}` : '/verificacion-2fa');
  }
  const googleError = error ? GOOGLE_ERRORS[error] : undefined;

  return (
    <AuthShell title="Inicia sesión" subtitle="Sigue donde te quedaste.">
      {registered && (
        <p className="mb-4 rounded-md bg-info/10 px-3 py-2 text-sm text-info">
          Tu cuenta se creó. Revisa tu correo y luego inicia sesión.
        </p>
      )}
      {passwordUpdated && (
        <p className="mb-4 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          Tu contraseña se actualizó. Inicia sesión con tu nueva contraseña.
        </p>
      )}
      {googleError && (
        <p role="alert" className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {googleError}
        </p>
      )}
      <div className="mb-4">
        <GoogleSignInButton next={next} mode="login" />
      </div>
      <LoginForm next={next} />
      <div className="mt-4 flex items-center justify-between text-sm">
        <Link href="/recuperar-password" className="text-brand-soft hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
        <Link href="/registro" className="text-brand-soft hover:underline">
          Crear cuenta
        </Link>
      </div>
    </AuthShell>
  );
}
