'use client';

import { useId, type ReactNode } from 'react';

/**
 * G100 — grupo de botones de una sola elección para los ajustes. Botones con
 * `aria-pressed` (G63: el estado activo no puede depender solo del color) y
 * área táctil ≥ 44px. Cada clic guarda: no hay botón «Guardar» aparte, igual
 * que el resto de los ajustes del perfil.
 */
export interface SegmentedOption<T extends string | number> {
  value: T;
  label: ReactNode;
  /** Nombre accesible si `label` no es texto plano legible. */
  ariaLabel?: string;
}

export function SegmentedChoice<T extends string | number>({
  label,
  options,
  value,
  onChange,
  disabled,
  help,
}: {
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  help?: string;
}) {
  const id = useId();
  return (
    <div>
      <p id={`${id}-label`} className="text-sm font-semibold text-text-primary">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby={`${id}-label`}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              aria-label={opt.ariaLabel}
              onClick={() => onChange(opt.value)}
              className={`min-h-touch min-w-touch rounded-md border px-4 text-sm font-semibold transition-all disabled:opacity-50 ${
                active
                  ? 'border-brand bg-brand-tint text-brand'
                  : 'border-border-subtle bg-surface text-text-secondary hover:bg-elevated'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {help && <p className="mt-1.5 text-xs text-text-muted">{help}</p>}
    </div>
  );
}
