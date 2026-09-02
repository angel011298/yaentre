'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { unlinkParentStudentAction } from '@/app/actions/parent';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { LinkedParent } from '@/lib/db/parent';

/**
 * G65 — Tutores vinculados, con opción de revocar.
 *
 * El aviso de privacidad (§8) ya prometía que un tutor desvinculado pierde el
 * acceso «inmediatamente», pero no había forma de desvincular a nadie: un
 * código de 6 dígitos compartido con la persona equivocada le dejaba el
 * tablero del alumno para siempre. Tratándose de datos de un menor, ésa es la
 * pieza que la ley llama derecho de cancelación y oposición.
 *
 * Se pide confirmación en dos pasos (no un diálogo del navegador) porque el
 * caso normal es que el vínculo SÍ deba seguir: quien llega aquí por error no
 * debe poder romperlo con un clic distraído.
 */
export function LinkedParentsCard({
  parents,
  parentNames,
}: {
  parents: LinkedParent[];
  parentNames: Record<string, string>;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (parents.length === 0) return null;

  async function handleUnlink(parentProfileId: string) {
    setPending(parentProfileId);
    setError(null);
    const result = await unlinkParentStudentAction({ counterpartProfileId: parentProfileId });
    setPending(null);
    setConfirming(null);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.message);
    }
  }

  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-text-primary">Tutores con acceso a tu progreso</p>
      <p className="mt-1 text-sm text-text-secondary">
        Ven tu avance general (aciertos, racha, temas débiles). Nunca ven tus reactivos ni tus
        respuestas. Puedes quitarles el acceso cuando quieras.
      </p>

      <ul className="mt-4 space-y-3">
        {parents.map((p) => (
          <li
            key={p.parentProfileId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-elevated p-3"
          >
            <div>
              <p className="text-sm font-medium text-text-primary">
                {parentNames[p.parentProfileId] ?? 'Tu tutor'}
              </p>
              <p className="text-xs text-text-muted">
                Vinculado el {p.linkedAt.toLocaleDateString('es-MX')}
              </p>
            </div>

            {confirming === p.parentProfileId ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="danger"
                  onClick={() => handleUnlink(p.parentProfileId)}
                  disabled={pending === p.parentProfileId}
                >
                  {pending === p.parentProfileId ? 'Quitando…' : 'Sí, quitar acceso'}
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(null)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button variant="secondary" onClick={() => setConfirming(p.parentProfileId)}>
                Quitar acceso
              </Button>
            )}
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </Card>
  );
}
