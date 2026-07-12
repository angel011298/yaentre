import Link from 'next/link';
import { AuthShell } from '@/components/ui/AuthShell';
import { LoginForm } from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; registered?: string; passwordUpdated?: string }>;
}) {
  const { next, registered, passwordUpdated } = await searchParams;

  return (
    <AuthShell title="Inicia sesión" subtitle="Sigue donde te quedaste.">
      {registered && (
        <p className="mb-4 rounded-[12px] bg-[var(--info)]/10 px-3 py-2 text-sm text-[var(--info)]">
          Tu cuenta se creó. Revisa tu correo y luego inicia sesión.
        </p>
      )}
      {passwordUpdated && (
        <p className="mb-4 rounded-[12px] bg-[var(--success)]/10 px-3 py-2 text-sm text-[var(--success)]">
          Tu contraseña se actualizó. Inicia sesión con tu nueva contraseña.
        </p>
      )}
      <LoginForm next={next} />
      <div className="mt-4 flex items-center justify-between text-sm">
        <Link href="/recuperar-password" className="text-[var(--brand-soft)] hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
        <Link href="/registro" className="text-[var(--brand-soft)] hover:underline">
          Crear cuenta
        </Link>
      </div>
    </AuthShell>
  );
}
