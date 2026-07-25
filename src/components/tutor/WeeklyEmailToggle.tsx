'use client';

import { useState } from 'react';
import { toggleWeeklyEmailAction } from '@/app/actions/parent';

/**
 * "Activar resumen semanal por correo" (F16 tarea 3/PRD F-06). Checkbox
 * simple con estado optimista — sin librerías de formularios, funciona
 * dentro de un WebView restringido (tarea 7).
 */
export function WeeklyEmailToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState(false);

  async function handleChange(next: boolean) {
    setEnabled(next);
    setPending(true);
    const result = await toggleWeeklyEmailAction({ enabled: next });
    setPending(false);
    if (!result.ok) setEnabled(!next); // revierte si falló
  }

  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-sm text-text-primary">Resumen semanal por correo (lunes)</span>
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
