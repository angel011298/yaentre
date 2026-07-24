'use client';

import { LatexText } from '@/components/admin/LatexText';
import type { RunnerQuestion } from '@/lib/db/diagnostic';
import { OptionButton } from '@/components/exam/OptionButton';

/**
 * Vista de un reactivo dentro del simulador (F12). Deliberadamente sobria:
 * sin el encabezado de tema/materia del `QuestionCard` del diagnóstico (para no
 * dar pistas y replicar la neutralidad del examen real) — el contador de
 * progreso vive en la barra superior. Reusa `OptionButton`, que por diseño
 * NUNCA recibe `isCorrect`.
 */
export function SimQuestion({
  question,
  selectedOption,
  onSelect,
}: {
  question: RunnerQuestion;
  selectedOption: string | null;
  onSelect: (optionId: string) => void;
}) {
  return (
    <div className="space-y-5">
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

      <div className="rounded-lg border border-border-subtle bg-surface p-6">
        <p className="text-lg leading-relaxed text-text-primary">
          <LatexText text={question.stem} />
        </p>
        {question.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={question.imageUrl}
            alt="Estímulo del reactivo"
            className="mt-4 max-h-72 w-auto rounded-md border border-border-subtle"
          />
        )}
      </div>

      <div className="space-y-2">
        {question.options.map((opt) => (
          <OptionButton
            key={opt.id}
            id={opt.id}
            text={opt.text}
            selected={selectedOption === opt.id}
            onClick={() => onSelect(opt.id)}
          />
        ))}
      </div>
    </div>
  );
}
