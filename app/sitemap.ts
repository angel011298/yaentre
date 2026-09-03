import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/auth/site-url';

/**
 * Mapa del sitio (F10 · revisado en G68): SOLO las páginas públicas
 * indexables. Las legales (`/legal/*`) quedan fuera a propósito mientras
 * tengan marcadores de edición pendiente — agregarlas cuando el dueño las
 * complete (ver docs/SEO.md). Las rutas privadas ni aparecen aquí ni se
 * rastrean (`app/robots.ts`).
 *
 * `lastModified` es una fecha REAL de último cambio de contenido, no
 * `new Date()` — un "modificado ahora" en cada petición es ruido para el
 * rastreador. Actualizar esta constante cuando cambie el copy público.
 */
const LAST_CONTENT_UPDATE = new Date('2026-09-02');

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl();

  return [
    { url: `${site}/`, lastModified: LAST_CONTENT_UPDATE, changeFrequency: 'weekly', priority: 1 },
    { url: `${site}/precios`, lastModified: LAST_CONTENT_UPDATE, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${site}/registro`, lastModified: LAST_CONTENT_UPDATE, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${site}/login`, lastModified: LAST_CONTENT_UPDATE, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
