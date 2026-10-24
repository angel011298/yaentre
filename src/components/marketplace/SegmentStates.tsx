import Link from 'next/link';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * G103 — estados de segmento compartidos por las secciones del marketplace
 * (`loading.tsx`, `not-found.tsx`). Los esqueletos reservan el alto del
 * contenido real para no provocar saltos (CLS).
 */
export function SegmentLoading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

export function SegmentNotFound({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <div className="mx-auto max-w-md space-y-3 py-12 text-center">
      <h1 className="font-display text-2xl font-bold text-text-primary">No encontramos esta página</h1>
      <p className="text-sm text-text-secondary">Puede que el enlace sea viejo o que esta sección todavía no esté disponible.</p>
      <Link href={backHref} className="inline-flex min-h-touch items-center font-semibold text-brand-fg hover:underline">
        {backLabel}
      </Link>
    </div>
  );
}
