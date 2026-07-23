import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/auth/site-url';

/** F10 Task 3: permite indexar lo público, bloquea todo lo autenticado/interno. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/app',
        '/app/*',
        '/admin',
        '/admin/*',
        '/api/*',
        '/diagnostico',
        '/checkout/*',
        '/paywall',
        '/onboarding',
        '/actualizar-password',
        '/recuperar-password',
      ],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
