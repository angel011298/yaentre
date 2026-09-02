import { LatexText } from '@/components/admin/LatexText';
import type { RunnerQuestion } from '@/lib/db/diagnostic';
import { OptionButton } from './OptionButton';

interface Props {
  question: RunnerQuestion;
  index: number;
  total: number;
  selectedOption: string | null;
  onSelect: (optionId: string) => void;
}

export function QuestionCard({ question, index, total, selectedOption, onSelect }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        Pregunta {index + 1} de {total} · {question.subjectName} · {question.topicName}
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
            alt="Figura del reactivo (necesaria para responder)"
            className="max-h-64 w-auto rounded-md border border-border-subtle"
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
