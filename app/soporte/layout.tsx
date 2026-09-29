import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { StaffShell } from '@/components/staff/StaffShell';
import { AuthError } from '@/lib/auth/errors';
import { requireCapability } from '@/lib/auth/guards';

export const metadata: Metadata = {
  title: 'Soporte',
  robots: { index: false, follow: false },
};

/**
 * Mesa de soporte (Bloque 3): ARCO y reembolsos. La ven soporte y el admin
 * (`users.read`).
 *
 * ⚠️ Este layout NO es la protección: cada página, ruta y acción de esta zona
 * vuelve a llamar a su guard por su cuenta (`users.read`, `arco.handle`,
 * `refunds.issue`).
 */
export default async function SupportLayout({ children }: { children: ReactNode }) {
  let email: string | undefined;
  let role: string;
  try {
    const { authUser, profile } = await requireCapability('users.read');
    email = authUser.email;
    role = profile.role;
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(err.code === 'FORBIDDEN' ? '/app' : '/login?next=/soporte');
    }
    throw err;
  }

  return (
    <StaffShell role={role} email={email} title="Soporte">
      {children}
    </StaffShell>
  );
}
