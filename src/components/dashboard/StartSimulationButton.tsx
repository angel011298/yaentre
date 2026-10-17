import Link from 'next/link';
import { buttonClassName } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

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
        className={buttonClassName('primary', 'w-full gap-2 py-3 text-[1rem]')}
      >
        <Icon name="target" className="h-5 w-5" />
        Hacer un simulacro completo
      </Link>
    </div>
  );
}
