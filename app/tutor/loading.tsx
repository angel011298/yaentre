import { ParentShell } from '@/components/tutor/ParentShell';
import { Skeleton } from '@/components/ui/Skeleton';

/** Mismo `ParentShell` (tema claro fijo + encabezado) que la página real —
 *  sin esto, el esqueleto parpadearía oscuro antes del panel claro real. */
export default function TutorLoading() {
  return (
    <ParentShell>
      <div className="space-y-4">
        <Skeleton className="h-6 w-56" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </ParentShell>
  );
}
