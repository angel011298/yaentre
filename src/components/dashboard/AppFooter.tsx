import Link from 'next/link';

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    // G64: `.yaentre-bottomnav-clearance` deja el pie de página por encima de
    // la BottomNav fija en móvil (antes se recortaba al hacer scroll hasta el
    // fondo) y absorbe el indicador de inicio del iPhone. En desktop la nav no
    // existe y vuelve a un padding normal.
    <footer className="yaentre-bottomnav-clearance border-t border-border-subtle bg-surface pt-6 text-xs text-text-muted">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} YaEntre. YaEntre no está afiliado ni avalado por la UNAM, el IPN, la UAM ni
            el CENEVAL.
          </p>
          <div className="flex gap-6">
            <Link href="/legal/terminos" className="hover:text-text-secondary">
              Términos
            </Link>
            <Link href="/legal/privacidad" className="hover:text-text-secondary">
              Privacidad
            </Link>
            <a href="mailto:hola@yaentre.com" className="hover:text-text-secondary">
              Contacto
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
