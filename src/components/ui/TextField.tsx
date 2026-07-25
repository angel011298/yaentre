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
        className={`min-h-touch w-full rounded-md border border-border-subtle bg-input px-3 text-text-primary outline-none placeholder:text-text-muted focus:border-transparent focus:ring-2 focus:ring-brand ${className}`}
        {...props}
      />
      {hint && !hasErrors && (
        <p id={`${inputId}-hint`} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
      {hasErrors ? (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-danger">
          {errors![0]}
        </p>
      ) : null}
    </div>
  );
}
