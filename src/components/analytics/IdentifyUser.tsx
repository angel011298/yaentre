'use client';

import { useEffect } from 'react';
import { loadPostHog } from '@/lib/analytics/client';

/**
 * Vincula la sesión anónima del navegador (vistas de página previas al
 * login) con el `UserProfile.id` real — así el embudo completo, desde la
 * primera visita hasta la compra, queda bajo una sola identidad en PostHog.
 * Nunca manda el correo ni el nombre, solo el id interno (F20 tarea 2).
 */
export function IdentifyUser({ profileId }: { profileId: string }) {
  useEffect(() => {
    loadPostHog()?.then((posthog) => posthog.identify(profileId));
  }, [profileId]);

  return null;
}
