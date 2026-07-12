import Link from 'next/link';
import { AuthShell } from '@/components/ui/AuthShell';
import { SignUpForm } from './SignUpForm';

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthShell title="Crea tu cuenta" subtitle="Empieza gratis. Sin tarjeta, sin compromiso.">
      <SignUpForm next={next} />
      <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-[var(--brand-soft)] hover:underline">
          Inicia sesión
        </Link>
      </p>
    </AuthShell>
  );
}
