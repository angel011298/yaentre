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

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "YaEntre — Tu entrenador de admisión con IA",
  description:
    "Prepárate para tu examen de admisión a UNAM, IPN, UAM o CENEVAL con un simulador fiel al examen real y un Entrómetro que predice tus aciertos.",
  // PWA instalable (F17 tarea 1): `manifest.ts` ya se enlaza solo por
  // convención de archivo; esto cubre lo que el manifest no puede en iOS
  // (Safari ignora `display: standalone` del manifest — solo respeta estas
  // meta tags de Apple para abrir sin chrome del navegador).
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "YaEntre",
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
