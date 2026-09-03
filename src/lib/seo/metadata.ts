import type { Metadata } from 'next';

/**
 * Open Graph completo para una página pública (G68).
 *
 * Next.js NO fusiona en profundidad el campo `openGraph`: si una página define
 * el suyo, REEMPLAZA por completo el del layout raíz — se perderían
 * `type`/`siteName`/`locale` Y la imagen que Next inyecta desde
 * `app/opengraph-image.tsx` (esa imagen se agrega como `openGraph.images` del
 * layout, y el override de la página la borra). Este helper reinyecta todo
 * para que cada página solo pase lo que cambia (url, title, description).
 *
 * `images: ['/opengraph-image']` apunta al mismo generador `next/og` (la ruta
 * responde sin el hash de caché); `metadataBase` lo vuelve absoluto.
 */
export function openGraphFor(overrides: {
  url: string;
  title?: string;
  description?: string;
}): NonNullable<Metadata['openGraph']> {
  return {
    type: 'website',
    siteName: 'YaEntre',
    locale: 'es_MX',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'YaEntre — Tu entrenador de admisión con IA',
      },
    ],
    ...overrides,
  };
}
