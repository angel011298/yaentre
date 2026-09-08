import 'server-only';
import { getSiteUrl } from '@/lib/auth/site-url';
import { reportControlFailure } from '@/lib/observability/report';
import { signUnsubscribeToken } from './unsubscribe-token';

/**
 * Reusa `CRON_SECRET` para firmar los links de baja (ver `unsubscribe-token.ts`
 * para el porqué). El respaldo fijo SOLO aplica cuando no hay secreto
 * configurado (dev local) — en producción `CRON_SECRET` es infraestructura
 * obligatoria. El peor caso de un secreto de respaldo predecible es que
 * alguien apague la preferencia de OTRO usuario: molesto, no una fuga.
 *
 * ── G73b ────────────────────────────────────────────────────────────────────
 *
 * Este `|| 'dev-only-…'` es la MISMA firma que dejó inerte el limitador de
 * G65: un respaldo que mantiene el producto funcionando mientras anula el
 * control, sin que nada lo diga. Si `CRON_SECRET` faltara en producción, la
 * clave HMAC pasaría a ser una constante que está escrita en el repositorio —
 * o sea, cualquiera podría FIRMAR un enlace de baja para el `userProfileId`
 * que quisiera. Y todo seguiría respondiendo HTTP 200.
 *
 * El respaldo se conserva (rompería el desarrollo local), pero usarlo en
 * producción ya no es gratis ni invisible.
 */
export function unsubscribeSecret(): string {
  const secret = process.env.CRON_SECRET;
  if (secret) return secret;

  if (process.env.VERCEL_ENV === 'production') {
    reportControlFailure(
      'unsubscribe_signature',
      'fail-open',
      new Error('CRON_SECRET ausente en producción: la firma de baja usa la clave pública de respaldo'),
      { fallback: true }
    );
  }
  return 'dev-only-insecure-unsubscribe-secret';
}

export function buildUnsubscribeUrl(userProfileId: string, type: string): string {
  const token = signUnsubscribeToken(userProfileId, type, unsubscribeSecret());
  const params = new URLSearchParams({ u: userProfileId, t: type, sig: token });
  return `${getSiteUrl()}/api/email/unsubscribe?${params.toString()}`;
}
