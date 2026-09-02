'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { finishSession, submitAnswer } from '@/app/actions/sessions';
import { Button } from '@/components/ui/Button';
import type { RunnerQuestion } from '@/lib/db/diagnostic';
import { QuestionCard } from './QuestionCard';
import { QuestionNavigator } from './QuestionNavigator';
import { Timer } from './Timer';

interface Props {
  sessionId: string;
  deadline: Date;
  questions: RunnerQuestion[];
  initialSelections: Array<string | null>;
}

/**
 * Runner del diagnóstico (F7). RSC + useState puro — CLAUDE.md prohíbe
 * Zustand fuera del simulador. Cada respuesta se envía a la Server Action
 * real de F2 (`submitAnswer`, la misma que usa el simulador) via upsert, así
 * que cambiar una respuesta ya dada (ir hacia atrás y corregir) simplemente
 * la sobreescribe — no hace falta lógica especial para "permitir regresar",
 * la capa de datos ya lo soporta.
 */
export function DiagnosticRunner({ sessionId, deadline, questions, initialSelections }: Props) {
  const router = useRouter();
  const total = questions.length;

  const [currentIndex, setCurrentIndex] = useState(() => {
    const firstUnanswered = initialSelections.findIndex((s) => s === null);
    return firstUnanswered === -1 ? 0 : firstUnanswered;
  });
  const [selections, setSelections] = useState<Array<string | null>>(initialSelections);
  const [pendingFinish, setPendingFinish] = useState(false);
  const [confirmingFinish, setConfirmingFinish] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questionStartedAt = useRef<number>(0);
  // G63: al cambiar de pregunta (Siguiente/Anterior/salto), mover el foco a la
  // región del reactivo para que se anuncie y el teclado no se quede colgado.
  const questionRegionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    questionStartedAt.current = Date.now();
    questionRegionRef.current?.focus();
  }, [currentIndex]);

  const answeredFlags = useMemo(() => selections.map((s) => s !== null), [selections]);
  const answeredCount = answeredFlags.filter(Boolean).length;
  const current = questions[currentIndex];

  function goTo(index: number) {
    if (index < 0 || index >= total) return;
    setCurrentIndex(index);
    setConfirmingFinish(false);
  }

  async function handleSelect(optionId: string) {
    const previous = selections[currentIndex];
    setSelections((prev) => prev.map((s, i) => (i === currentIndex ? optionId : s)));
    setError(null);

    const timeSpentSecs = Math.max(0, Math.round((Date.now() - questionStartedAt.current) / 1000));
    const result = await submitAnswer({
      sessionId,
      questionId: current.id,
      selectedOption: optionId,
      position: currentIndex,
      timeSpentSecs,
    });

    if (!result.ok) {
      setSelections((prev) => prev.map((s, i) => (i === currentIndex ? previous : s)));
      setError(
        result.code === 'NOT_IN_PROGRESS'
          ? 'Tu sesión expiró. Vamos a abrir una nueva.'
          : 'No pudimos guardar tu respuesta. Intenta de nuevo.'
      );
      if (result.code === 'NOT_IN_PROGRESS') router.refresh();
    }
  }

  async function handleFinish(reason: 'USER' | 'TIMEOUT' = 'USER') {
    if (reason === 'USER' && answeredCount < total && !confirmingFinish) {
      setConfirmingFinish(true);
      return;
    }
    setPendingFinish(true);
    setError(null);

    const result = await finishSession({ sessionId, reason });
    if (result.ok) {
      router.refresh();
    } else {
      setPendingFinish(false);
      setError('No pudimos cerrar tu diagnóstico. Intenta de nuevo.');
      if (result.code === 'NOT_IN_PROGRESS') router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-text-secondary">
          {answeredCount}/{total} respondidas
        </p>
        <Timer deadline={deadline} onExpire={() => handleFinish('TIMEOUT')} />
      </div>

      <QuestionNavigator
        total={total}
        currentIndex={currentIndex}
        answered={answeredFlags}
        onJump={goTo}
      />

      <div
        ref={questionRegionRef}
        tabIndex={-1}
        role="group"
        aria-label={`Pregunta ${currentIndex + 1} de ${total}`}
        className="outline-none"
      >
        <QuestionCard
          question={current}
          index={currentIndex}
          total={total}
          selectedOption={selections[currentIndex]}
          onSelect={handleSelect}
        />
      </div>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}>
            Anterior
          </Button>
          <Button
            variant="secondary"
            onClick={() => goTo(currentIndex + 1)}
            disabled={currentIndex === total - 1}
          >
            Siguiente
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {confirmingFinish && (
            <p role="alert" className="text-sm text-warning">
              Te faltan {total - answeredCount} preguntas. ¿Terminar de todas formas?
            </p>
          )}
          <Button variant="primary" onClick={() => handleFinish('USER')} disabled={pendingFinish}>
            {confirmingFinish ? 'Sí, terminar' : 'Terminar diagnóstico'}
          </Button>
        </div>
      </div>
    </div>
  );
}
