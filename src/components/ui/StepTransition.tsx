'use client';

import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Transición suave entre pasos de un asistente (onboarding, checkout, etc.).
 * `MotionConfig reducedMotion="user"` respeta `prefers-reduced-motion` a
 * nivel de Framer Motion — la regla CSS global en globals.css cubre
 * transiciones basadas en CSS, pero esta anima con JS y necesita su propio
 * opt-out (ver CLAUDE.md → Accesibilidad).
 */
export function StepTransition({ stepKey, children }: { stepKey: string | number; children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={stepKey}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
