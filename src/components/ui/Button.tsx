import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const base =
    'inline-flex min-h-[44px] items-center justify-center rounded-[12px] px-4 text-sm font-semibold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50';
  const styles =
    variant === 'primary'
      ? 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]'
      : 'bg-transparent text-[var(--brand-soft)] hover:underline';

  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
