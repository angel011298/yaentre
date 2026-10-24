'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitCourseAction } from '@/app/actions/courses-teacher';
import { Button } from '@/components/ui/Button';

/** G103 — enviar a revisión. El servidor vuelve a correr TODAS las validaciones. */
export function SubmitCourseButton({ courseId, ready }: { courseId: string; ready: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="primary"
        disabled={!ready || pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          const r = await submitCourseAction({ id: courseId }).catch(() => null);
          setPending(false);
          if (r?.ok) router.refresh();
          else setError(r?.message ?? 'No pudimos enviar el curso.');
        }}
      >
        {pending ? 'Enviando…' : 'Enviar a revisión'}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
