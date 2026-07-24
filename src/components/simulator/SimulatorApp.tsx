'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import screenfull from 'screenfull';
import { startSimulationAction } from '@/app/actions/simulator';
import type { SimulatorPayload } from '@/lib/db/simulator';
import { SimulatorPreflight } from './SimulatorPreflight';
import { SimulatorRunner, type PreflightSignals } from './SimulatorRunner';

export type SimulatorInitial =
  | { kind: 'active'; payload: SimulatorPayload }
  | {
      kind: 'entry';
      isFreeFirstTime: boolean;
      examName: string;
      totalQuestions: number;
      durationMins: number;
    };

/**
 * Máquina de estados del simulador en el cliente (F12). El servidor decide el
 * estado INICIAL (reanudar una sesión activa vs. entrada + pre-flight); este
 * componente maneja la transición pre-flight → sesión activa sin recargar,
 * activando pantalla completa dentro del gesto del clic (requisito de los
 * navegadores). Los usuarios ya bloqueados por el muro suave nunca llegan aquí:
 * la página los redirige a /paywall antes de renderizar.
 */
export function SimulatorApp({ initial }: { initial: SimulatorInitial }) {
  const router = useRouter();
  const [payload, setPayload] = useState<SimulatorPayload | null>(
    initial.kind === 'active' ? initial.payload : null
  );
  const [signals, setSignals] = useState<PreflightSignals | undefined>(undefined);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  async function handleStart(cameraGranted: boolean | null) {
    setStarting(true);
    setStartError(null);

    // Pantalla completa DENTRO del gesto del clic (los navegadores lo exigen),
    // pero SIN await: en Safari/iOS o en contextos embebidos el request puede
    // rechazarse o incluso quedarse colgado, y jamás debe bloquear el arranque
    // del examen (tarea 3 — degradación graciosa). La petición se dispara y se
    // sigue de inmediato; el estado real de pantalla completa lo refleja el
    // runner con useSyncExternalStore.
    if (screenfull.isEnabled) {
      screenfull.request(undefined, { navigationUI: 'hide' }).catch(() => {});
    }

    const res = await startSimulationAction();
    if (res.ok) {
      const fullscreenActive = screenfull.isEnabled ? screenfull.isFullscreen : false;
      setPayload(res.data);
      setSignals({ cameraGranted, fullscreenActive });
      return;
    }

    setStarting(false);
    if (res.code === 'PAYWALL') {
      router.push(
        `/paywall?trigger=${res.trigger ?? 'FULL_SIMULATION_LIMIT'}&return=%2Fsimulador`
      );
      return;
    }
    setStartError(res.message);
    if (screenfull.isEnabled && screenfull.isFullscreen) {
      await screenfull.exit().catch(() => {});
    }
  }

  if (payload) {
    return <SimulatorRunner payload={payload} initialSignals={signals} />;
  }

  const entry = initial.kind === 'entry' ? initial : null;
  return (
    <SimulatorPreflight
      isFreeFirstTime={entry?.isFreeFirstTime ?? false}
      examName={entry?.examName ?? ''}
      totalQuestions={entry?.totalQuestions ?? 0}
      durationMins={entry?.durationMins ?? 0}
      starting={starting}
      startError={startError}
      onStart={handleStart}
    />
  );
}
