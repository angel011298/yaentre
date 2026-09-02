import type { InputHTMLAttributes } from 'react';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  hint?: string;
  errors?: string[];
};

export function TextField({
  label,
  name,
  hint,
  errors,
  className = '',
  ...props
}: TextFieldProps) {
  const inputId = `field-${name}`;
  const hasErrors = Boolean(errors?.length);

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        aria-invalid={hasErrors || undefined}
        aria-describedby={hasErrors ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        // G63: sin `focus:ring` propio (usaba `--brand`, 2.9:1 sobre `bg-input`
        // oscuro) — el `:focus-visible` global aplica y cumple 3:1. `aria-invalid`
        // apunta el foco/border al estado de error; el borde base siempre es
        // visible.
        className={`min-h-touch w-full rounded-md border bg-input px-3 text-text-primary placeholder:text-text-muted ${
          hasErrors ? 'border-danger' : 'border-border-subtle'
        } ${className}`}
        {...props}
      />
      {hint && !hasErrors && (
        <p id={`${inputId}-hint`} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
      {hasErrors ? (
        <p id={`${inputId}-error`} role="alert" className="text-xs font-medium text-danger">
          {errors![0]}
        </p>
      ) : null}
    </div>
  );
}
