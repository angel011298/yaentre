'use client';

import { useState } from 'react';
import { updateNotificationPrefAction } from '@/app/actions/profile';

function Toggle({
  type,
  label,
  hint,
  initialEnabled,
}: {
  type: 'STREAK_RISK' | 'EXAM_COUNTDOWN' | 'MARKETING';
  label: string;
  hint?: string;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState(false);

  async function handleChange(next: boolean) {
    setEnabled(next);
    setPending(true);
    const result = await updateNotificationPrefAction({ type, enabled: next });
    setPending(false);
    if (!result.ok) setEnabled(!next);
  }

  return (
    <label className="flex min-h-touch cursor-pointer items-center justify-between gap-3 py-1">
      <span className="text-sm text-text-primary">
        {label}
        {hint && <span className="mt-0.5 block text-xs text-text-muted">{hint}</span>}
      </span>
      <input
        type="checkbox"
        checked={enabled}
        disabled={pending}
        onChange={(e) => handleChange(e.target.checked)}
        className="h-5 w-5 shrink-0 accent-brand"
      />
    </label>
  );
}

/** Preferencias de notificación del ALUMNO (F17 tarea 2) — distinto del
 *  toggle de resumen semanal del tutor (F16, PARENT_WEEKLY, vive en /tutor). */
export function NotificationPrefsForm({
  streakRiskEnabled,
  examCountdownEnabled,
  marketingEnabled,
}: {
  streakRiskEnabled: boolean;
  examCountdownEnabled: boolean;
  marketingEnabled: boolean;
}) {
  return (
    <div className="space-y-3">
      <Toggle
        type="STREAK_RISK"
        label="Avisarme por correo si mi racha está en riesgo"
        initialEnabled={streakRiskEnabled}
      />
      <Toggle
        type="EXAM_COUNTDOWN"
        label="Recordatorios de cuenta regresiva al examen"
        initialEnabled={examCountdownEnabled}
      />
      {/* G98: MARKETING es opt-in desde esta fase — sin fila, apagado. Este
          es el interruptor donde se retira lo aceptado en «Avísame cuando
          abra» (/paywall), sin depender del enlace de baja de un correo. */}
      <Toggle
        type="MARKETING"
        label="Novedades, promociones y apertura de la preventa"
        hint="Correo ocasional sobre precios y nuevas funciones. Puedes apagarlo cuando quieras."
        initialEnabled={marketingEnabled}
      />
    </div>
  );
}
