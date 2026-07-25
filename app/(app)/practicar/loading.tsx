import { Skeleton } from '@/components/ui/Skeleton';

export default function PracticarLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-24 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
