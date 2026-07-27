import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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
