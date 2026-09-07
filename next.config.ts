import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { posthogCspHosts } from "./src/lib/analytics/posthog-hosts";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : "";
// G71: PostHog usa DOS orígenes — el de ingesta y el de assets, desde el que
// `posthog-js` carga `config.js`. Permitir solo el primero (F22) dejaba la
// configuración remota bloqueada por CSP en producción, en silencio salvo por
// el error de consola. Ver src/lib/analytics/posthog-hosts.ts.
const posthogHosts = posthogCspHosts(process.env.NEXT_PUBLIC_POSTHOG_HOST);

function isConfigured(id: string | undefined): boolean {
  return Boolean(id) && !id!.startsWith("your-") && !id!.includes("placeholder");
}

// F24: dominios de los píxeles de publicidad — SOLO se agregan a la CSP si
// el ID correspondiente está configurado con un valor real (mismo criterio
// `isConfigured` que decide si el snippet del píxel se inyecta en el
// navegador, src/lib/marketing/pixels.ts). Sin esto, la CSP incluiría
// dominios de terceros que el sitio nunca llega a cargar.
const metaPixelEnabled = isConfigured(process.env.NEXT_PUBLIC_META_PIXEL_ID);
const tiktokPixelEnabled = isConfigured(process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID);

/**
 * F22: cabeceras de seguridad HTTP a nivel de toda la app. La CSP es
 * deliberadamente "razonable" y no de nonce estricto: Next.js necesita
 * `'unsafe-inline'` en script-src para su bootstrap de hidratación salvo que
 * se implemente un esquema de nonce por request (no se intentó aquí — el
 * riesgo de romper la hidratación en rutas no cubiertas por la verificación
 * manual de esta fase pesa más que el beneficio incremental). Aun así,
 * bloquea el vector más dañino: inyección de <script>/<iframe>/<object> de
 * un origen ARBITRARIO de terceros.
 *
 * Sentry usa `tunnelRoute: "/monitoring"` (mismo origen) — por eso no
 * necesita su dominio de ingesta en connect-src. PostHog y Supabase SÍ
 * llaman a su host directo desde el navegador, así que se permiten
 * explícitamente — PostHog con sus DOS orígenes (ingesta y assets), ver
 * G71 en src/lib/analytics/posthog-hosts.ts. Stripe Checkout es una navegación completa
 * (`window.location`), no un iframe/fetch — no requiere entrada en la CSP.
 */
function buildCsp(): string {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    // Solo el host de ASSETS: de ahí sale `config.js`. El de ingesta nunca
    // sirve scripts, así que no tiene por qué estar en `script-src`.
    ...posthogHosts.slice(1),
    ...(metaPixelEnabled ? ["https://connect.facebook.net"] : []),
    ...(tiktokPixelEnabled ? ["https://analytics.tiktok.com"] : []),
  ];
  const connectSrc = [
    "'self'",
    ...posthogHosts,
    ...(supabaseHost ? [supabaseHost] : []),
    ...(metaPixelEnabled ? ["https://www.facebook.com"] : []),
    ...(tiktokPixelEnabled ? ["https://analytics.tiktok.com"] : []),
  ];
  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    ...(supabaseHost ? [supabaseHost] : []),
    ...(metaPixelEnabled ? ["https://www.facebook.com"] : []),
  ];
  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc.join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "frame-src 'none'",
    // G65: `frame-ancestors` es el SUSTITUTO estándar de X-Frame-Options —
    // la cabecera legacy se conserva abajo por navegadores viejos, pero es
    // ésta la que la CSP nivel 2/3 define y la que aplican los navegadores
    // actuales. Faltaba: la app solo estaba protegida contra clickjacking por
    // la cabecera obsoleta. Verificado en vivo contra https://yaentre.com.
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Cinturón junto al HSTS: cualquier subrecurso que quedara escrito con
    // `http://` (un enlace viejo en contenido, un asset copiado a mano) se
    // pide por https en vez de dispararse como contenido mixto bloqueado.
    "upgrade-insecure-requests",
  ].join("; ");
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Cámara habilitada same-origin (el simulador la pide opcionalmente en el
  // pre-flight, F12 — nunca bloqueante); micrófono/geolocalización sin uso.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Content-Security-Policy", value: buildCsp() },
];

const nextConfig: NextConfig = {
  // G65: `X-Powered-By: Next.js` viajaba en cada respuesta (confirmado en
  // producción). No abre nada por sí solo, pero le regala al atacante la
  // versión de framework a la que apuntar sus exploits conocidos. No cuesta
  // nada quitarlo.
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // G65: la foto de perfil ahora viaja por un Server Action (antes subía
      // directo del navegador a Storage). El tope por defecto es 1 MB; el
      // Action rechaza cualquier cosa por encima de 2 MB, así que 3 MB deja
      // margen para el sobre multipart sin volver este borde un buzón abierto.
      bodySizeLimit: '3mb',
    },
  },
  images: {
    // Avatares reales (F17, Supabase Storage) — permite que next/image los
    // optimice (redimensiona + WebP/AVIF) en vez de servirlos tal cual.
    remotePatterns: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? [
          {
            protocol: "https",
            hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

/**
 * F20 tarea 1: sube sourcemaps a Sentry en el build de producción SOLO si
 * hay credenciales reales (`SENTRY_AUTH_TOKEN`) — sin ellas, el plugin
 * simplemente omite la subida (no rompe `pnpm build`); documentado como
 * pendiente en docs/ESTADO.md. `silent: true` evita ruido en el log de build
 * cuando no hay token.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  // El endpoint de túnel evita que los ad-blockers bloqueen los eventos de
  // Sentry saliendo del navegador — activarlo no cuesta nada aunque el DSN
  // todavía sea un placeholder.
  tunnelRoute: "/monitoring",
});
