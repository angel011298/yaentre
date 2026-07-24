'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Tino } from '@/components/mascot/Tino';
import type { PracticeOptions, PracticeScope } from '@/lib/db/drill';
import type { PaywallTrigger } from '@/lib/paywall/gates';
import { drillLimitReached } from '@/lib/tino/copy';

/**
 * Selector de práctica (F14 tarea 1): reforzar temas débiles (default, usa el
 * selector adaptativo real de F6), por materia, o por tema específico.
 * Contador diario visible (tarea 2, F9) — 0 restantes deshabilita todo y
 * ofrece el paywall directo en vez de dejar clickear hacia un error.
 */
export function PracticeSelector({
  options,
  remainingToday,
  starting,
  startError,
  paywallTrigger,
  onStart,
}: {
  options: PracticeOptions;
  remainingToday: number | null;
  starting: boolean;
  startError: string | null;
  paywallTrigger: PaywallTrigger | null;
  onStart: (scope: PracticeScope) => void;
}) {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const limitReached = remainingToday === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">Practicar</h1>
        {remainingToday !== null && (
          <p className="mt-1 text-sm text-text-secondary">
            {limitReached ? (
              <span className="font-semibold text-warning">
                Llegaste a tu práctica gratis de hoy.
              </span>
            ) : (
              <>
                Te quedan{' '}
                <span className="font-mono font-semibold text-text-primary">
                  {remainingToday}
                </span>{' '}
                reactivos gratis hoy.
              </>
            )}
          </p>
        )}
      </div>

      {limitReached && (
        <Card className="flex items-start gap-3 p-4">
          <Tino state={drillLimitReached().state} size={48} />
          <div>
            <p className="text-sm font-semibold text-text-primary">{drillLimitReached().message}</p>
            <Link
              href={`/paywall?trigger=${paywallTrigger ?? 'DRILL_DAILY_LIMIT'}&return=%2Fpracticar`}
              className="mt-1 inline-block text-sm font-semibold text-brand hover:underline"
            >
              Ver planes →
            </Link>
          </div>
        </Card>
      )}

      <button
        type="button"
        disabled={starting || limitReached}
        onClick={() => onStart({ kind: 'area' })}
        className="w-full rounded-lg border border-brand bg-brand-tint p-4 text-left transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
      >
        <p className="font-display font-semibold text-text-primary">
          🎯 Reforzar mis temas débiles
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          {options.weakTopics.length > 0
            ? `Prioriza: ${options.weakTopics.map((t) => t.topicName).join(', ')}`
            : 'El motor adaptativo elige por ti — mezcla de temas débiles, intermedios y dominados.'}
        </p>
      </button>

      <div>
        <p className="mb-2 text-sm font-semibold text-text-primary">Por materia</p>
        <div className="space-y-2">
          {options.subjects.map((subject) => (
            <Card key={subject.subjectId} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={starting || limitReached}
                  onClick={() => onStart({ kind: 'subject', subjectId: subject.subjectId })}
                  className="text-left text-sm font-semibold text-text-primary hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {subject.subjectName}
                </button>
                {subject.topics.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSubject((prev) =>
                        prev === subject.subjectId ? null : subject.subjectId
                      )
                    }
                    className="text-xs text-text-muted hover:text-text-secondary"
                  >
                    {expandedSubject === subject.subjectId ? 'Ocultar temas ▲' : 'Ver temas ▾'}
                  </button>
                )}
              </div>

              {expandedSubject === subject.subjectId && (
                <ul className="mt-3 space-y-1 border-t border-border-subtle pt-3">
                  {subject.topics.map((topic) => (
                    <li key={topic.topicId}>
                      <button
                        type="button"
                        disabled={starting || limitReached}
                        onClick={() => onStart({ kind: 'topic', topicId: topic.topicId })}
                        className="w-full min-h-touch rounded-md px-2 py-1.5 text-left text-sm text-text-secondary hover:bg-elevated hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {topic.topicName}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      </div>

      {startError && <p className="text-sm text-danger">{startError}</p>}
      {starting && <p className="text-sm text-text-secondary">Preparando tu práctica…</p>}
    </div>
  );
}
