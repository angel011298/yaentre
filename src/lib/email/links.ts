import 'server-only';
import { getSiteUrl } from '@/lib/auth/site-url';
import { signUnsubscribeToken } from './unsubscribe-token';

/**
 * Reusa `CRON_SECRET` para firmar los links de baja (ver `unsubscribe-token.ts`
 * para el porqué). El respaldo fijo SOLO aplica cuando no hay secreto configurado
 * (dev local) — en producción `CRON_SECRET` es infraestructura obligatoria
 * (ya declarada en CLAUDE.md/.env.example desde antes de esta fase), así que
 * el respaldo nunca debería usarse ahí. El peor caso de un secreto de
 * respaldo predecible es que alguien apague la preferencia de OTRO usuario —
 * molesto, no una fuga de datos.
 */
export function unsubscribeSecret(): string {
  return process.env.CRON_SECRET || 'dev-only-insecure-unsubscribe-secret';
}

export function buildUnsubscribeUrl(userProfileId: string, type: string): string {
  const token = signUnsubscribeToken(userProfileId, type, unsubscribeSecret());
  const params = new URLSearchParams({ u: userProfileId, t: type, sig: token });
  return `${getSiteUrl()}/api/email/unsubscribe?${params.toString()}`;
}
