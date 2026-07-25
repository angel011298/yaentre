'use client';

import { useState } from 'react';
import { updateNotificationPrefAction } from '@/app/actions/profile';

function Toggle({
  type,
  label,
  initialEnabled,
}: {
  type: 'STREAK_RISK' | 'EXAM_COUNTDOWN';
  label: string;
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
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-sm text-text-primary">{label}</span>
      <input
        type="checkbox"
        checked={enabled}
        disabled={pending}
        onChange={(e) => handleChange(e.target.checked)}
        className="h-5 w-5 accent-brand"
      />
    </label>
  );
}

/** Preferencias de notificación del ALUMNO (F17 tarea 2) — distinto del
 *  toggle de resumen semanal del tutor (F16, PARENT_WEEKLY, vive en /tutor). */
export function NotificationPrefsForm({
  streakRiskEnabled,
  examCountdownEnabled,
}: {
  streakRiskEnabled: boolean;
  examCountdownEnabled: boolean;
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
    </div>
  );
}
