import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : "";
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

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
 * explícitamente. Stripe Checkout es una navegación completa
 * (`window.location`), no un iframe/fetch — no requiere entrada en la CSP.
 */
function buildCsp(): string {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    ...(metaPixelEnabled ? ["https://connect.facebook.net"] : []),
    ...(tiktokPixelEnabled ? ["https://analytics.tiktok.com"] : []),
  ];
  const connectSrc = [
    "'self'",
    posthogHost,
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
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
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
