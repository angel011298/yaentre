'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import screenfull from 'screenfull';
import { finishSimulationAction } from '@/app/actions/simulator';
import { Button } from '@/components/ui/Button';
import type { SimulatorPayload } from '@/lib/db/simulator';
import { encodeCelebrationParam } from '@/lib/gamification/celebrations';
import { isSuspiciousKeyCombo } from '@/lib/simulator/integrity';
import { useSimulatorStore } from '@/lib/stores/simulatorStore';
import { SimQuestion } from './SimQuestion';
import { SimTimer } from './SimTimer';
import { useSimulatorSync } from './useSimulatorSync';

/**
 * Sesión activa del simulador (F12). Estética DELIBERADAMENTE seria (UIUX §13):
 * sin Tino, sin gamificación, sin celebraciones — solo la barra con el
 * temporizador, el reactivo y "Siguiente". La regla de negocio "no se puede
 * regresar" está codificada en el store (`advance` nunca decrementa); aquí no
 * existe ningún control de retroceso.
 */
export interface PreflightSignals {
  /** true concedida, false negada, null no solicitada / no soportada. */
  cameraGranted: boolean | null;
  fullscreenActive: boolean;
}

export function SimulatorRunner({
  payload,
  initialSignals,
}: {
  payload: SimulatorPayload;
  initialSignals?: PreflightSignals;
}) {
  const router = useRouter();
  const { flushNow } = useSimulatorSync();

  const hydrate = useSimulatorStore((s) => s.hydrate);
  const sessionId = useSimulatorStore((s) => s.sessionId);
  const questions = useSimulatorStore((s) => s.questions);
  const currentIndex = useSimulatorStore((s) => s.currentIndex);
  const selections = useSimulatorStore((s) => s.selections);
  const online = useSimulatorStore((s) => s.online);

  const [finishing, setFinishing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fsNotice, setFsNotice] = useState(false);
  const [resumeDismissed, setResumeDismissed] = useState(false);
  const resumeDialogRef = useRef<HTMLDialogElement>(null);

  // Estado de pantalla completa reactivo vía useSyncExternalStore (la forma
  // correcta de suscribirse a un sistema externo sin setState-en-efecto).
  const subscribeFullscreen = useCallback((cb: () => void) => {
    if (!screenfull.isEnabled) return () => {};
    screenfull.on('change', cb);
    return () => screenfull.off('change', cb);
  }, []);
  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => (screenfull.isEnabled ? screenfull.isFullscreen : false),
    () => false
  );

  // Date.now() no puede vivir en el cuerpo del render/useRef: se fija en efecto.
  const questionStartedAt = useRef<number>(0);

  // Hidratar el store con la sesión (una vez por sesión). Efecto —no durante el
  // render— para no actualizar el store mientras otro componente renderiza.
  useEffect(() => {
    hydrate(payload);
    // Señales recogidas en el pre-flight (cámara, pantalla completa) tras la
    // hidratación, para que el primer sync las persista. En reanudación no hay.
    if (initialSignals) {
      const store = useSimulatorStore.getState();
      store.setFullscreen(initialSignals.fullscreenActive);
      if (initialSignals.cameraGranted !== null) {
        store.addSuspicion({
          type: initialSignals.cameraGranted ? 'CAMERA_GRANTED' : 'CAMERA_DENIED',
          at: new Date().toISOString(),
        });
      }
      if (!initialSignals.fullscreenActive) {
        store.addSuspicion({ type: 'FULLSCREEN_DENIED', at: new Date().toISOString() });
      }
    }
    // Solo al montar por sesión — no re-aplicar en cada cambio de señales.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrate, payload.sessionId]);

  // G63 (accesibilidad): al avanzar de pregunta, mover el foco a la región
  // del reactivo — sin esto, un usuario de teclado/lector de pantalla se queda
  // en el botón "Siguiente" ya desaparecido y no se le anuncia la pregunta
  // nueva.
  const questionRegionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    questionStartedAt.current = Date.now();
    questionRegionRef.current?.focus();
  }, [currentIndex]);

  const ready = sessionId === payload.sessionId;

  // ── Terminar (usuario o tiempo agotado) ──
  const finish = useCallback(
    async (reason: 'USER' | 'TIMEOUT') => {
      setFinishing(true);
      setError(null);
      // Garantiza que la última respuesta llegó al servidor ANTES de puntuar.
      await flushNow();
      const result = await finishSimulationAction({ sessionId: payload.sessionId, reason });
      if (screenfull.isEnabled && screenfull.isFullscreen) {
        await screenfull.exit().catch(() => {});
      }
      if (result.ok) {
        // F15: la celebración ya se decidió server-side (a lo más una por
        // sesión) — viaja en la URL porque este push es una navegación de
        // página completa, no una actualización de estado local.
        const celebrationParam = result.data.celebration
          ? `&celebration=${encodeCelebrationParam(result.data.celebration)}`
          : '';
        router.push(`/simulador?view=result&session=${payload.sessionId}${celebrationParam}`);
      } else {
        setFinishing(false);
        setError('No pudimos cerrar tu simulacro. Intenta de nuevo.');
        if (result.code === 'NOT_IN_PROGRESS') {
          router.push(`/simulador?view=result&session=${payload.sessionId}`);
        }
      }
    },
    [flushNow, payload.sessionId, router]
  );

  const onExpire = useCallback(() => void finish('TIMEOUT'), [finish]);

  // ── Listeners de integridad (registran, nunca bloquean) ──
  useEffect(() => {
    const store = useSimulatorStore.getState;

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') store().bumpTabBlur();
    };
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      store().bumpRightClick();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (isSuspiciousKeyCombo(e)) {
        e.preventDefault();
        store().bumpKeyboard();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown, { capture: true });
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown, { capture: true });
    };
  }, []);

  // Al SALIR de pantalla completa: aviso sobrio + registro. Se hace dentro del
  // callback del evento (no en el cuerpo del efecto), patrón permitido.
  useEffect(() => {
    if (!screenfull.isEnabled) return;
    const onChange = () => {
      if (!screenfull.isFullscreen) {
        setFsNotice(true);
        useSimulatorStore.getState().addSuspicion({
          type: 'FULLSCREEN_EXIT',
          at: new Date().toISOString(),
        });
      }
    };
    screenfull.on('change', onChange);
    return () => screenfull.off('change', onChange);
  }, []);

  const reenterFullscreen = useCallback(async () => {
    if (screenfull.isEnabled) {
      await screenfull.request(undefined, { navigationUI: 'hide' }).catch(() => {});
      useSimulatorStore.getState().setFullscreen(screenfull.isFullscreen);
    }
    setFsNotice(false);
  }, []);

  // Reanudación: si la sesión ya venía en curso y no estamos en pantalla
  // completa, ofrecemos retomarla en pantalla completa con un gesto del usuario
  // (los navegadores exigen interacción para entrar a fullscreen).
  const showResumeOverlay =
    payload.isResume && !isFullscreen && screenfull.isEnabled && !resumeDismissed;

  // G63 (accesibilidad): el aviso de reanudación es un `<dialog>` nativo —
  // `showModal()` da atrapamiento de foco, foco inicial y `aria-modal` gratis.
  // Escape cae a la salida explícita "continuar sin pantalla completa" (no un
  // cierre silencioso), consistente con el botón.
  useEffect(() => {
    const dlg = resumeDialogRef.current;
    if (!dlg) return;
    if (showResumeOverlay && ready && !dlg.open) dlg.showModal();
    else if ((!showResumeOverlay || !ready) && dlg.open) dlg.close();
  }, [showResumeOverlay, ready]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base text-text-secondary">
        Preparando tu simulacro…
      </div>
    );
  }

  const total = questions.length;
  const current = questions[currentIndex];
  const isLast = currentIndex === total - 1;
  const selected = selections[currentIndex];

  function handleSelect(optionId: string) {
    const timeSpentSecs = Math.max(0, Math.round((Date.now() - questionStartedAt.current) / 1000));
    useSimulatorStore.getState().answer(optionId, timeSpentSecs);
    setError(null);
  }

  function handleNext() {
    useSimulatorStore.getState().advance();
    void flushNow();
  }

  return (
    <div className="flex min-h-screen flex-col bg-base text-text-primary">
      {/* Barra superior sobria: examen · progreso · temporizador */}
      <header className="yaentre-safe-top sticky top-0 z-20 border-b border-border-subtle bg-surface backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-text-muted">
              {payload.examName} · {payload.areaName}
            </p>
            <p className="font-mono text-sm tabular-nums text-text-secondary">
              Pregunta {currentIndex + 1} de {total}
            </p>
          </div>
          <SimTimer remainingSecs={payload.remainingSecs} onExpire={onExpire} />
        </div>
        {/* G63: `bg-brand-soft` (relleno) vs `bg-elevated` (riel) da 5.5:1;
            `bg-brand` daba 2.6:1, por debajo del 3:1 de WCAG 2.4.11 para un
            objeto gráfico informativo. El texto "Pregunta N de total" comunica
            lo mismo. */}
        <div
          className="h-1 w-full bg-elevated"
          role="progressbar"
          aria-valuenow={currentIndex + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={`Pregunta ${currentIndex + 1} de ${total}`}
        >
          <div
            className="h-1 bg-brand-soft transition-all"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>
      </header>

      {!online && (
        <div className="bg-warning/15 px-4 py-2 text-center text-sm text-warning">
          Sin conexión. Tus respuestas se guardan aquí y se enviarán al reconectar.
        </div>
      )}
      {fsNotice && !isFullscreen && screenfull.isEnabled && (
        <div
          role="status"
          className="flex items-center justify-center gap-3 bg-elevated px-4 py-2 text-center text-sm text-text-secondary"
        >
          Saliste de pantalla completa. El examen real es en pantalla completa.
          <button
            type="button"
            onClick={reenterFullscreen}
            className="inline-flex min-h-touch items-center font-semibold text-brand-soft hover:underline"
          >
            Volver
          </button>
        </div>
      )}

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {current && (
          <div
            ref={questionRegionRef}
            tabIndex={-1}
            role="group"
            aria-label={`Pregunta ${currentIndex + 1} de ${total}`}
            className="rounded-md outline-none"
          >
            <SimQuestion question={current} selectedOption={selected} onSelect={handleSelect} />
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-8 flex items-center justify-end gap-3">
          {confirming && (
            <p role="alert" className="text-sm text-text-secondary">
              No podrás volver a este examen. ¿Terminar?
            </p>
          )}
          {isLast ? (
            <Button
              variant="primary"
              disabled={finishing}
              onClick={() => (confirming ? void finish('USER') : setConfirming(true))}
            >
              {finishing ? 'Calificando…' : confirming ? 'Sí, terminar' : 'Terminar examen'}
            </Button>
          ) : (
            <Button variant="primary" disabled={finishing} onClick={handleNext}>
              Siguiente →
            </Button>
          )}
        </div>
      </main>

      <dialog
        ref={resumeDialogRef}
        aria-labelledby="resume-title"
        onCancel={(e) => {
          e.preventDefault();
          setResumeDismissed(true);
        }}
        className="max-w-sm space-y-4 rounded-xl border border-border-subtle bg-surface p-6 text-center text-text-primary backdrop:bg-base/90"
      >
        <h2 id="resume-title" className="font-display text-lg font-bold text-text-primary">
          Retomando tu simulacro
        </h2>
        <p className="text-sm text-text-secondary">
          Tu tiempo siguió corriendo. Continúa en pantalla completa para replicar el examen real.
        </p>
        {/* `dialog.showModal()` enfoca solo el primer elemento enfocable
            (este botón) al abrir. */}
        <Button variant="primary" className="w-full" onClick={reenterFullscreen}>
          Continuar en pantalla completa
        </Button>
        <button
          type="button"
          onClick={() => setResumeDismissed(true)}
          className="flex min-h-touch w-full items-center justify-center text-xs text-text-secondary hover:underline"
        >
          Continuar sin pantalla completa
        </button>
      </dialog>
    </div>
  );
}
