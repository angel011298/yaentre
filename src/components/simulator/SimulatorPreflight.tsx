'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { Tino } from '@/components/mascot/Tino';
import { Button } from '@/components/ui/Button';

type CameraStatus = 'idle' | 'granted' | 'denied' | 'unsupported';

const MOBILE_QUERY = '(max-width: 1024px)';

/** Detección reactiva de "dispositivo móvil" sin setState-en-efecto (SSR-safe). */
function useIsMobile(): boolean {
  const subscribe = useCallback((cb: () => void) => {
    const mq = window.matchMedia(MOBILE_QUERY);
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches || (navigator.maxTouchPoints ?? 0) > 0,
    () => false
  );
}

/**
 * Pantalla previa del simulador (F12 tarea 2). Explica las reglas, ofrece el
 * permiso de cámara (orientativo, nunca bloquea), y avisa en móvil que el
 * examen real requiere computadora. Para un usuario gratuito que estrena su
 * simulacro, Tino da la bienvenida cálida (tarea 1) — esta es la ÚLTIMA
 * aparición de Tino antes del modo serio; en la sesión activa desaparece.
 */
export function SimulatorPreflight({
  isFreeFirstTime,
  examName,
  totalQuestions,
  durationMins,
  starting,
  startError,
  onStart,
}: {
  isFreeFirstTime: boolean;
  examName: string;
  totalQuestions: number;
  durationMins: number;
  starting: boolean;
  startError: string | null;
  onStart: (cameraGranted: boolean | null) => void;
}) {
  const [camera, setCamera] = useState<CameraStatus>('idle');
  const isMobile = useIsMobile();

  async function requestCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera('unsupported');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Solo confirmamos el permiso; no grabamos ni transmitimos nada.
      stream.getTracks().forEach((t) => t.stop());
      setCamera('granted');
    } catch {
      setCamera('denied');
    }
  }

  const cameraGranted = camera === 'granted' ? true : camera === 'denied' ? false : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4 py-10">
      {isFreeFirstTime && (
        <div className="flex items-start gap-3 rounded-lg border border-border-subtle bg-surface p-4">
          <Tino state="encouraging" size={52} />
          <p className="text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">Este primer simulacro va por mi
            cuenta.</span>{' '}
            Vívelo como el examen real: sin pausas, sin regresar. Así llegas sin sorpresas el día
            que cuenta. 🦉
          </p>
        </div>
      )}

      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">Simulacro completo</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {examName} · {totalQuestions} preguntas · {durationMins} minutos
        </p>
      </div>

      <ul className="space-y-3 rounded-lg border border-border-subtle bg-surface p-5 text-sm text-text-secondary">
        <li className="flex gap-3">
          <span aria-hidden>⏱️</span>
          <span>El examen <strong className="text-text-primary">no se puede pausar</strong>. El
          tiempo corre aunque cambies de pestaña o cierres la ventana.</span>
        </li>
        <li className="flex gap-3">
          <span aria-hidden>➡️</span>
          <span><strong className="text-text-primary">No podrás regresar</strong> a una pregunta
          anterior, igual que en el examen real.</span>
        </li>
        <li className="flex gap-3">
          <span aria-hidden>🖥️</span>
          <span>Se abrirá en <strong className="text-text-primary">pantalla completa</strong>. Si
          tu navegador no lo permite, podrás continuar de todas formas.</span>
        </li>
      </ul>

      <div className="rounded-lg border border-border-subtle bg-surface p-5">
        <p className="text-sm font-semibold text-text-primary">Cámara (opcional)</p>
        <p className="mt-1 text-sm text-text-secondary">
          El examen real puede pedir cámara. Practicar con ella activada te acostumbra — pero es tu
          decisión y no bloquea nada.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Button variant="secondary" onClick={requestCamera} disabled={camera === 'granted'}>
            {camera === 'granted' ? 'Cámara permitida ✓' : 'Permitir cámara'}
          </Button>
          {camera === 'denied' && (
            <span className="text-sm text-text-muted">Sin cámara — puedes continuar igual.</span>
          )}
          {camera === 'unsupported' && (
            <span className="text-sm text-text-muted">Tu navegador no tiene cámara disponible.</span>
          )}
        </div>
      </div>

      {isMobile && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-text-secondary">
          <strong className="text-text-primary">Estás en un dispositivo móvil.</strong> El examen
          real requiere una computadora. Puedes practicar aquí, pero te recomendamos hacer los
          simulacros en una laptop o PC.
        </div>
      )}

      {startError && <p className="text-sm text-danger">{startError}</p>}

      <Button
        variant="primary"
        className="w-full py-3 text-base"
        disabled={starting}
        onClick={() => onStart(cameraGranted)}
      >
        {starting ? 'Iniciando…' : 'Iniciar examen'}
      </Button>
    </div>
  );
}
