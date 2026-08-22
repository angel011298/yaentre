'use client';

import NumberFlow from '@number-flow/react';
import type { CSSProperties } from 'react';
import type { EntrometroDisplay } from '@/lib/adaptive/entrometro';

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
  predictedScore: number;
  totalQuestions: number;
  target: EntrometroDisplay;
  gap: number | null;
  /** Cambio vs. una línea base anterior (F11: hace una semana; F13: antes de
   *  esta sesión). `null`/omitido = sin línea base todavía (alumno nuevo) —
   *  no se muestra ninguna flecha en vez de inventar un "+0". */
  weekDelta?: number | null;
  /** Texto tras el número del delta. Default conserva el copy de F11. */
  deltaLabel?: string;
}

/**
 * Anillo de progreso circular con la predicción de aciertos (UIUX Spec §7.4,
 * §8.1). El número central es la predicción del motor adaptativo (F6), NUNCA
 * la meta de la carrera pelona — la meta siempre se presenta calificada
 * (`formatEntrometroTarget`) debajo del anillo.
 *
 * La animación es pura CSS (`@keyframes ring-fill` en globals.css): el
 * atributo `stroke-dashoffset` real SIEMPRE queda en el valor final correcto
 * (sin estado de React de por medio, sin condición de carrera de montaje) y
 * la animación solo re-interpola visualmente desde circunferencia completa
 * hasta ese valor al aparecer en el DOM. `prefers-reduced-motion` ya lo cubre
 * la regla global `* { animation-duration: 0.01ms !important }`.
 */
export function Entrometro({
  predictedScore,
  totalQuestions,
  target,
  gap,
  weekDelta,
  deltaLabel = 'esta semana',
}: Props) {
  const fraction = totalQuestions > 0 ? Math.min(1, predictedScore / totalQuestions) : 0;
  const offset = CIRCUMFERENCE * (1 - fraction);
  const ringStyle = { '--ring-start': CIRCUMFERENCE } as CSSProperties;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-40 w-40">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="var(--border-subtle)" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke="var(--brand-primary)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className="animate-ring-fill"
            style={ringStyle}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-bold text-text-primary">
            <NumberFlow value={predictedScore} />
          </span>
          <span className="text-xs text-text-muted">de {totalQuestions}</span>
        </div>
      </div>

      {weekDelta != null && weekDelta !== 0 && (
        <p
          className={`text-sm font-semibold ${weekDelta > 0 ? 'text-success' : 'text-danger'}`}
        >
          {weekDelta > 0 ? '↑' : '↓'} {weekDelta > 0 ? '+' : ''}
          {weekDelta} {deltaLabel}
        </p>
      )}

      {target.hasTarget ? (
        <div className="text-center">
          <p className="text-sm text-text-secondary">
            {target.qualifier} · {target.label}
          </p>
          {gap !== null && (
            <p className={`text-sm font-semibold ${gap > 0 ? 'text-warning' : 'text-success'}`}>
              {gap > 0 ? `Te faltan ~${gap} aciertos` : 'Vas por buen camino'}
            </p>
          )}
        </div>
      ) : (
        <p className="max-w-xs text-center text-sm text-text-muted">{target.disclaimer}</p>
      )}
    </div>
  );
}

/**
 * Estado bloqueado del Entrómetro (F11 Task 11): un alumno FREE que aún no
 * hizo su primer simulacro completo no tiene predicción real que mostrar —
 * en vez de un número inventado o "de $0", se explica cómo desbloquearlo.
 * El enlace apunta al CTA primario del propio dashboard (`#simulacro-cta`,
 * ya en la misma página) en vez de a un `/simulador` que todavía no existe
 * (F12) — evita un link muerto sin inventar una ruta que no existe.
 */
export function EntrometroLocked() {
  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <div className="flex h-40 w-40 items-center justify-center rounded-full border-8 border-dashed border-border-subtle">
        <span className="text-5xl" aria-hidden>
          🔒
        </span>
      </div>
      <div className="max-w-xs">
        <p className="font-display font-semibold text-text-primary">Tu Entrómetro te espera</p>
        <p className="mt-1 text-sm text-text-secondary">
          Termina tu primer simulacro completo (gratis) para desbloquear tu predicción real de
          aciertos.
        </p>
        <a
          href="#simulacro-cta"
          className="mt-3 inline-block text-sm font-semibold text-brand-soft hover:underline"
        >
          Ir a mi simulacro gratis ↓
        </a>
      </div>
    </div>
  );
}
