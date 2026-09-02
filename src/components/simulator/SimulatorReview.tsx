import Link from 'next/link';
import { LatexText } from '@/components/admin/LatexText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { RevealedQuestion } from '@/lib/db/simulator';

/**
 * Revisión de preguntas falladas (F13 tareas 8 y 9). Server Component,
 * `<details>/<summary>` nativo — mismo patrón "cero JS de cliente" que el FAQ
 * de la landing (F10) — para una lista que solo necesita expandir/colapsar.
 * Legítimo mostrar la respuesta correcta aquí porque el llamador
 * (`loadSimulatorReview`) ya verificó dueño + sesión terminada.
 */
export function SimulatorReview({
  questions,
  sessionId,
}: {
  questions: RevealedQuestion[];
  sessionId: string;
}) {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <div>
        <h1 className="font-display text-xl font-bold text-text-primary">
          Preguntas que fallaste
        </h1>
        <p className="text-sm text-text-secondary">
          {questions.length} {questions.length === 1 ? 'pregunta' : 'preguntas'} — con la respuesta
          correcta y una explicación.
        </p>
      </div>

      <div className="space-y-3">
        {questions.map((q, i) => (
          <Card key={q.id} className="space-y-3 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              {i + 1}. {q.subjectName} · {q.topicName}
            </p>
            <p className="text-sm leading-relaxed text-text-primary">
              <LatexText text={q.stem} />
            </p>
            {q.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={q.imageUrl}
                alt="Figura del reactivo (necesaria para responder)"
                className="max-h-56 w-auto rounded-md border border-border-subtle"
              />
            )}

            <ul className="space-y-1.5">
              {q.options.map((opt) => {
                const wasSelected = opt.id === q.selectedOption;
                const tone = opt.isCorrect
                  ? 'border-success bg-success/10 text-text-primary'
                  : wasSelected
                    ? 'border-danger bg-danger/10 text-text-primary'
                    : 'border-border-subtle text-text-secondary';
                return (
                  <li
                    key={opt.id}
                    className={`flex items-start gap-2 rounded-md border p-2.5 text-sm ${tone}`}
                  >
                    <span aria-hidden>{opt.isCorrect ? '✓' : wasSelected ? '✗' : '○'}</span>
                    <span>
                      <LatexText text={opt.text} />
                      {opt.isCorrect && (
                        <span className="ml-1 text-xs font-semibold text-success">(correcta)</span>
                      )}
                      {wasSelected && !opt.isCorrect && (
                        <span className="ml-1 text-xs font-semibold text-danger">
                          (tu respuesta)
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>

            {q.explanation && (
              <details className="rounded-md border border-border-subtle bg-elevated p-3">
                <summary className="cursor-pointer text-sm font-semibold text-brand-soft">
                  {q.explanation.title}
                </summary>
                <div className="mt-2 whitespace-pre-line text-sm leading-relaxed text-text-secondary">
                  <LatexText text={q.explanation.content} />
                </div>
              </details>
            )}
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        <Link href={`/simulador?view=result&session=${sessionId}`}>
          <Button variant="secondary" className="w-full">
            Volver a mis resultados
          </Button>
        </Link>
        <Link href="/app">
          <Button variant="primary" className="w-full">
            Ir a mi tablero
          </Button>
        </Link>
      </div>
    </main>
  );
}
