import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Esqueleto del dashboard (F18, alturas ajustadas F20 tarea 4). Next.js lo
 * muestra automáticamente mientras el Server Component resuelve sus datos
 * reales — las alturas de cada bloque se midieron contra el dashboard real
 * (ver DashboardPage) para que el reemplazo esqueleto→contenido mueva lo
 * menos posible el resto de la página (CLS): antes este esqueleto tenía
 * bloques de menos y alturas genéricas, así que el layout entero brincaba
 * al terminar de cargar.
 */
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
        <Skeleton className="mx-auto h-4 w-56" />
      </Card>

      <Skeleton className="h-[123px] w-full rounded-lg" />

      <div>
        <Skeleton className="mb-3 h-5 w-24" />
        <Card className="p-4">
          <Skeleton className="h-[222px] w-full" />
        </Card>
      </div>

      <div>
        <Skeleton className="mb-3 h-5 w-32" />
        <div className="flex gap-3 overflow-hidden">
          <Skeleton className="h-[226px] min-w-[160px] flex-1" />
          <Skeleton className="h-[226px] min-w-[160px] flex-1" />
          <Skeleton className="h-[226px] min-w-[160px] flex-1" />
        </div>
      </div>

      <div>
        <Skeleton className="mb-3 h-5 w-40" />
        <Skeleton className="h-[228px] w-full rounded-lg" />
      </div>

      <Skeleton className="h-11 w-full rounded-full" />
    </div>
  );
}
