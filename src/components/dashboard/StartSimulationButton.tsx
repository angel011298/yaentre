import Link from 'next/link';
import { buttonClassName } from '@/components/ui/Button';

/**
 * CTA primario del dashboard "Hacer un simulacro completo" (F11 → F12). Desde
 * F12 navega a `/simulador`, que resuelve por sí mismo el muro suave (F9), el
 * pre-flight y el arranque de la sesión. Conserva el ancla `#simulacro-cta`
 * porque el Entrómetro bloqueado enlaza a ella.
 */
export function StartSimulationButton() {
  return (
    <div id="simulacro-cta">
      <Link
        href="/simulador"
        className={buttonClassName('primary', 'w-full py-3 text-base')}
      >
        ▶ Hacer un simulacro
      </Link>
    </div>
  );
}
