'use client';

import { useId } from 'react';

/**
 * G100 — interruptor de ajustes: `<button role="switch">` con `aria-checked`
 * y el estado también en texto («Activado»/«Desactivado»), porque el color
 * nunca es el único canal (UIUX §12). Área táctil de toda la fila ≥ 44px.
 */
export function SettingSwitch({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-h-touch items-center justify-between gap-3 py-1">
      <span className="text-sm text-text-primary">
        <span id={`${id}-label`}>{label}</span>
        {hint && (
          <span id={`${id}-hint`} className="mt-0.5 block text-xs text-text-muted">
            {hint}
          </span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={hint ? `${id}-hint` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="inline-flex min-h-touch shrink-0 items-center gap-2 disabled:opacity-50"
      >
        <span className="sr-only">{checked ? 'Activado' : 'Desactivado'}</span>
        <span
          aria-hidden="true"
          className={`relative inline-block h-6 w-11 rounded-full transition-colors ${
            checked ? 'bg-brand' : 'bg-border-strong'
          }`}
        >
          <span
            className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-[22px]' : 'translate-x-0.5'
            }`}
          />
        </span>
      </button>
    </div>
  );
}
