import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

/** Esqueleto de la pantalla de progreso (F18) — evita una pantalla en
 *  blanco mientras se resuelven los cinco loaders reales en paralelo. */
export default function ProgresoLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-40" />

      <Card className="space-y-3 p-5">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-40 w-full" />
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="space-y-2 p-4 text-center">
            <Skeleton className="mx-auto h-7 w-14" />
            <Skeleton className="mx-auto h-3 w-20" />
          </Card>
        ))}
      </div>

      <Card className="space-y-3 p-5">
        <Skeleton className="h-4 w-40" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </Card>

      <Card className="space-y-3 p-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-12 w-full" />
      </Card>
    </div>
  );
}
