'use client';

import { motion, MotionConfig } from 'framer-motion';
import { useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';

/**
 * Celebración de partículas reusable (F13 tarea 2; UIUX §9 catálogo: "Perfect
 * round | Score ≥ 90% | 1200ms | PerfectRoundReveal"). Spring physics, no
 * linear (regla de movimiento del proyecto) — un estallido de partículas que
 * rebotan hacia afuera desde el centro, más un halo pulsante detrás.
 *
 * F15 tarea 1: relocado de `components/simulator/` a `components/gamification/`
 * y formalizado como pieza compartida — `CelebrationDisplay` lo reusa para las
 * TRES celebraciones grandes (ronda perfecta, materia dominada, racha), no
 * solo el simulador.
 *
 * `MotionConfig reducedMotion="user"` (mismo patrón que `StepTransition.tsx`)
 * hace que Framer Motion salte directo al estado final sin animar cuando el
 * sistema tiene activado "movimiento reducido" (F13 tarea 12) — sin lógica
 * condicional propia, es la forma recomendada por Framer Motion.
 */
const PARTICLE_COUNT = 10;

export function PerfectRoundReveal() {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
        const distance = 90 + (i % 3) * 20;
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          // G101: sin emojis — partículas de la paleta de gamificación.
          tone: ['text-brand-soft', 'text-success', 'text-streak'][i % 3],
          icon: i % 2 === 0 ? ('star' as const) : ('sparkles' as const),
        };
      }),
    []
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
        <motion.div
          className="absolute h-48 w-48 rounded-full bg-success-glow/30"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: [0.5, 1.4, 1.1], opacity: [0, 0.6, 0] }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className={`absolute ${p.tone}`}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
            animate={{ x: p.x, y: p.y, opacity: [0, 1, 1, 0], scale: 1 }}
            transition={{ duration: 1.2, type: 'spring', bounce: 0.5 }}
          >
            <Icon name={p.icon} className="h-5 w-5" />
          </motion.span>
        ))}
      </div>
    </MotionConfig>
  );
}
