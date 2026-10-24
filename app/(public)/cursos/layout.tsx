import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { readMarketplaceFlags } from '@/lib/marketplace/flags';

/**
 * G103 — con `FEATURE_COURSES` apagada el catálogo no existe: 404 REAL. La
 * verificación va aquí, ANTES del límite de `loading.tsx`: un `notFound()`
 * dentro de la página llega cuando Next ya mandó el 200 del esqueleto, y la
 * ruta respondía un «404 suave» (contenido de no encontrado con estado 200),
 * lo que el e2e de banderas apagadas encontró. Por la misma razón este
 * segmento NO lleva `loading.tsx`: un curso inexistente debe dar 404 real.
 * La página conserva su propia verificación: un layout no protege los datos
 * de su página (G100).
 */
export const dynamic = 'force-dynamic';

export default function CursosLayout({ children }: { children: ReactNode }) {
  if (!readMarketplaceFlags().courses) notFound();
  return children;
}
