'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { trackAdPixelEvent } from '@/lib/marketing/pixels';

/**
 * Dispara el evento CompleteRegistration de los píxeles de publicidad (F24,
 * tarea 1) al detectar el marcador `?signup=1` en la URL de destino de
 * `signUpAction` (`app/actions/auth.ts`).
 *
 * Vive en el layout raíz (envuelto en `<Suspense>` porque usa
 * `useSearchParams`) para cubrir CUALQUIER destino posible del registro
 * (`/app`, `/tutor`, `/login?registered=1`) sin duplicar este componente en
 * cada uno. Un Server Action que redirige en su rama de éxito nunca puede
 * devolverle datos al cliente — por eso la señal de "justo me registré"
 * viaja en la URL en vez de en el valor de retorno de la action.
 *
 * Limpia el parámetro de la URL después de disparar el evento (`replace`,
 * sin nueva entrada en el historial) para que refrescar la página no
 * vuelva a contar el mismo registro dos veces.
 */
export function SignupConversionTracker() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('signup') !== '1') return;

    trackAdPixelEvent('CompleteRegistration');

    const clean = new URLSearchParams(searchParams);
    clean.delete('signup');
    const query = clean.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe correr cuando cambia el searchParam relevante, no en cada render de router/pathname
  }, [searchParams]);

  return null;
}
