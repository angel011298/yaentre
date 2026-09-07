import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";
import { getSiteUrl } from "@/lib/auth/site-url";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";
import { CookiesConsentBanner } from "@/components/legal/CookiesConsentBanner";
import { SignupConversionTracker } from "@/components/marketing/SignupConversionTracker";
import { BRAND_PRIMARY_HEX } from "@/lib/brand/colors";
import "./globals.css";

// G62 (rendimiento):
//  - Pesos recortados: Outfit es solo DISPLAY (títulos, `<strong>`), el copy
//    la usa únicamente en 600/700/800 — 400/500 no se aplicaban nunca.
//  - `display: "optional"` en las tres: en una conexión móvil lenta la fuente
//    no llega en los ~100 ms de gracia, así que el navegador se queda con la
//    de sistema para esa carga y **no hace swap tardío** — eso eliminaba un
//    reflow de bloques de texto apilados que disparaba CLS de hasta 0.30 en
//    el pre-flight del simulador. `adjustFontFallback` (por defecto) deja la
//    fuente de sistema métricamente cerca; en la segunda visita la fuente ya
//    está en caché y entra al instante.
//  - `preload: false` en Mono: solo se usa en el timer y contadores, nunca
//    por encima del pliegue.
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "optional",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "optional",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "optional",
  preload: false,
});

const SITE_URL = getSiteUrl();

// G68: verificación de propiedad para Google Search Console y Bing Webmaster
// Tools por meta tag. Se emiten SOLO si la variable de entorno tiene un valor
// real — sin ellas, Next no agrega la etiqueta (el dueño también puede
// verificar por DNS TXT y dejar estas sin configurar). Ver docs/SEO.md.
const siteVerification: Metadata["verification"] = {};
if (process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION) {
  siteVerification.google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
}
if (process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION) {
  siteVerification.other = {
    "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION,
  };
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // `template` agrega " — YaEntre" a cada título de página; `default` es el de
  // la raíz y el de cualquier ruta sin título propio.
  title: {
    default: "YaEntre — Prepárate para tu examen de admisión a la UNAM, el IPN, la UAM y el CENEVAL",
    template: "%s — YaEntre",
  },
  description:
    "Preparación con inteligencia artificial para el examen de admisión en línea de la UNAM, el IPN, la UAM y el CENEVAL (EXANI II): diagnóstico, ruta de estudio personalizada, simulador fiel del examen real y un Entrómetro que predice tus aciertos. Empieza gratis.",
  applicationName: "YaEntre",
  authors: [{ name: "YaEntre" }],
  creator: "YaEntre",
  publisher: "YaEntre",
  category: "education",
  keywords: [
    "examen de admisión UNAM",
    "examen de admisión IPN",
    "simulador examen UNAM",
    "simulador examen IPN",
    "aciertos mínimos UNAM",
    "guía examen IPN",
    "cómo entrar a la UNAM",
    "cómo entrar al IPN",
    "preparación EXANI II CENEVAL",
    "examen de admisión UAM",
  ],
  // `telephone: false` evita que iOS convierta en enlaces de llamada cualquier
  // secuencia de dígitos del copy (precios, cantidades de reactivos).
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    siteName: "YaEntre",
    locale: "es_MX",
    url: SITE_URL,
    title: "YaEntre — Tu entrenador de admisión con IA para la UNAM y el IPN",
    description:
      "No es otro curso con videos. Es un entrenador que sabe exactamente qué te falta para entrar — con simulador del examen real y predicción de aciertos.",
  },
  twitter: {
    card: "summary_large_image",
    title: "YaEntre — Tu entrenador de admisión con IA para la UNAM y el IPN",
    description:
      "Simulador fiel del examen de admisión en línea + Entrómetro que predice tus aciertos. Empieza gratis.",
  },
  // Por defecto todo el sitio es indexable; las rutas privadas lo desactivan
  // en su propio layout/página (G68) y `app/robots.ts` las bloquea además a
  // nivel de rastreo. `max-image-preview:large` habilita miniaturas grandes en
  // resultados y vistas previas de redes.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: siteVerification,
  // PWA instalable (F17 tarea 1): `manifest.ts` ya se enlaza solo por
  // convención de archivo; esto cubre lo que el manifest no puede en iOS
  // (Safari ignora `display: standalone` del manifest — solo respeta estas
  // meta tags de Apple para abrir sin chrome del navegador).
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "YaEntre",
  },
  // Next 16 emite `mobile-web-app-capable` (estándar nuevo) desde
  // `appleWebApp.capable`, pero iOS < 17.4 y varios WebViews integrados
  // (el navegador in-app de Facebook/Instagram donde muchos padres abren el
  // panel) siguen leyendo solo la meta legacy con prefijo `apple-`. Se emite
  // a mano para cubrir ambos.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

// Accesibilidad (UIUX Spec §12): `maximumScale` generoso (5x), NUNCA
// `userScalable: false` — bloquear el zoom del sistema está prohibido.
// `viewportFit: "cover"` (F18): sin esto, `env(safe-area-inset-*)` en
// globals.css (.yaentre-safe-bottom/.yaentre-safe-top) siempre resuelve a 0
// en iOS — es el requisito real para que la zona segura tenga efecto, junto
// con `statusBarStyle: "black-translucent"` de arriba (F17).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: BRAND_PRIMARY_HEX,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-MX"
      className={`${outfit.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      data-theme="dark"
      // G71: el script en línea de abajo le pone `data-cookie-consent` a este
      // mismo <html> ANTES de que React hidrate, y el servidor no puede
      // renderizarlo (la decisión vive en localStorage). Sin esto, React 19
      // encuentra un atributo que no puso y lanza el error de hidratación
      // #418 —«This won't be patched up»— en CADA carga completa de página de
      // cualquier visitante que ya eligió, es decir, de casi todos. No rompía
      // nada visible, pero llenaba la consola y, peor, se iba a Sentry
      // (`__sentry_captured__`), gastando cuota y tapando los errores reales.
      // `suppressHydrationWarning` aplica solo a los atributos de ESTE
      // elemento, no a su subárbol: es la salida documentada para el patrón
      // "atributo escrito antes del primer paint".
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-base text-text-primary">
        {/* G62: antes de pintar, oculta el banner de cookies para quien ya
            eligió (su decisión vive en localStorage, invisible al servidor).
            El banner se renderiza en SSR igual; esto solo evita el flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var c=localStorage.getItem('yaentre-cookies-consent');if(c==='true'||c==='false')document.documentElement.setAttribute('data-cookie-consent','set')}catch(e){}",
          }}
        />
        <ServiceWorkerRegister />
        <Suspense fallback={null}>
          <SignupConversionTracker />
        </Suspense>
        <PostHogProvider>{children}</PostHogProvider>
        <CookiesConsentBanner />
      </body>
    </html>
  );
}
