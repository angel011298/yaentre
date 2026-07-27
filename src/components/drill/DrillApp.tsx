'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { startDrillAction } from '@/app/actions/drill';
import { finishSession } from '@/app/actions/sessions';
import type { FinishSessionResult } from '@/lib/db/sessions';
import type { DrillPayload, PracticeOptions, PracticeScope } from '@/lib/db/drill';
import type { PaywallTrigger } from '@/lib/paywall/gates';
import { PracticeSelector } from './PracticeSelector';

// F20 tarea 3: DrillRunner/DrillSummary arrastran KaTeX y las animaciones de
// celebración (framer-motion) — se cargan en un chunk aparte, solo cuando de
// verdad hace falta una sesión activa o un resumen, no en el selector inicial
// (el primer estado que ve casi todo mundo al entrar a /practicar).
const DrillRunner = dynamic(() => import('./DrillRunner').then((m) => m.DrillRunner));
const DrillSummary = dynamic(() => import('./DrillSummary').then((m) => m.DrillSummary));

export type DrillInitial =
  | { kind: 'active'; payload: DrillPayload }
  | {
      kind: 'selecting';
      options: PracticeOptions;
      remainingToday: number | null;
      /** Deep link (F11 WeakTopicCard → F14): arranca esta práctica sin pasar por el selector. */
      autoStartScope?: PracticeScope;
    };

/**
 * Máquina de estados del drill en el cliente (F14) — mismo patrón que
 * `SimulatorApp.tsx` (F12): el servidor decide el estado inicial (retomar vs.
 * selector), este componente maneja las transiciones selector→sesión→resumen
 * sin recargar la página. RSC + useState (CLAUDE.md: Zustand solo en el
 * simulador).
 */
export function DrillApp({ initial }: { initial: DrillInitial }) {
  const [payload, setPayload] = useState<DrillPayload | null>(
    initial.kind === 'active' ? initial.payload : null
  );
  const [summary, setSummary] = useState<FinishSessionResult | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [paywallTrigger, setPaywallTrigger] = useState<PaywallTrigger | null>(null);

  // Deep link desde "reforzar hoy" (WeakTopicCard, F11): arranca automáticamente
  // una vez al montar si el servidor resolvió un `autoStartScope` válido.
  useEffect(() => {
    if (initial.kind === 'selecting' && initial.autoStartScope) {
      void handleStart(initial.autoStartScope);
    }
    // Solo al montar — no re-disparar en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStart(scope: PracticeScope) {
    setStarting(true);
    setStartError(null);
    setPaywallTrigger(null);

    const res = await startDrillAction(scope);
    setStarting(false);

    if (res.ok) {
      setSummary(null);
      setPayload(res.data);
      return;
    }
    if (res.code === 'PAYWALL') {
      setPaywallTrigger(res.trigger ?? 'DRILL_DAILY_LIMIT');
      return;
    }
    setStartError(res.message);
  }

  async function handlePracticeMore(topicId: string) {
    // Capa 4 ("practica más de esto", F14 tarea 6): cierra honestamente la
    // sesión actual (dispara el mismo recálculo de temas débiles + racha que
    // un cierre normal) y abre de inmediato una nueva filtrada por el tema.
    if (payload) {
      await finishSession({ sessionId: payload.sessionId, reason: 'USER' }).catch(() => {});
    }
    await handleStart({ kind: 'topic', topicId });
  }

  if (payload) {
    return (
      <DrillRunner
        payload={payload}
        onFinished={(result) => {
          setSummary(result);
          setPayload(null);
        }}
        onPracticeMore={handlePracticeMore}
        onExitToSelector={async () => {
          await finishSession({ sessionId: payload.sessionId, reason: 'USER' }).catch(() => {});
          setPayload(null);
        }}
      />
    );
  }

  if (summary) {
    return <DrillSummary result={summary} onPracticeAgain={() => setSummary(null)} />;
  }

  const entry = initial.kind === 'selecting' ? initial : null;
  if (!entry) return null;

  return (
    <PracticeSelector
      options={entry.options}
      remainingToday={entry.remainingToday}
      starting={starting}
      startError={startError}
      paywallTrigger={paywallTrigger}
      onStart={handleStart}
    />
  );
}
