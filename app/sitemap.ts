import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/auth/site-url';

/** Mapa del sitio (F10 Task 3): solo páginas públicas indexables. */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl();
  const now = new Date();

  return [
    { url: `${site}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${site}/precios`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${site}/registro`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${site}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];
}
