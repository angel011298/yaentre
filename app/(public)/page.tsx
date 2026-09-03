import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicPageShell } from '@/components/marketing/PublicPageShell';
import { Hero } from '@/components/marketing/Hero';
import { Differentiators } from '@/components/marketing/Differentiators';
import { ParentSection } from '@/components/marketing/ParentSection';
import { EarlyBirdBanner } from '@/components/marketing/EarlyBirdBanner';
import { Faq } from '@/components/marketing/Faq';
import { PixelPageView } from '@/components/marketing/PixelPageView';
import { LinkButton } from '@/components/ui/LinkButton';
import { getSiteUrl } from '@/lib/auth/site-url';
import { FAQ_ITEMS } from '@/lib/marketing/faq-data';
import { JsonLd } from '@/lib/seo/JsonLd';
import { openGraphFor } from '@/lib/seo/metadata';
import { faqJsonLd, organizationJsonLd, websiteJsonLd } from '@/lib/seo/structured-data';

// El conteo de licencias Early Bird (EarlyBirdBanner) debe reflejar compras
// reales — sin esto, Next.js pre-renderiza la página como estática y el
// número queda congelado en el momento del build, no en tiempo real.
export const revalidate = 60;

export const metadata: Metadata = {
  title: {
    absolute:
      'YaEntre — Prepárate para tu examen de admisión a la UNAM, el IPN, la UAM y el CENEVAL',
  },
  description:
    'Prepárate para el examen de admisión en línea de la UNAM, el IPN, la UAM o el CENEVAL (EXANI II) con un simulador fiel al examen real, un Entrómetro que predice tus aciertos y una ruta de estudio que se adapta a ti. Empieza gratis, sin tarjeta.',
  alternates: { canonical: '/' },
  openGraph: openGraphFor({
    url: '/',
    title: 'YaEntre — Tu entrenador de admisión con IA para la UNAM y el IPN',
    description:
      'No es otro curso con videos. Es un entrenador que sabe exactamente qué te falta para entrar — con simulador del examen real y predicción de aciertos.',
  }),
};

export default function LandingPage() {
  const site = getSiteUrl();

  return (
    <PublicPageShell>
      <JsonLd
        data={[
          organizationJsonLd(site),
          websiteJsonLd(site),
          faqJsonLd(FAQ_ITEMS),
        ]}
      />
      <PixelPageView />
      <EarlyBirdBanner />
      <Hero />
      <Differentiators />
      <ParentSection />

      <section className="bg-brand-tint py-16 text-center sm:py-20">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-text-primary">
            Tu lugar no se gana viendo videos. Se gana practicando.
          </h2>
          <p className="mt-3 text-text-secondary">
            Empieza tu diagnóstico gratis hoy — te toma menos de 45 minutos.
          </p>
          <div className="mt-6">
            <LinkButton href="/registro" variant="primary" className="px-8 py-3 text-base">
              Empieza gratis
            </LinkButton>
          </div>
        </div>
      </section>

      <Faq />

      <section className="pb-16 text-center">
        <p className="text-sm text-text-muted">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Inicia sesión
          </Link>
        </p>
      </section>
    </PublicPageShell>
  );
}
