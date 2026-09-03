/**
 * Constructores de datos estructurados schema.org (G68). Puros: reciben el
 * origen del sitio y los datos ya resueltos, devuelven el objeto JSON-LD.
 * Se renderizan con `<JsonLd>` en las páginas públicas.
 *
 * Qué describe cada uno:
 *  - `organizationJsonLd`  → quién es YaEntre (organización educativa).
 *  - `websiteJsonLd`       → el sitio como entidad (nombre + idioma).
 *  - `faqJsonLd`           → las preguntas frecuentes de la landing.
 *  - `productJsonLd`       → el producto y sus planes con precio.
 */

const ORG_ID_SUFFIX = '#organization';
const CONTACT_EMAIL = 'hola@yaentre.com';
const DESCRIPTION =
  'Plataforma de preparación con inteligencia artificial para los exámenes de admisión en línea de la UNAM, el IPN, la UAM y el CENEVAL (EXANI II): diagnóstico, ruta de estudio personalizada, simulador fiel del examen real y Entrómetro que predice tus aciertos.';

/** `@id` estable de la organización — permite que otros nodos la referencien. */
export function organizationId(site: string): string {
  return `${site}/${ORG_ID_SUFFIX}`;
}

export function organizationJsonLd(site: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': organizationId(site),
    name: 'YaEntre',
    alternateName: 'YaEntre.com',
    url: `${site}/`,
    logo: `${site}/icon-512`,
    image: `${site}/opengraph-image`,
    description: DESCRIPTION,
    email: CONTACT_EMAIL,
    areaServed: { '@type': 'Country', name: 'México' },
    knowsLanguage: 'es-MX',
    contactPoint: {
      '@type': 'ContactPoint',
      email: CONTACT_EMAIL,
      contactType: 'customer support',
      availableLanguage: ['Spanish'],
    },
  };
}

export function websiteJsonLd(site: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site}/#website`,
    url: `${site}/`,
    name: 'YaEntre',
    description: DESCRIPTION,
    inLanguage: 'es-MX',
    publisher: { '@id': organizationId(site) },
  };
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export function faqJsonLd(items: readonly FaqEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export interface ProductOffer {
  /** Nombre visible del plan. */
  name: string;
  /** Precio en PESOS (no centavos), como string con 2 decimales. */
  price: string;
  description?: string;
}

/**
 * Producto = YaEntre, con una oferta por plan. El plan Free se incluye como
 * oferta a `0` para que el rango de precios del producto empiece en gratis.
 */
export function productJsonLd(
  site: string,
  offers: readonly ProductOffer[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'YaEntre — Preparación para el examen de admisión',
    description: DESCRIPTION,
    brand: { '@type': 'Brand', name: 'YaEntre' },
    category: 'Education > Test Preparation',
    url: `${site}/precios`,
    image: `${site}/opengraph-image`,
    offers: offers.map((offer) => ({
      '@type': 'Offer',
      name: offer.name,
      ...(offer.description ? { description: offer.description } : {}),
      price: offer.price,
      priceCurrency: 'MXN',
      availability: 'https://schema.org/InStock',
      url: `${site}/precios`,
      seller: { '@id': organizationId(site) },
    })),
  };
}
