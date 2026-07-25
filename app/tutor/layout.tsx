import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AuthError } from '@/lib/auth/errors';
import { requireRole } from '@/lib/auth/guards';

/**
 * `/tutor` vive FUERA de `(app)` a propósito (F16): distinto rol, distinto
 * tema (claro fijo), distinta navegación — nada que compartir con el layout
 * del alumno. Guard mínimo aquí: exige rol PARENT; un STUDENT (rol
 * incorrecto → FORBIDDEN) nunca debería estar aquí y se manda a su propio
 * dashboard, no a un error.
 */
export default async function TutorLayout({ children }: { children: ReactNode }) {
  try {
    await requireRole('PARENT');
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(err.code === 'UNAUTHORIZED' ? '/login?next=/tutor' : '/app');
    }
    throw err;
  }

  return children;
}
