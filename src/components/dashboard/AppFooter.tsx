import Link from 'next/link';

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border-subtle bg-surface py-6 text-xs text-text-muted">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} Acierta. Acierta no está afiliado ni avalado por la UNAM, el IPN, la UAM ni
            el CENEVAL.
          </p>
          <div className="flex gap-6">
            <Link href="/legal/terminos" className="hover:text-text-secondary">
              Términos
            </Link>
            <Link href="/legal/privacidad" className="hover:text-text-secondary">
              Privacidad
            </Link>
            <a href="mailto:hola@acierta.mx" className="hover:text-text-secondary">
              Contacto
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
