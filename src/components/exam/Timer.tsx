'use client';

import { useEffect, useRef, useState } from 'react';

const WARNING_THRESHOLD_SECS = 5 * 60;
const DANGER_THRESHOLD_SECS = 60;

function formatTime(totalSecs: number): string {
  const secs = Math.max(0, totalSecs);
  const mins = Math.floor(secs / 60);
  const rest = secs % 60;
  return `${mins}:${String(rest).padStart(2, '0')}`;
}

/**
 * Cuenta regresiva del diagnóstico (45 min). El color es un canal adicional,
 * nunca el único (el número siempre está presente) — ver CLAUDE.md
 * Accesibilidad. `deadline` es absoluto (no relativo) para que sobreviva
 * cierres/reaperturas de pestaña sin desincronizarse.
 */
export function Timer({ deadline, onExpire }: { deadline: Date; onExpire: () => void }) {
  const [remainingSecs, setRemainingSecs] = useState(() =>
    Math.round((deadline.getTime() - Date.now()) / 1000)
  );
  const expiredRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = Math.round((deadline.getTime() - Date.now()) / 1000);
      setRemainingSecs(next);
      if (next <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  const level =
    remainingSecs <= DANGER_THRESHOLD_SECS
      ? 'danger'
      : remainingSecs <= WARNING_THRESHOLD_SECS
        ? 'warning'
        : 'normal';
  const colorClass =
    level === 'danger' ? 'text-danger' : level === 'warning' ? 'text-warning' : 'text-text-secondary';

  return (
    <span className="flex items-center gap-1.5">
      {/* G63: ícono además del color, y aviso puntual al cruzar cada umbral. */}
      {level !== 'normal' && (
        <span aria-hidden className="text-sm">
          {level === 'danger' ? '⏰' : '⏳'}
        </span>
      )}
      <span
        className={`font-mono text-lg font-semibold tabular-nums ${colorClass}`}
        role="timer"
        aria-live="off"
        aria-label="Tiempo restante del diagnóstico"
      >
        {formatTime(remainingSecs)}
      </span>
      <span role="status" className="sr-only">
        {level === 'danger'
          ? 'Queda menos de 1 minuto.'
          : level === 'warning'
            ? 'Quedan menos de 5 minutos.'
            : ''}
      </span>
    </span>
  );
}
