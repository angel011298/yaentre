import type { MetadataRoute } from 'next';

/**
 * Manifest de la PWA (F17 tarea 1). Next.js expone esto automáticamente en
 * `/manifest.webmanifest` y agrega `<link rel="manifest">` al `<head>` solo
 * por convención de archivo — mismo patrón que `sitemap.ts`/`robots.ts` (F10).
 *
 * `display: "standalone"` es el modo "pantalla completa" pedido: sin barra
 * de direcciones ni chrome del navegador al abrir desde el ícono instalado.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Acierta',
    short_name: 'Acierta',
    description: 'Tu entrenador de admisión con IA — UNAM, IPN, UAM y CENEVAL.',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0F0F14',
    theme_color: '#7C3AED',
    lang: 'es-MX',
    icons: [
      { src: '/icon-192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512-maskable', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
