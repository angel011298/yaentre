'use client';

import { LatexText } from '@/components/admin/LatexText';
import type { RunnerQuestion } from '@/lib/db/diagnostic';
import { DrillOptionButton, type OptionReveal } from './DrillOptionButton';

interface Props {
  question: RunnerQuestion;
  index: number;
  total: number;
  selectedOption: string | null;
  correctOption: string | null;
  onSelect: (optionId: string) => void;
}

/** Reactivo del drill con feedback inmediato (F14 tarea 3). KaTeX vía
 *  `LatexText` (tarea 5) — mismo componente ya probado en diagnóstico/simulador. */
export function DrillQuestion({
  question,
  index,
  total,
  selectedOption,
  correctOption,
  onSelect,
}: Props) {
  const answered = correctOption !== null;

  function revealFor(optionId: string): OptionReveal {
    if (!answered) return null;
    if (optionId === correctOption) return 'correct';
    if (optionId === selectedOption) return 'incorrect';
    return 'neutral';
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        Reactivo {index + 1} de {total} · {question.subjectName} · {question.topicName}
      </p>

      {question.passage && (
        <div className="space-y-2 rounded-lg border border-border-subtle bg-elevated p-5">
          {question.passage.title && (
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              {question.passage.title}
            </p>
          )}
          <div className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">
            <LatexText text={question.passage.content} />
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-border-subtle bg-surface p-5">
        <p className="text-base leading-relaxed text-text-primary">
          <LatexText text={question.stem} />
        </p>
        {question.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={question.imageUrl}
            alt={`Reactivo ${index + 1}`}
            className="max-h-64 w-auto rounded-md border border-border-subtle"
          />
        )}
      </div>

      <div className="space-y-2">
        {question.options.map((opt) => (
          <DrillOptionButton
            key={opt.id}
            id={opt.id}
            text={opt.text}
            selected={selectedOption === opt.id}
            reveal={revealFor(opt.id)}
            onClick={() => onSelect(opt.id)}
            disabled={answered}
          />
        ))}
      </div>
    </div>
  );
}
