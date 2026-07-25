import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

/** Esqueleto de la pantalla de perfil (F18) — evita una pantalla en blanco
 *  mientras se resuelven perfil, plan, insignias y preferencias reales. */
export default function PerfilLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Skeleton className="h-7 w-40" />

      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-full" />
      </Card>

      {Array.from({ length: 4 }, (_, i) => (
        <Card key={i} className="space-y-2 p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full" />
        </Card>
      ))}
    </div>
  );
}
