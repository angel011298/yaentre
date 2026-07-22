'use client';

import dynamic from 'next/dynamic';

/**
 * `next/dynamic` con `ssr:false` solo se permite dentro de un Client
 * Component (regla de Next.js App Router) — este wrapper existe únicamente
 * para eso, así `DiagnosticResults` (Server Component) puede seguir siendo
 * server-side y solo este widget se monta 100% en cliente. Ver comentario en
 * `Aciertometro.tsx` sobre por qué `@number-flow/react` lo necesita.
 */
export const AciertometroLoader = dynamic(
  () => import('./Aciertometro').then((m) => m.Aciertometro),
  { ssr: false }
);
