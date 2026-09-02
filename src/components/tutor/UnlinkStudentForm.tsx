'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { unlinkParentStudentAction } from '@/app/actions/parent';
import { Button } from '@/components/ui/Button';

/**
 * G65 — El tutor también puede romper el vínculo.
 *
 * Los dos lados tienen que poder hacerlo: el alumno lo revoca desde su perfil
 * (`LinkedParentsCard`) y el tutor desde aquí. No es simetría por elegancia —
 * un tutor que se vinculó por error a la cuenta equivocada estaba obligado a
 * conservar el acceso a los datos de un menor que no le corresponde, sin más
 * salida que pedir soporte. Ahora lo suelta él mismo.
 *
 * Isla de cliente mínima dentro de un panel que por lo demás es un Server
 * Component puro (F16 tarea 7: el WebView de Facebook no debe romperse).
 */
export function UnlinkStudentForm({
  studentProfileId,
  studentName,
}: {
  studentProfileId: string;
  studentName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnlink() {
    setPending(true);
    setError(null);
    const result = await unlinkParentStudentAction({ counterpartProfileId: studentProfileId });
    setPending(false);
    if (result.ok) {
      setConfirming(false);
      router.refresh();
    } else {
      setError(result.message);
    }
  }

  if (!confirming) {
    return (
      <div className="text-right">
        <Button variant="ghost" onClick={() => setConfirming(true)}>
          Dejar de seguir a {studentName}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4">
      <p className="text-sm text-text-secondary">
        Perderás el acceso al progreso de {studentName}. Para volver a verlo necesitarás un código
        nuevo generado por {studentName}.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="danger" onClick={handleUnlink} disabled={pending}>
          {pending ? 'Desvinculando…' : 'Sí, desvincular'}
        </Button>
        <Button variant="ghost" onClick={() => setConfirming(false)}>
          Cancelar
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
