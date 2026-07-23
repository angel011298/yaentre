import type { Metadata } from 'next';
import { PublicPageShell } from '@/components/marketing/PublicPageShell';

export const metadata: Metadata = {
  title: 'Términos y condiciones — Acierta',
  robots: { index: false, follow: true },
};

export default function TerminosPage() {
  return (
    <PublicPageShell>
      <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl font-bold text-text-primary">Términos y condiciones</h1>
        <p className="mt-4 text-text-secondary">
          Estamos preparando la versión completa de nuestros términos y condiciones junto con
          nuestro equipo legal antes del lanzamiento. Esta página se actualizará con el documento
          final.
        </p>
        <p className="mt-4 text-text-secondary">
          Mientras tanto, si tienes dudas sobre el uso de Acierta, escríbenos a{' '}
          <a href="mailto:hola@acierta.mx" className="font-semibold text-brand hover:underline">
            hola@acierta.mx
          </a>
          .
        </p>
      </section>
    </PublicPageShell>
  );
}
