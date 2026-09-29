import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { StaffShell } from '@/components/staff/StaffShell';
import { AuthError } from '@/lib/auth/errors';
import { requireCapability } from '@/lib/auth/guards';

export const metadata: Metadata = {
  title: 'Fiscal',
  robots: { index: false, follow: false },
};

/**
 * Zona fiscal (Bloque 3): tablero fiscal y monitor RESICO, SOLO LECTURA. La
 * ven el contador y el admin (`fiscal.read`).
 *
 * ⚠️ Este layout NO es la protección: cada página y cada endpoint de esta zona
 * vuelve a llamar a `requireCapability('fiscal.read')` por su cuenta, porque un
 * layout no protege una ruta ni una acción y no se vuelve a ejecutar en las
 * navegaciones del cliente.
 */
export default async function FiscalLayout({ children }: { children: ReactNode }) {
  let email: string | undefined;
  let role: string;
  try {
    const { authUser, profile } = await requireCapability('fiscal.read');
    email = authUser.email;
    role = profile.role;
  } catch (err) {
    if (err instanceof AuthError) {
      // Sin sesión → login; con sesión pero sin la capacidad → su destino natural.
      redirect(err.code === 'FORBIDDEN' ? '/app' : '/login?next=/fiscal');
    }
    throw err;
  }

  return (
    <StaffShell role={role} email={email} title="Fiscal">
      {children}
    </StaffShell>
  );
}
