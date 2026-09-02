'use client';

import { useState } from 'react';
import Link from 'next/link';
import { revealExplanationLayerAction } from '@/app/actions/drill';
import { Button } from '@/components/ui/Button';
import { LatexText } from '@/components/admin/LatexText';
import type { ExplanationLayerContent } from '@/lib/db/drill';
import type { PaywallTrigger } from '@/lib/paywall/gates';

const LAYER_TITLES: Record<number, string> = {
  1: '¿Por qué es correcta?',
  2: 'Paso a paso',
  3: 'El concepto base',
  4: 'Practica más de esto',
};

/**
 * Resolución explicada por 4 capas (F14 tarea 4; PRD F-04). Se revelan
 * PROGRESIVAMENTE — la capa N solo se puede pedir si la N-1 ya se reveló — y
 * cada clic vuelve a validar el muro suave EN EL SERVIDOR
 * (`revealExplanationLayerAction`), así que el contenido de capas 2-4 nunca
 * llega al cliente de un usuario gratuito sin autorización (no es solo un
 * candado visual). Fórmulas vía `LatexText`/KaTeX (tarea 5).
 */
export function ExplanationAccordion({
  questionId,
  topicId,
  onPracticeMore,
}: {
  questionId: string;
  topicId: string;
  onPracticeMore: (topicId: string) => void;
}) {
  const [revealed, setRevealed] = useState<Record<number, ExplanationLayerContent>>({});
  const [openLayer, setOpenLayer] = useState<number | null>(null);
  const [loadingLayer, setLoadingLayer] = useState<number | null>(null);
  const [paywall, setPaywall] = useState<{ layer: number; trigger?: PaywallTrigger } | null>(null);
  const [notFound, setNotFound] = useState<number | null>(null);

  async function reveal(layer: number) {
    setLoadingLayer(layer);
    setPaywall(null);
    setNotFound(null);

    const result = await revealExplanationLayerAction({ questionId, layer });
    setLoadingLayer(null);

    if (result.ok) {
      setRevealed((prev) => ({ ...prev, [layer]: result.data }));
      setOpenLayer(layer);
      return;
    }
    if (result.code === 'PAYWALL') {
      setPaywall({ layer, trigger: result.trigger });
      return;
    }
    setNotFound(layer);
  }

  return (
    <div className="space-y-2 rounded-lg border border-border-subtle bg-elevated p-4">
      <p className="text-sm font-semibold text-text-primary">Explicación completa</p>

      {[1, 2, 3, 4].map((layer) => {
        const isRevealed = layer in revealed;
        const isOpen = openLayer === layer;
        const isUnlocked = layer === 1 || layer - 1 in revealed;
        const isLoading = loadingLayer === layer;

        return (
          <div key={layer} className="rounded-md border border-border-subtle bg-surface">
            <button
              type="button"
              onClick={() => (isRevealed ? setOpenLayer(isOpen ? null : layer) : reveal(layer))}
              disabled={!isUnlocked || isLoading}
              aria-expanded={isRevealed ? isOpen : undefined}
              aria-label={
                !isUnlocked
                  ? `Capa ${layer} — ${LAYER_TITLES[layer]} (bloqueada: revela la capa anterior primero)`
                  : undefined
              }
              className="flex w-full min-h-touch items-center justify-between gap-2 p-3 text-left text-sm font-semibold text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>
                Capa {layer} — {LAYER_TITLES[layer]}
              </span>
              <span aria-hidden className="text-text-muted">
                {isLoading ? '…' : isRevealed ? (isOpen ? '−' : '+') : isUnlocked ? '🔓' : '🔒'}
              </span>
            </button>

            {isOpen && isRevealed && (
              <div className="space-y-3 border-t border-border-subtle p-3 text-sm leading-relaxed text-text-secondary">
                <p className="font-semibold text-text-primary">{revealed[layer].title}</p>
                <div className="whitespace-pre-line">
                  <LatexText text={revealed[layer].content} />
                </div>
                {layer === 4 && (
                  <Button variant="primary" onClick={() => onPracticeMore(topicId)}>
                    Practicar más de este tema →
                  </Button>
                )}
              </div>
            )}

            {paywall?.layer === layer && (
              <div role="status" className="space-y-2 border-t border-border-subtle p-3 text-sm">
                <p className="text-text-secondary">
                  Las capas 2 a 4 son parte de los planes de pago.
                </p>
                <Link
                  href={`/paywall?trigger=${paywall.trigger ?? 'EXPLANATION_LAYER'}&return=%2Fpracticar`}
                  className="font-semibold text-brand-soft hover:underline"
                >
                  Desbloquear explicación completa →
                </Link>
              </div>
            )}

            {notFound === layer && (
              <p role="status" className="border-t border-border-subtle p-3 text-sm text-text-muted">
                Todavía no tenemos esta explicación para este reactivo.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
