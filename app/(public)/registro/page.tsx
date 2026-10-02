import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/ui/AuthShell';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { openGraphFor } from '@/lib/seo/metadata';
import { SignUpForm } from './SignUpForm';

export const metadata: Metadata = {
  title: 'Crea tu cuenta gratis',
  description:
    'Regístrate gratis en YaEntre y empieza tu diagnóstico para el examen de admisión de la UNAM, el IPN, la UAM o el CENEVAL. Sin tarjeta, sin compromiso.',
  alternates: { canonical: '/registro' },
  openGraph: openGraphFor({ url: '/registro', title: 'Crea tu cuenta gratis — YaEntre' }),
};

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
      {/* G100: Google solo para alumnos — el registro de tutor marca el rol
          PARENT con un campo del formulario de correo. */}
      {!isTutor && (
        <div className="mb-4">
          <GoogleSignInButton next={next} mode="registro" />
        </div>
      )}
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
