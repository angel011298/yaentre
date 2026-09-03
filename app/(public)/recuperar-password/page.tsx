import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/ui/AuthShell';
import { ForgotPasswordForm } from './ForgotPasswordForm';

// Página utilitaria: nada que indexar (G68). También bloqueada en robots.txt.
export const metadata: Metadata = {
  title: 'Recuperar contraseña',
  robots: { index: false, follow: false },
};

export default function RecuperarPasswordPage() {
  return (
    <AuthShell
      title="¿Olvidaste tu contraseña?"
      subtitle="Te enviamos un enlace para crear una nueva."
    >
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-text-secondary">
        <Link href="/login" className="text-brand-soft hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </AuthShell>
  );
}
