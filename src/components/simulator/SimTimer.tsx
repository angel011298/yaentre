'use client';

import { useEffect, useRef, useState } from 'react';
import { formatClock, timerTone } from '@/lib/simulator/time';

const TONE_CLASS = {
  normal: 'text-text-secondary',
  warning: 'text-warning',
  urgent: 'text-danger',
} as const;

/**
 * Temporizador del simulador (F12 tarea 4). Anclado a un `deadline` ABSOLUTO
 * calculado UNA vez al montar a partir del restante que dio el servidor
 * (`Date.now() + remainingSecs`). Consecuencias clave:
 *   - NO se pausa al cambiar de pestaña: aunque el `setInterval` se ralentice
 *     en segundo plano, al volver recalcula contra el reloj real, así que el
 *     restante refleja el tiempo transcurrido de verdad.
 *   - Al retomar, el servidor ya restó el tiempo real, así que arranca correcto.
 * Color como canal adicional (verde → ámbar <30min → rojo <15min), nunca único:
 * el número siempre está.
 */
export function SimTimer({
  remainingSecs,
  onExpire,
}: {
  remainingSecs: number;
  onExpire: () => void;
}) {
  // Deadline absoluto fijado una sola vez al montar (lazy init — Date.now no
  // puede vivir en el cuerpo del render ni en un useRef).
  const [deadline] = useState(() => Date.now() + remainingSecs * 1000);
  const expiredRef = useRef(false);
  const [left, setLeft] = useState(remainingSecs);

  useEffect(() => {
    // setState solo dentro del callback del intervalo (patrón permitido).
    const id = setInterval(() => {
      const next = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setLeft(next);
      if (next <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [deadline, onExpire]);

  const tone = timerTone(left);

  return (
    <span
      className={`font-mono text-xl font-semibold tabular-nums sm:text-2xl ${TONE_CLASS[tone]}`}
      role="timer"
      aria-live="off"
      aria-label="Tiempo restante"
    >
      {formatClock(left)}
    </span>
  );
}
