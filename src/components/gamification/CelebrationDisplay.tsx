'use client';

import { motion, MotionConfig } from 'framer-motion';
import { Tino } from '@/components/mascot/Tino';
import { materiaDominada, perfectRound, streakMilestone } from '@/lib/tino/copy';
import type { Celebration } from '@/lib/gamification/celebrations';
import { PerfectRoundReveal } from './PerfectRoundReveal';
import { StreakFlame } from './StreakFlame';

/**
 * Renderiza LA celebración grande (como máximo una por sesión — F15 tareas 1-3)
 * que `selectCelebration` decidió mostrar. Las tres variantes reusan el mismo
 * estallido de partículas (`PerfectRoundReveal`) en vez de reinventar el efecto
 * por tipo — solo cambian el marco, el texto de Tino y el tiempo de entrada
 * (UIUX §9: materia dominada 1400ms card-flip, resto 1200ms/700ms).
 *
 * `MotionConfig reducedMotion="user"` respeta `prefers-reduced-motion` (tarea 7).
 */
export function CelebrationDisplay({ celebration }: { celebration: Celebration }) {
  if (celebration.kind === 'materiaDominada') {
    const copy = materiaDominada(celebration.subjectName);
    return (
      <MotionConfig reducedMotion="user">
        <motion.div
          initial={{ opacity: 0, rotateY: -90 }}
          animate={{ opacity: 1, rotateY: 0 }}
          transition={{ duration: 1.4, type: 'spring', bounce: 0.35 }}
          style={{ transformPerspective: 800 }}
          className="relative overflow-hidden rounded-2xl border border-brand bg-brand-tint p-6 text-center"
        >
          <PerfectRoundReveal />
          <Tino state={copy.state} size={72} />
          <p className="mt-3 font-display text-lg font-bold text-text-primary">
            ¡Materia dominada! 🎓
          </p>
          <p className="mt-1 text-sm text-text-secondary">{copy.message}</p>
        </motion.div>
      </MotionConfig>
    );
  }

  if (celebration.kind === 'perfectRound') {
    const copy = perfectRound();
    return (
      <MotionConfig reducedMotion="user">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, type: 'spring', bounce: 0.4 }}
          className="relative overflow-hidden rounded-2xl border border-success/40 bg-success/10 p-6 text-center"
        >
          <PerfectRoundReveal />
          <Tino state={copy.state} size={72} />
          <p className="mt-3 font-display text-lg font-bold text-text-primary">{copy.message}</p>
        </motion.div>
      </MotionConfig>
    );
  }

  const copy = streakMilestone(celebration.days);
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, type: 'spring', bounce: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-streak/40 bg-streak/10 p-6 text-center"
      >
        <PerfectRoundReveal />
        <Tino state={copy.state} size={72} />
        <p className="mt-3 font-display text-lg font-bold text-text-primary">{copy.message}</p>
        <div className="mt-2 flex justify-center">
          <StreakFlame days={celebration.days} />
        </div>
      </motion.div>
    </MotionConfig>
  );
}
