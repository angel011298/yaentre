'use client';

import { useEffect, useRef, useState } from 'react';
import { finishSession, submitAnswer } from '@/app/actions/sessions';
import { Button } from '@/components/ui/Button';
import type { FinishSessionResult } from '@/lib/db/sessions';
import type { DrillPayload } from '@/lib/db/drill';
import { DrillQuestion } from './DrillQuestion';
import { ExplanationAccordion } from './ExplanationAccordion';
import { ReportQuestionButton } from './ReportQuestionButton';

/**
 * Sesión activa de práctica libre (F14). Una pregunta a la vez, feedback
 * inmediato (`submitAnswer` ya revela correctitud en TOPIC_DRILL/AREA_PRACTICE
 * — F2/F6, sin cambios). Al terminar, `finishSession` (F2, reusado sin
 * modificar) dispara `onSessionFinished` → recalcula temas débiles + racha
 * (tarea 8) — cero código nuevo para eso, ya existía.
 */
export function DrillRunner({
  payload,
  onFinished,
  onPracticeMore,
  onExitToSelector,
}: {
  payload: DrillPayload;
  onFinished: (result: FinishSessionResult) => void;
  onPracticeMore: (topicId: string) => void;
  onExitToSelector: () => void;
}) {
  const total = payload.questions.length;
  const [currentIndex, setCurrentIndex] = useState(() => {
    const firstUnanswered = payload.initialSelections.findIndex((s) => s === null);
    return firstUnanswered === -1 ? 0 : firstUnanswered;
  });
  const [selections, setSelections] = useState<Array<string | null>>(payload.initialSelections);
  const [correctness, setCorrectness] = useState<Array<string | null>>(
    payload.initialSelections.map(() => null)
  );
  // Índice de la pregunta cuya explicación está abierta, si alguna. Derivar
  // `showExplanation` de esto (en vez de un booleano + reset-en-efecto) hace
  // que cambiar de pregunta "cierre" la explicación automáticamente, sin
  // necesitar un efecto que llame setState (regla de pureza de React 19).
  const [explanationOpenIndex, setExplanationOpenIndex] = useState<number | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date.now() no puede vivir en el cuerpo del render/useRef: se fija en efecto.
  const questionStartedAt = useRef<number>(0);
  useEffect(() => {
    questionStartedAt.current = Date.now();
  }, [currentIndex]);

  const current = payload.questions[currentIndex];
  const answered = correctness[currentIndex] !== null;
  const answeredCount = selections.filter((s) => s !== null).length;
  const isLast = currentIndex === total - 1;
  const showExplanation = explanationOpenIndex === currentIndex;

  async function handleSelect(optionId: string) {
    if (answered) return;
    setSelections((prev) => prev.map((s, i) => (i === currentIndex ? optionId : s)));
    setError(null);

    const timeSpentSecs = Math.max(0, Math.round((Date.now() - questionStartedAt.current) / 1000));
    const result = await submitAnswer({
      sessionId: payload.sessionId,
      questionId: current.id,
      selectedOption: optionId,
      position: currentIndex,
      timeSpentSecs,
    });

    if (!result.ok) {
      setSelections((prev) => prev.map((s, i) => (i === currentIndex ? null : s)));
      setError('No pudimos guardar tu respuesta. Intenta de nuevo.');
      return;
    }
    // Estos modos SIEMPRE revelan correctitud al responder (F2/F6).
    const { data } = result;
    if ('correctOption' in data) {
      const correctOption = data.correctOption;
      setCorrectness((prev) => prev.map((c, i) => (i === currentIndex ? correctOption : c)));
    }
  }

  function goNext() {
    setCurrentIndex((i) => Math.min(i + 1, total - 1));
  }

  async function handleFinish() {
    setFinishing(true);
    setError(null);
    const result = await finishSession({ sessionId: payload.sessionId, reason: 'USER' });
    if (result.ok) {
      onFinished(result.data);
    } else {
      setFinishing(false);
      setError('No pudimos cerrar tu sesión. Intenta de nuevo.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            {payload.scopeLabel}
          </p>
          <p className="text-sm text-text-secondary">
            {answeredCount}/{total} respondidas
            {payload.remainingToday !== null && (
              <span className="text-text-muted"> · {payload.remainingToday} gratis hoy</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onExitToSelector}
          className="text-xs text-text-muted hover:text-text-secondary"
        >
          ← Elegir otra práctica
        </button>
      </div>

      <DrillQuestion
        question={current}
        index={currentIndex}
        total={total}
        selectedOption={selections[currentIndex]}
        correctOption={correctness[currentIndex]}
        onSelect={handleSelect}
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      {answered && (
        <div className="space-y-3">
          <p
            className={`text-sm font-semibold ${
              selections[currentIndex] === correctness[currentIndex] ? 'text-success' : 'text-danger'
            }`}
          >
            {selections[currentIndex] === correctness[currentIndex] ? '¡Correcto! ✓' : 'Incorrecto ✗'}
          </p>

          {!showExplanation ? (
            <Button variant="secondary" onClick={() => setExplanationOpenIndex(currentIndex)}>
              Ver explicación
            </Button>
          ) : (
            <ExplanationAccordion
              questionId={current.id}
              topicId={current.topicId}
              onPracticeMore={onPracticeMore}
            />
          )}

          <ReportQuestionButton questionId={current.id} />
        </div>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-4">
        {isLast ? (
          <Button variant="primary" onClick={handleFinish} disabled={finishing}>
            {finishing ? 'Guardando…' : 'Terminar sesión'}
          </Button>
        ) : (
          <Button variant="primary" onClick={goNext} disabled={!answered}>
            Siguiente →
          </Button>
        )}
      </div>
    </div>
  );
}
