import { AuthShell } from '@/components/ui/AuthShell';
import { UpdatePasswordForm } from './UpdatePasswordForm';

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
