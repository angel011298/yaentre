import type { Metadata } from "next";
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";
import { getSiteUrl } from "@/lib/auth/site-url";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Acierta — Tu entrenador de admisión con IA",
  description:
    "Prepárate para tu examen de admisión a UNAM, IPN, UAM o CENEVAL con un simulador fiel al examen real y un Aciertómetro que predice tus aciertos.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  themeColor: "#7C3AED",
  // PWA instalable (F17 tarea 1): `manifest.ts` ya se enlaza solo por
  // convención de archivo; esto cubre lo que el manifest no puede en iOS
  // (Safari ignora `display: standalone` del manifest — solo respeta estas
  // meta tags de Apple para abrir sin chrome del navegador).
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Acierta",
  },
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
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
