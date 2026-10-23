import type { ReactNode } from 'react';
import { Chilo } from '@/components/mascot/Chilo';
import type { ChiloPose } from '@/lib/brand/chilo-geometry';

interface Props {
  pose?: ChiloPose;
  title: string;
  description: string;
  action: ReactNode;
}

/**
 * Estado vacío estándar del dashboard (F11 Task 10): SIEMPRE la mascota + copy
 * motivador + una acción concreta — nunca una tarjeta en blanco (UIUX Spec
 * §6: "Estados vacíos: siempre con la mascota + microcopy motivador"). Marca
 * v1: Chilo, quieto (varios estados vacíos pueden coincidir en el tablero).
 */
export function EmptyState({ pose = 'libro', title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border-subtle bg-surface p-6 text-center">
      <Chilo pose={pose} size={52} animacion="ninguna" />
      <div>
        <p className="font-display font-semibold text-text-primary">{title}</p>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>
      {action}
    </div>
  );
}
