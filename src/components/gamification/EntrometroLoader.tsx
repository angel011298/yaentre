'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * `next/dynamic` con `ssr:false` solo se permite dentro de un Client
 * Component (regla de Next.js App Router) — este wrapper existe únicamente
 * para eso, así `DiagnosticResults` (Server Component) puede seguir siendo
 * server-side y solo este widget se monta 100% en cliente. Ver comentario en
 * `Entrometro.tsx` sobre por qué `@number-flow/react` lo necesita.
 *
 * `loading` (F20 tarea 4): sin esto, `ssr:false` deja este espacio en 0px
 * hasta que el chunk del cliente carga+monta — como el resto del dashboard
 * SÍ se sirve en el HTML inicial, todo lo que va DEBAJO (recomendación de
 * Tino, "Tu semana", ...) brinca hacia abajo en cuanto el anillo por fin
 * aparece. Este esqueleto reserva el mismo alto que `Entrometro` real.
 */
export const EntrometroLoader = dynamic(
  () => import('./Entrometro').then((m) => m.Entrometro),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-40 w-40 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>
    ),
  }
);
