'use client';

import { useState } from 'react';
import { notifyWhenSalesOpenAction } from '@/app/actions/checkout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

/**
 * G98 — «Avísame cuando abra». Lo que ofrece el paywall mientras la venta está
 * cerrada del lado del servidor.
 *
 * No es un formulario de lista de espera: es un CONSENTIMIENTO de marketing.
 * Lo que guarda es `NotificationPreference` MARKETING con `enabled = true`, la
 * misma fila que se apaga desde /app/perfil y desde el enlace de baja de
 * cualquier correo. Por eso el texto dice exactamente qué se acepta y que se
 * puede retirar cuando quiera, ANTES de tocar el botón — no después.
 *
 * No dispara ningún píxel de compra: aquí no empieza ningún checkout.
 */
export function NotifyWhenOpenCard() {
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setState('sending');
    setError(null);
    const res = await notifyWhenSalesOpenAction();
    if (res.ok) {
      setState('done');
    } else {
      setError(res.message);
      setState('idle');
    }
  }

  if (state === 'done') {
    return (
      <Card className="flex flex-col items-center gap-2 p-5 text-center">
        <p className="font-display text-base font-bold text-success">
          ✓ Listo — te avisamos en cuanto abra
        </p>
        <p className="max-w-md text-sm text-text-secondary">
          Te escribiremos al correo de tu cuenta cuando la preventa esté abierta. Si cambias de
          idea, apaga «Novedades y promociones» en Perfil y ajustes.
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col items-center gap-3 p-5 text-center">
      <div className="space-y-1">
        <p className="font-display text-base font-bold text-text-primary">
          ¿Quieres apartar tu precio de fundador?
        </p>
        <p className="max-w-md text-sm text-text-secondary">
          Apúntate y te escribimos en cuanto abra la preventa.
        </p>
      </div>

      {/* El consentimiento se explica ANTES del botón: qué se acepta y cómo se
          retira. No hay letra chica que descubrir después de aceptar. */}
      <p className="max-w-md text-xs text-text-muted">
        Al apuntarte aceptas recibir correo de YaEntre sobre la apertura de la preventa, precios y
        promociones. Puedes darte de baja cuando quieras, desde Perfil y ajustes o desde el enlace
        de baja de cualquiera de esos correos.
      </p>

      <Button variant="primary" onClick={accept} disabled={state === 'sending'}>
        {state === 'sending' ? 'Apuntándote…' : 'Avísame cuando abra'}
      </Button>

      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </Card>
  );
}
