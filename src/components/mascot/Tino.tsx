import type { ChiloPose } from '@/lib/brand/chilo-geometry';
import { CHILO_RATIO } from '@/lib/brand/chilo-geometry';
import { Chilo, type ChiloProps } from './Chilo';

/**
 * @deprecated Marca v1.0 (G102): la mascota es **Chilo** (`./Chilo.tsx`).
 *
 * Tino (el tecolote de F11-G101) queda solo como envoltorio de compatibilidad:
 * traduce `TinoState` a una pose de Chilo para que ningún uso viejo se rompa.
 * Nada del código actual lo importa; código nuevo usa `<Chilo pose=… />`.
 * Equivalencias del manual (docs/marca/README.md): attentive → libro,
 * sleepy → dormido, celebrating/streak/graduated → celebrar, encouraging →
 * lapiz.
 */
export type TinoState = 'sleepy' | 'attentive' | 'celebrating' | 'streak' | 'encouraging' | 'graduated';

export const TINO_TO_CHILO_POSE: Record<TinoState, ChiloPose> = {
  attentive: 'libro',
  sleepy: 'dormido',
  celebrating: 'celebrar',
  streak: 'celebrar',
  graduated: 'celebrar',
  encouraging: 'lapiz',
};

interface TinoProps extends Omit<ChiloProps, 'pose' | 'size'> {
  state?: TinoState;
  /** Alto en px, como el Tino de antes (su caja era cuadrada). */
  size?: number;
}

/** @deprecated Usar `Chilo`. */
export function Tino({ state = 'attentive', size = 120, ...props }: TinoProps) {
  // Tino ocupaba `size`×`size`; Chilo es más alto que ancho, así que se le da
  // el ancho que conserva ese mismo alto y el layout de quien lo use no salta.
  return <Chilo pose={TINO_TO_CHILO_POSE[state]} size={Math.round(size * CHILO_RATIO)} {...props} />;
}
