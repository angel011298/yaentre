'use client';

import dynamic from 'next/dynamic';
import type { Celebration } from '@/lib/gamification/celebrations';

/**
 * Carga diferida de `CelebrationDisplay` (G62 — rendimiento).
 *
 * `CelebrationDisplay` arrastra `framer-motion` (~131KB sin comprimir / ~44KB
 * transferidos). Se usa solo en pantallas de RESULTADO (fin de simulacro / fin
 * de drill), pero como `SimulatorResult`/`DrillSummary` son Server Components
 * que lo importan de forma estática, Turbopack metía el chunk de framer-motion
 * en la carga INICIAL de `/simulador` aunque la entrada (pre-flight) nunca
 * muestra una celebración — 99% de ese JS quedaba sin usar.
 *
 * Este wrapper `'use client'` con `next/dynamic` corta esa dependencia: el
 * chunk de framer-motion solo se descarga cuando de verdad se monta una
 * celebración, después de terminar la sesión. `ssr: false` porque es 100%
 * animación decorativa (respeta `prefers-reduced-motion`) y no aporta nada al
 * HTML inicial.
 */
export const CelebrationDisplay = dynamic(
  () => import('./CelebrationDisplay').then((m) => m.CelebrationDisplay),
  { ssr: false }
);

export type { Celebration };
