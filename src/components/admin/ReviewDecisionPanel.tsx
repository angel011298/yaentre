'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { DifficultyLevel } from '@prisma/client';
import { approveWithOptionAction, rejectQuestionAction } from '@/app/actions/admin-questions';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EditQuestionModal, type EditQuestionModalHandle } from './EditQuestionModal';
import { LatexText } from './LatexText';
import type { VerificationRecord } from '@/lib/admin/verification';

interface OptionInput {
  id: string;
  text: string;
  isCorrect: boolean;
  imageUrl?: string | null;
}
interface LayerInput {
  layer: number;
  title: string;
  content: string;
  latexContent: string | null;
}

interface Props {
  questionId: string;
  stem: string;
  imageUrl: string | null;
  options: OptionInput[];
  difficulty: DifficultyLevel;
  explanations: LayerInput[];
  record: VerificationRecord;
}

const KEY_TO_INDEX: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 };

function ProblemsList({ problems }: { problems: VerificationRecord['verdict']['problems'] }) {
  if (problems.length === 0) return null;
  return (
    <ul className="space-y-1 text-sm text-text-secondary">
      {problems.map((p, i) => (
        <li key={i}>
          ⚠️ <strong>{p.type}</strong> — {p.detail}
        </li>
      ))}
    </ul>
  );
}

/**
 * Panel de decisión del pipeline adversarial (F3). Muestra el reactivo con
 * las 4 opciones (etiquetando cuál eligió el generador y cuál el
 * verificador), el razonamiento completo, los problemas detectados y — si
 * aplica — la auditoría de tercera pasada. Acciones de un clic para resolver
 * la cola: aprobar con cualquiera de las 4 opciones, editar (resuelve al
 * guardar), o descartar.
 *
 * Atajos de teclado: 1-4 aprueba con la opción en esa posición, D descarta,
 * E abre edición. Se ignoran mientras se escribe en un campo o hay un
 * <dialog> abierto (el propio modal de edición).
 */
export function ReviewDecisionPanel({
  questionId,
  stem,
  imageUrl,
  options,
  difficulty,
  explanations,
  record,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<'approved' | 'discarded' | null>(null);
  const editRef = useRef<EditQuestionModalHandle>(null);

  const sorted = [...options].sort((a, b) => a.id.localeCompare(b.id));

  function handleApprove(optionId: string) {
    if (isPending || done) return;
    setError(null);
    startTransition(async () => {
      const result = await approveWithOptionAction({ questionId, optionId });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDone('approved');
      router.push('/admin/questions/queue');
      router.refresh();
    });
  }

  function handleDiscard() {
    if (isPending || done) return;
    if (
      !window.confirm('¿Descartar y ELIMINAR este reactivo? Esta acción no se puede deshacer.')
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await rejectQuestionAction({ questionId });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDone('discarded');
      router.push('/admin/questions/queue');
      router.refresh();
    });
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isPending || done) return;
      const active = document.activeElement;
      const isTyping =
        active instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName);
      if (isTyping || document.querySelector('dialog[open]')) return;

      if (e.key in KEY_TO_INDEX) {
        const opt = sorted[KEY_TO_INDEX[e.key]];
        if (opt) handleApprove(opt.id);
      } else if (e.key.toLowerCase() === 'd') {
        handleDiscard();
      } else if (e.key.toLowerCase() === 'e') {
        editRef.current?.open();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, done, sorted]);

  if (done) {
    return (
      <Card className="p-6 text-center text-text-secondary">
        {done === 'approved' ? '✅ Aprobado' : '🗑️ Descartado'} — regresando a la cola…
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-6">
        <p className="text-lg text-text-primary">
          <LatexText text={stem} />
        </p>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Reactivo"
            className="max-h-72 w-auto rounded-md border border-border-subtle"
          />
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {sorted.map((opt, i) => {
            const isGenerator = opt.id === record.generatorOption;
            const isVerifier = opt.id === record.verdict.chosenOption;
            const borderClass =
              isGenerator && isVerifier
                ? 'border-success bg-success/10'
                : isGenerator
                  ? 'border-info bg-info/10'
                  : isVerifier
                    ? 'border-warning bg-warning/10'
                    : 'border-border-subtle';

            return (
              <div key={opt.id} className={`space-y-2 rounded-md border p-3 text-sm ${borderClass}`}>
                <span className="font-semibold text-text-primary">
                  {opt.id}. <LatexText text={opt.text} />
                </span>
                {opt.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={opt.imageUrl}
                    alt={`Opción ${opt.id}`}
                    className="max-h-40 w-auto rounded-md border border-border-subtle"
                  />
                )}
                <div className="flex flex-wrap items-center gap-1.5">
                  {isGenerator && (
                    <span className="rounded-full bg-info/20 px-2 py-0.5 text-xs font-medium text-info">
                      🤖 Generador
                    </span>
                  )}
                  {isVerifier && (
                    <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning">
                      🔍 Verificador
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={isPending}
                  onClick={() => handleApprove(opt.id)}
                >
                  Aprobar con {opt.id} <span className="ml-1 text-text-muted">({i + 1})</span>
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-3 p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Razonamiento del verificador
        </p>
        <p className="text-sm text-text-secondary">{record.verdict.reasoning}</p>
        <p className="text-xs text-text-muted">
          Confianza: {(record.verdict.confidence * 100).toFixed(0)}% · Modelo:{' '}
          {record.verdict.model}
          {record.verdict.usedCalculation && ' · ejecutó cálculo'}
        </p>
        {record.verdict.problems.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-danger">
              Problemas detectados
            </p>
            <ProblemsList problems={record.verdict.problems} />
          </div>
        )}
      </Card>

      {record.audit && (
        <Card className="space-y-3 border-brand/30 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            Auditoría (tercera pasada — muestreo de control 5%)
          </p>
          <p className="text-sm text-text-secondary">
            Eligió <strong>{record.audit.verdict.chosenOption}</strong> · confianza{' '}
            {(record.audit.verdict.confidence * 100).toFixed(0)}% · modelo{' '}
            {record.audit.verdict.model}
          </p>
          <p className="text-sm text-text-secondary">{record.audit.verdict.reasoning}</p>
          <ProblemsList problems={record.audit.verdict.problems} />
        </Card>
      )}

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <EditQuestionModal
          ref={editRef}
          questionId={questionId}
          stem={stem}
          options={options}
          difficulty={difficulty}
          explanations={explanations}
          autoApprove
          hideTrigger
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => editRef.current?.open()}
          disabled={isPending}
        >
          Editar <span className="ml-1 text-text-muted">(E)</span>
        </Button>
        <Button type="button" variant="danger" onClick={handleDiscard} disabled={isPending}>
          Descartar <span className="ml-1 text-white/70">(D)</span>
        </Button>
        {isPending && <span className="text-sm text-text-muted">Procesando…</span>}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <p className="ml-auto text-xs text-text-muted">
          Atajos: 1-4 aprobar opción · D descartar · E editar
        </p>
      </Card>
    </div>
  );
}
