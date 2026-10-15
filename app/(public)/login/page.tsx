import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/ui/AuthShell';
import { SESSION_PERSISTENCE } from '@/lib/auth/session-policy';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Inicia sesión',
  description: 'Entra a tu cuenta de YaEntre y sigue tu preparación donde te quedaste.',
  alternates: { canonical: '/login' },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    registered?: string;
    passwordUpdated?: string;
    sesion?: string;
  }>;
}) {
  const { next, registered, passwordUpdated, sesion } = await searchParams;

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
      {/* G100: el cierre de sesión (`/auth/salir`) y el tope de vida de la
          sesión (`proxy.ts`) aterrizan aquí con `sesion=`. */}
      {sesion === 'cerrada' && (
        <p role="status" className="mb-4 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          Cerraste sesión en este dispositivo.
        </p>
      )}
      {sesion === 'expirada' && (
        <p role="status" className="mb-4 rounded-md bg-info/10 px-3 py-2 text-sm text-info">
          Por seguridad tu sesión se cerró sola. Vuelve a iniciar sesión para continuar.
        </p>
      )}
      <LoginForm next={next} />
      {SESSION_PERSISTENCE === 'ephemeral' && (
        <p className="mt-4 text-xs text-text-muted">
          Tu sesión no se queda guardada en este dispositivo: se cierra al cerrar el navegador.
          Si usas un equipo prestado, no dejes que el navegador guarde tu contraseña.
        </p>
      )}
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
