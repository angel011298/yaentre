import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const base =
    'inline-flex min-h-touch min-w-touch items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand';

  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-brand text-white hover:bg-brand-hover shadow-md hover:shadow-lg',
    secondary: 'bg-surface border border-border-subtle text-text-primary hover:bg-elevated',
    tertiary: 'text-brand hover:text-brand-hover hover:bg-brand-tint',
    ghost: 'text-text-secondary hover:text-brand-soft bg-transparent',
    danger: 'bg-danger text-white hover:bg-red-600 shadow-md hover:shadow-lg',
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props} />
  );
}
