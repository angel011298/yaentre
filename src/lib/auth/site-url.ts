/**
 * Origen público del sitio, usado para construir las URLs de redirect que
 * Supabase incrusta en los correos de verificación/recuperación.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  return 'http://localhost:3000';
}
