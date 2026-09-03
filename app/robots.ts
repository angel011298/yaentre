import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/auth/site-url';

/**
 * Reglas de rastreo (F10 · endurecido en G68). Se indexa TODO lo público
 * (landing, precios, registro, login) y se bloquea toda la superficie
 * autenticada o utilitaria. Cada ruta privada además emite `noindex` en su
 * propio layout/página — cinturón y tirantes.
 */
export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        // `/app$` + `/app/` en vez de `/app` a secas: este último también
        // bloquearía `/apple-icon` y `/apple-touch-icon` (arrancan con "/app").
        '/app$',
        '/app/', // dashboard del alumno y todo lo anidado
        '/tutor', // panel parental
        '/admin', // panel de contenido
        '/api/', // route handlers (webhooks, cron, sync, export…)
        '/monitoring', // túnel de Sentry
        '/simulador', // sesión de examen
        '/practicar', // práctica libre
        '/diagnostico', // diagnóstico inicial
        '/onboarding', // asistente de alta
        '/checkout', // flujo de pago + /checkout/resultado
        '/paywall', // muro suave
        '/auth/', // confirmación de correo (con token en la URL)
        '/actualizar-password', // llega con token de recuperación
        '/recuperar-password', // formulario utilitario
      ],
    },
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
