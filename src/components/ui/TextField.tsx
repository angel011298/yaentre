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
      <label htmlFor={inputId} className="text-sm font-medium text-[var(--text-secondary)]">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        aria-invalid={hasErrors || undefined}
        aria-describedby={hasErrors ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={`min-h-[44px] w-full rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)] ${className}`}
        {...props}
      />
      {hint && !hasErrors && (
        <p id={`${inputId}-hint`} className="text-xs text-[var(--text-muted)]">
          {hint}
        </p>
      )}
      {hasErrors ? (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-[var(--danger)]">
          {errors![0]}
        </p>
      ) : null}
    </div>
  );
}
