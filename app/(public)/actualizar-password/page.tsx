import type { Metadata } from 'next';
import { AuthShell } from '@/components/ui/AuthShell';
import { UpdatePasswordForm } from './UpdatePasswordForm';

// Se llega con un token de recuperación en la URL: nunca se indexa (G68).
export const metadata: Metadata = {
  title: 'Crear nueva contraseña',
  robots: { index: false, follow: false },
};

export default function ActualizarPasswordPage() {
  return (
    <AuthShell
      title="Crea una nueva contraseña"
      subtitle="Tu enlace de recuperación es válido por tiempo limitado."
    >
      <UpdatePasswordForm />
    </AuthShell>
  );
}
