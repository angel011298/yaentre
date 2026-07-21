'use client';

import { forwardRef, useImperativeHandle, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { DifficultyLevel } from '@prisma/client';
import { updateQuestionAction } from '@/app/actions/admin-questions';
import { Button } from '@/components/ui/Button';

const OPTION_IDS = ['A', 'B', 'C', 'D'] as const;
const DIFFICULTIES: DifficultyLevel[] = [
  'BEGINNER',
  'BASIC',
  'INTERMEDIATE',
  'ADVANCED',
  'EXPERT',
];

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

export interface EditQuestionModalHandle {
  open: () => void;
}

interface Props {
  questionId: string;
  stem: string;
  options: OptionInput[];
  difficulty: DifficultyLevel;
  explanations: LayerInput[];
  /** F3: si es true, guardar TAMBIÉN marca isVerified=true — editar desde el
   * panel de revisión resuelve la cola en un solo paso, no dos. */
  autoApprove?: boolean;
  /** F3: oculta el botón "Editar" propio; el caller (p. ej.
   * ReviewDecisionPanel) provee su propio botón con atajo de teclado y abre
   * el modal vía ref.current?.open(). */
  hideTrigger?: boolean;
}

/**
 * Modal de edición (elemento nativo <dialog>, sin dependencias nuevas). El
 * draft que arma en submit se valida en el servidor con las MISMAS reglas de
 * la Etapa 2 del pipeline (validateDraft, scripts/lib/question-draft-schema) —
 * un admin no puede guardar un reactivo que rompa lo que la generación
 * automática ya exige (4 opciones, 1 correcta, capas 1-3, LaTeX válido).
 */
export const EditQuestionModal = forwardRef<EditQuestionModalHandle, Props>(
  function EditQuestionModal(
    { questionId, stem, options, difficulty, explanations, autoApprove = false, hideTrigger = false },
    ref,
  ) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [stemValue, setStemValue] = useState(stem);
  const [optionValues, setOptionValues] = useState<OptionInput[]>(() =>
    OPTION_IDS.map((id) => {
      const existing = options.find((o) => o.id === id);
      return {
        id,
        text: existing?.text ?? '',
        isCorrect: existing?.isCorrect ?? false,
        // Preservado sin UI de edición (no hay infraestructura de subida de
        // imágenes todavía) — sin esto, guardar BORRARÍA silenciosamente la
        // imagen de la opción al reescribir el JSON completo.
        imageUrl: existing?.imageUrl ?? null,
      };
    }),
  );
  const [difficultyValue, setDifficultyValue] = useState<DifficultyLevel>(difficulty);
  const [layerValues, setLayerValues] = useState<LayerInput[]>(() =>
    [1, 2, 3].map((layer) => {
      const existing = explanations.find((e) => e.layer === layer);
      return {
        layer,
        title: existing?.title ?? '',
        content: existing?.content ?? '',
        latexContent: existing?.latexContent ?? '',
      };
    }),
  );

  function open() {
    setError(null);
    dialogRef.current?.showModal();
  }
  function close() {
    dialogRef.current?.close();
  }

  useImperativeHandle(ref, () => ({ open }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const draft = {
      stem: stemValue,
      options: optionValues.map((o) => ({ ...o, imageUrl: o.imageUrl ?? null })),
      difficulty: difficultyValue,
      explanations: layerValues.map((l) => ({
        layer: l.layer,
        title: l.title,
        content: l.content,
        latexContent: l.latexContent && l.latexContent.trim() ? l.latexContent : null,
      })),
    };

    startTransition(async () => {
      const result = await updateQuestionAction({ questionId, draft, markVerified: autoApprove });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      close();
      router.refresh();
    });
  }

  return (
    <>
      {!hideTrigger && (
        <Button type="button" variant="secondary" onClick={open}>
          Editar
        </Button>
      )}

      <dialog
        ref={dialogRef}
        className="w-full max-w-2xl rounded-lg border border-border-subtle bg-surface p-0 text-text-primary backdrop:bg-black/50"
      >
        <form onSubmit={handleSubmit} className="max-h-[85vh] space-y-5 overflow-y-auto p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Editar reactivo</h2>
            <button
              type="button"
              onClick={close}
              className="min-h-touch min-w-touch text-text-secondary hover:text-text-primary"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-text-secondary">Enunciado</span>
            <textarea
              value={stemValue}
              onChange={(e) => setStemValue(e.target.value)}
              rows={3}
              required
              className="w-full rounded-md border border-border-subtle bg-input p-3 text-text-primary"
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-text-secondary">
              Opciones (marca la correcta)
            </legend>
            {optionValues.map((opt, i) => (
              <div key={opt.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correctOption"
                  aria-label={`Opción ${opt.id} correcta`}
                  checked={opt.isCorrect}
                  onChange={() =>
                    setOptionValues((prev) =>
                      prev.map((o, j) => ({ ...o, isCorrect: j === i })),
                    )
                  }
                  className="h-5 w-5 accent-brand"
                />
                <span className="w-5 shrink-0 font-semibold">{opt.id}</span>
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) =>
                    setOptionValues((prev) =>
                      prev.map((o, j) => (j === i ? { ...o, text: e.target.value } : o)),
                    )
                  }
                  required
                  className="min-h-touch flex-1 rounded-md border border-border-subtle bg-input px-3 text-text-primary"
                />
                {opt.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={opt.imageUrl}
                    alt={`Opción ${opt.id}`}
                    title="Imagen de la opción (no editable aquí)"
                    className="h-10 w-10 shrink-0 rounded border border-border-subtle object-cover"
                  />
                )}
              </div>
            ))}
          </fieldset>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-text-secondary">Dificultad</span>
            <select
              value={difficultyValue}
              onChange={(e) => setDifficultyValue(e.target.value as DifficultyLevel)}
              className="min-h-touch rounded-md border border-border-subtle bg-input px-3 text-text-primary"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-4">
            <p className="text-sm font-medium text-text-secondary">Explicaciones</p>
            {layerValues.map((layer, i) => (
              <div key={layer.layer} className="space-y-2 rounded-md border border-border-subtle p-3">
                <p className="text-xs font-semibold uppercase text-text-muted">Capa {layer.layer}</p>
                <input
                  type="text"
                  placeholder="Título"
                  value={layer.title}
                  onChange={(e) =>
                    setLayerValues((prev) =>
                      prev.map((l, j) => (j === i ? { ...l, title: e.target.value } : l)),
                    )
                  }
                  required
                  className="min-h-touch w-full rounded-md border border-border-subtle bg-input px-3 text-text-primary"
                />
                <textarea
                  placeholder="Contenido"
                  value={layer.content}
                  onChange={(e) =>
                    setLayerValues((prev) =>
                      prev.map((l, j) => (j === i ? { ...l, content: e.target.value } : l)),
                    )
                  }
                  rows={2}
                  required
                  className="w-full rounded-md border border-border-subtle bg-input p-3 text-text-primary"
                />
                <textarea
                  placeholder="LaTeX (opcional, sin $ — modo display)"
                  value={layer.latexContent ?? ''}
                  onChange={(e) =>
                    setLayerValues((prev) =>
                      prev.map((l, j) => (j === i ? { ...l, latexContent: e.target.value } : l)),
                    )
                  }
                  rows={2}
                  className="w-full rounded-md border border-border-subtle bg-input p-3 font-mono text-sm text-text-primary"
                />
              </div>
            ))}
          </div>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={close} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
  },
);
