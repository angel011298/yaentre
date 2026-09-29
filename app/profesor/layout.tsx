import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AuthError } from '@/lib/auth/errors';
import { requireUser } from '@/lib/auth/guards';

// Zona privada: nunca se indexa. `/profesores` (con «es») es la landing pública.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Guard del panel del profesor. El middleware ya exige sesión en `/profesor/*`;
 * esto es defensa en profundidad. Ser profesor NO es un rol: cada página decide
 * qué mostrar según exista o no la fila `Teacher` de esta cuenta.
 */
export default async function TeacherLayout({ children }: { children: ReactNode }) {
  try {
    await requireUser();
  } catch (err) {
    if (err instanceof AuthError) redirect('/login?next=/profesor');
    throw err;
  }
  return (
    <div className="min-h-screen bg-base text-text-primary">
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
