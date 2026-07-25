import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

/** Esqueleto del dashboard (F18) — Next.js lo muestra automáticamente
 *  mientras el Server Component resuelve sus datos reales. */
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      <Card className="space-y-4 p-6">
        <Skeleton className="mx-auto h-3 w-24" />
        <Skeleton className="mx-auto h-40 w-40 rounded-full" />
        <Skeleton className="mx-auto h-4 w-40" />
      </Card>

      <div>
        <Skeleton className="mb-3 h-5 w-24" />
        <Skeleton className="h-24 w-full" />
      </div>

      <div>
        <Skeleton className="mb-3 h-5 w-32" />
        <div className="flex gap-3 overflow-hidden">
          <Skeleton className="h-28 min-w-[160px] flex-1" />
          <Skeleton className="h-28 min-w-[160px] flex-1" />
          <Skeleton className="h-28 min-w-[160px] flex-1" />
        </div>
      </div>
    </div>
  );
}
