/**
 * Origen público del sitio. Usos:
 *  - URLs de redirect que Supabase incrusta en los correos de
 *    verificación/recuperación y en el Checkout de Stripe.
 *  - `metadataBase` (app/layout.tsx): base de TODOS los `canonical`, `og:url`
 *    e `og:image` del sitio — si esto resuelve mal, cada URL que Google indexa
 *    apunta al host equivocado (G68).
 *
 * Prioridad: `NEXT_PUBLIC_SITE_URL` explícito → dominio de producción conocido
 * (red de seguridad: si la env var se cae en Vercel, los canónicos siguen
 * apuntando a yaentre.com en vez de a localhost) → localhost en desarrollo.
 */
const PRODUCTION_SITE_URL = 'https://yaentre.com';

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'production') {
    return PRODUCTION_SITE_URL;
  }
  return 'http://localhost:3000';
}
