import Link from 'next/link';
import { AuthShell } from '@/components/ui/AuthShell';
import { SignUpForm } from './SignUpForm';

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; role?: string }>;
}) {
  const { next, role } = await searchParams;
  const isTutor = role === 'tutor';

  return (
    <AuthShell
      title={isTutor ? 'Regístrate como tutor' : 'Crea tu cuenta'}
      subtitle={
        isTutor
          ? 'Ve el progreso de tu hijo o hija desde tu propio celular.'
          : 'Empieza gratis. Sin tarjeta, sin compromiso.'
      }
    >
      <SignUpForm next={next} isTutor={isTutor} />
      <p className="mt-6 text-center text-sm text-text-secondary">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-brand-soft hover:underline">
          Inicia sesión
        </Link>
      </p>
    </AuthShell>
  );
}
