'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { resolveReportsAction } from '@/app/actions/admin-questions';
import { Button } from '@/components/ui/Button';

export function ResolveReportsButton({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleResolve() {
    setError(null);
    startTransition(async () => {
      const result = await resolveReportsAction({ questionId });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDone(true);
      router.refresh();
    });
  }

  if (done) {
    return <span className="text-sm text-text-muted">✅ Resueltos</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="secondary" onClick={handleResolve} disabled={isPending}>
        {isPending ? 'Marcando…' : 'Marcar resueltos'}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
