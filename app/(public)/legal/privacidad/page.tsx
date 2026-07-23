import type { Metadata } from 'next';
import { PublicPageShell } from '@/components/marketing/PublicPageShell';

export const metadata: Metadata = {
  title: 'Aviso de privacidad — Acierta',
  robots: { index: false, follow: true },
};

export default function PrivacidadPage() {
  return (
    <PublicPageShell>
      <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl font-bold text-text-primary">Aviso de privacidad</h1>
        <p className="mt-4 text-text-secondary">
          Estamos preparando nuestro aviso de privacidad conforme a la Ley Federal de Protección de
          Datos Personales en Posesión de los Particulares, antes del lanzamiento. Esta página se
          actualizará con el documento final.
        </p>
        <p className="mt-4 text-text-secondary">
          Mientras tanto, si tienes dudas sobre el manejo de tus datos, escríbenos a{' '}
          <a href="mailto:hola@acierta.mx" className="font-semibold text-brand hover:underline">
            hola@acierta.mx
          </a>
          .
        </p>
      </section>
    </PublicPageShell>
  );
}
