import type { ReactNode } from 'react';
import { requireUser } from '@/lib/auth/guards';
import { normalizeFontScale } from '@/lib/profile/settings';

/**
 * G100 — el simulador vive FUERA del grupo `(app)` (pantalla aislada, sin la
 * navegación del alumno), así que no hereda el `data-font-scale` de ese
 * layout. El tamaño de letra es justo donde más falta hace: las lecturas de
 * comprensión de 300-500 palabras. El tema NO se hereda a propósito — el
 * simulador es la excepción visual deliberada (CLAUDE.md §Sistema de diseño).
 *
 * Sin sesión no decide nada: la página hace su propio guard y redirige. Aquí
 * solo se omite el atributo. `requireUser` va con `cache()`, así que la página
 * no paga una segunda consulta.
 */
export default async function SimuladorLayout({ children }: { children: ReactNode }) {
  let fontScale: string | undefined;
  try {
    const { profile } = await requireUser();
    fontScale = normalizeFontScale(profile.fontScale);
  } catch {
    fontScale = undefined;
  }
  return <div data-font-scale={fontScale}>{children}</div>;
}
