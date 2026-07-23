'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { startSession } from '@/app/actions/sessions';
import { Button } from '@/components/ui/Button';

/**
 * CTA primario "Hacer un simulacro completo" (F11 Task 8). Reusa el
 * `startSession` Server Action real (F2/F9 — ya gatea "1 gratis" para
 * usuarios FREE); si el muro suave lo bloquea, redirige al `/paywall` real
 * de F9 en vez de mostrar un error suelto. El simulador en sí (F12) todavía
 * no existe, así que al crear la sesión con éxito se confirma honestamente
 * que quedó guardada — sin fingir que hay una pantalla lista para tomarlo.
 */
export function StartSimulationButton({ examId }: { examId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setStatus('loading');
    setError(null);
    const res = await startSession({ examId, mode: 'FULL_SIMULATION' });

    if (res.ok) {
      setStatus('done');
      return;
    }
    if (res.code === 'PAYWALL') {
      router.push(`/paywall?trigger=${res.trigger ?? 'FULL_SIMULATION_LIMIT'}&return=%2Fapp`);
      return;
    }
    setStatus('error');
    setError(res.message);
  }

  if (status === 'done') {
    return (
      <div
        id="simulacro-cta"
        className="rounded-lg border border-success/40 bg-success/10 p-4 text-center"
      >
        <p className="font-semibold text-success">✅ Tu simulacro completo está listo</p>
        <p className="mt-1 text-sm text-text-secondary">
          El simulador llega muy pronto — tu sesión ya quedó guardada y te va a estar esperando.
        </p>
      </div>
    );
  }

  return (
    <div id="simulacro-cta" className="space-y-1">
      <Button
        variant="primary"
        className="w-full py-3 text-base"
        onClick={start}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Creando tu simulacro…' : '▶ Hacer un simulacro completo'}
      </Button>
      {status === 'error' && error && (
        <p className="text-center text-sm text-danger">{error}</p>
      )}
    </div>
  );
}
