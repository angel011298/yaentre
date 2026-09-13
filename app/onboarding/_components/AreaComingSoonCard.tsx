'use client';

import { useState } from 'react';
import { requestAreaNotificationAction } from '@/app/actions/onboarding';
import { Tino } from '@/components/mascot/Tino';
import { areaComingSoon, areaWaitlistJoined } from '@/lib/tino/copy';

/**
 * G74 — tarjeta de un área que todavía no se puede ofrecer. Deliberadamente NO
 * es un botón deshabilitado con la palabra «Próximamente» y nada más: eso deja
 * al aspirante sin saber qué pasó ni qué hacer.
 *
 * Lo que sí hace, en este orden:
 *   1. Dice el motivo concreto — qué materias faltan, por su nombre.
 *   2. Ofrece la salida útil: elegir otra de las áreas que sí están listas.
 *   3. Ofrece la alternativa para quien no tiene otra rama posible (nadie
 *      cambia de carrera por esto): que le avisemos en cuanto abra. No se le
 *      pide el correo — ya está registrado y verificado; pedírselo otra vez
 *      sería teatro.
 */
export function AreaComingSoonCard({
  areaId,
  areaName,
  colorHex,
  iconEmoji,
  pendingSubjectNames,
  hasAlternatives,
}: {
  areaId: string;
  areaName: string;
  colorHex: string;
  iconEmoji: string | null;
  pendingSubjectNames: string[];
  hasAlternatives: boolean;
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const line = areaComingSoon(pendingSubjectNames);

  async function handleNotify() {
    setState('sending');
    setErrorMessage(null);
    const res = await requestAreaNotificationAction({ areaId });
    if (res.ok) {
      setState('done');
      return;
    }
    setErrorMessage(res.message);
    setState('error');
  }

  return (
    <div className="rounded-lg border border-dashed border-border-subtle bg-surface p-4">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg opacity-60"
          style={{ backgroundColor: `${colorHex}26` }}
          aria-hidden
        >
          {iconEmoji ?? '📘'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-sm font-semibold text-text-primary">{areaName}</p>
            <span className="rounded-full bg-elevated px-2 py-0.5 text-xs font-semibold text-text-muted">
              Próximamente
            </span>
          </div>
          <p className="mt-2 text-sm text-text-secondary">{line.message}</p>

          {hasAlternatives && (
            <p className="mt-2 text-sm text-text-muted">
              Si tu carrera cabe en otra de las áreas de arriba, puedes empezar hoy mismo con esa.
            </p>
          )}

          {state === 'done' ? (
            <div className="mt-3 flex items-center gap-2">
              <Tino state={areaWaitlistJoined(areaName).state} size={32} />
              <p role="status" className="text-sm font-semibold text-success">
                {areaWaitlistJoined(areaName).message}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleNotify}
              disabled={state === 'sending'}
              className="mt-3 min-h-touch rounded-lg border border-brand-soft px-4 py-2 text-sm font-semibold text-brand-soft transition-colors hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {state === 'sending' ? 'Apuntándote…' : 'Avísame en cuanto abra'}
            </button>
          )}

          {state === 'error' && errorMessage && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
