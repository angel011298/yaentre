'use client';

import { useEffect, useState } from 'react';
import { generateLinkCodeAction } from '@/app/actions/parent';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

function formatRemaining(ms: number): string {
  const totalSecs = Math.max(0, Math.ceil(ms / 1000));
  const mm = Math.floor(totalSecs / 60);
  const ss = totalSecs % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

/**
 * "Vincular a mi tutor" (F16 tarea 1): el alumno genera un código de 6
 * dígitos, válido 10 minutos y de un solo uso, para compartir con su tutor.
 * Vive en el dashboard existente en vez de una pantalla de Perfil dedicada
 * (todavía no existe — F17, mismo criterio que las insignias de F15).
 */
export function ParentLinkCard() {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // setState solo dentro del callback del intervalo (patrón permitido, mismo
  // que `SimTimer.tsx` de F12) — el valor inicial se fija directamente en el
  // manejador de evento que recibe `expiresAt`, no de forma síncrona aquí.
  useEffect(() => {
    if (expiresAt === null) return;
    const id = setInterval(() => {
      setRemainingMs(Math.max(0, expiresAt - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  async function handleGenerate() {
    setPending(true);
    setError(null);
    const result = await generateLinkCodeAction();
    setPending(false);
    if (result.ok) {
      const expiresAtMs = result.data.expiresAt.getTime();
      setCode(result.data.code);
      setExpiresAt(expiresAtMs);
      setRemainingMs(Math.max(0, expiresAtMs - Date.now()));
    } else {
      setError(result.message);
    }
  }

  const expired = expiresAt !== null && remainingMs <= 0;

  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-text-primary">Vincula a tu tutor</p>
      <p className="mt-1 text-sm text-text-secondary">
        Genera un código para que tu papá, mamá o tutor vea tu progreso — nunca tus reactivos ni
        respuestas.
      </p>

      {code && !expired ? (
        <div className="mt-4 text-center">
          <p className="font-mono text-3xl font-bold tracking-[0.3em] text-brand">{code}</p>
          <p className="mt-1 text-xs text-text-muted">Vence en {formatRemaining(remainingMs)}</p>
        </div>
      ) : (
        <Button
          variant="secondary"
          className="mt-4 w-full"
          onClick={handleGenerate}
          disabled={pending}
        >
          {pending ? 'Generando…' : expired ? 'Generar otro código' : 'Generar código'}
        </Button>
      )}

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Card>
  );
}
