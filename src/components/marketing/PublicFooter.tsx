import Link from 'next/link';

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border-subtle bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display text-lg font-bold text-brand">Acierta</p>
            <p className="mt-1 max-w-xs text-sm text-text-secondary">
              Preparación para tu examen de admisión con IA — UNAM, IPN, UAM y CENEVAL.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
            <div className="space-y-2">
              <p className="font-semibold text-text-primary">Producto</p>
              <Link href="/precios" className="block text-text-secondary hover:text-brand">
                Precios
              </Link>
              <Link href="/registro" className="block text-text-secondary hover:text-brand">
                Crear cuenta
              </Link>
              <Link href="/login" className="block text-text-secondary hover:text-brand">
                Iniciar sesión
              </Link>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-text-primary">Legal</p>
              <Link href="/legal/terminos" className="block text-text-secondary hover:text-brand">
                Términos y condiciones
              </Link>
              <Link href="/legal/privacidad" className="block text-text-secondary hover:text-brand">
                Aviso de privacidad
              </Link>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-text-primary">Contacto</p>
              <a href="mailto:hola@acierta.mx" className="block text-text-secondary hover:text-brand">
                hola@acierta.mx
              </a>
            </div>
          </div>
        </div>

        <p className="mt-8 border-t border-border-subtle pt-6 text-xs text-text-muted">
          © {year} Acierta. Acierta no está afiliado ni avalado por la UNAM, el IPN, la UAM ni el
          CENEVAL — es una plataforma independiente de preparación para sus exámenes de admisión.
        </p>
      </div>
    </footer>
  );
}
