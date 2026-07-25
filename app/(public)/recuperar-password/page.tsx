import Link from 'next/link';
import { AuthShell } from '@/components/ui/AuthShell';
import { ForgotPasswordForm } from './ForgotPasswordForm';

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
