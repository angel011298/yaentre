import type { ReactNode } from 'react';
import { Tino, type TinoState } from '@/components/mascot/Tino';

interface Props {
  tino?: TinoState;
  title: string;
  description: string;
  action: ReactNode;
}

/**
 * Estado vacío estándar del dashboard (F11 Task 10): SIEMPRE Tino + copy
 * motivador + una acción concreta — nunca una tarjeta en blanco (UIUX Spec
 * §6: "Estados vacíos: siempre con Tino + microcopy motivador").
 */
export function EmptyState({ tino = 'encouraging', title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border-subtle bg-surface p-6 text-center">
      <Tino state={tino} size={64} />
      <div>
        <p className="font-display font-semibold text-text-primary">{title}</p>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>
      {action}
    </div>
  );
}
